import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantLocalStorage } from '../tenant/tenant.storage';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(data: { name: string; pattern: string; ageDays: number; action: string }) {
    const context = tenantLocalStorage.getStore();
    return this.prisma.retentionPolicy.create({
      data: {
        tenantId: context?.tenantId || '',
        name: data.name,
        pattern: data.pattern,
        ageDays: data.ageDays,
        action: data.action,
        isActive: true,
      },
    });
  }

  async findAll() {
    return this.prisma.retentionPolicy.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const policy = await this.prisma.retentionPolicy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!policy) {
      throw new NotFoundException('Retention policy not found');
    }
    return policy;
  }

  async update(id: string, data: { name?: string; pattern?: string; ageDays?: number; action?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.retentionPolicy.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.retentionPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Scheduled job task evaluator
  async evaluatePolicies() {
    this.logger.log('Evaluating retention policies across all tenants...');
    
    // Find all active policies
    const policies = await this.prisma.retentionPolicy.findMany({
      where: { isActive: true, deletedAt: null },
    });

    for (const policy of policies) {
      const cutOffDate = new Date();
      cutOffDate.setDate(cutOffDate.getDate() - policy.ageDays);

      // Find files matching pattern that are older than ageDays in the target tenant
      // We run in the context of the policy's tenant
      await tenantLocalStorage.run({ tenantId: policy.tenantId }, async () => {
        const filesToProcess = await this.prisma.file.findMany({
          where: {
            tenantId: policy.tenantId,
            deletedAt: null,
            createdAt: { lte: cutOffDate },
            filename: {
              contains: policy.pattern.replace(/\*/g, ''), // Simple wildcard mapping
              mode: 'insensitive',
            },
            // Avoid double processing if already deleted/archived
            status: { notIn: ['DELETED', 'ARCHIVED'] },
          },
        });

        if (filesToProcess.length === 0) return;

        this.logger.log(`Policy "${policy.name}" matching "${policy.pattern}" is executing ${policy.action} on ${filesToProcess.length} files.`);

        for (const file of filesToProcess) {
          try {
            if (policy.action === 'DELETE') {
              // Update file status and soft delete
              await this.prisma.file.update({
                where: { id: file.id },
                data: {
                  status: 'DELETED',
                  deletedAt: new Date(),
                },
              });

              // Write FileLifecycle log
              await this.prisma.fileLifecycle.create({
                data: {
                  tenantId: policy.tenantId,
                  fileId: file.id,
                  stage: 'DELETED',
                  status: 'SUCCESS',
                  errorMessage: 'Purged by retention policy',
                },
              });

              // Write FileEvent
              await this.prisma.fileEvent.create({
                data: {
                  tenantId: policy.tenantId,
                  fileId: file.id,
                  eventType: 'DELETED',
                  description: `File purged automatically by retention policy: ${policy.name}`,
                },
              });

              await this.auditService.logAction({
                action: 'RETENTION_PURGE',
                details: { fileId: file.id, filename: file.filename, policyId: policy.id, policyName: policy.name },
              });
            } else if (policy.action === 'ARCHIVE') {
              // Update file status
              await this.prisma.file.update({
                where: { id: file.id },
                data: { status: 'ARCHIVED' },
              });

              // Write FileLifecycle log
              await this.prisma.fileLifecycle.create({
                data: {
                  tenantId: policy.tenantId,
                  fileId: file.id,
                  stage: 'ARCHIVED',
                  status: 'SUCCESS',
                  errorMessage: 'Archived by retention policy',
                },
              });

              // Write FileEvent
              await this.prisma.fileEvent.create({
                data: {
                  tenantId: policy.tenantId,
                  fileId: file.id,
                  eventType: 'ARCHIVED',
                  description: `File archived automatically by retention policy: ${policy.name}`,
                },
              });

              await this.auditService.logAction({
                action: 'RETENTION_ARCHIVE',
                details: { fileId: file.id, filename: file.filename, policyId: policy.id, policyName: policy.name },
              });
            }
          } catch (fileErr: any) {
            this.logger.error(`Failed executing retention policy for file ${file.id}: ${fileErr.message}`);
          }
        }
      });
    }
  }
}
