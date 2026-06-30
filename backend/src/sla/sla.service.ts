import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from '../alert/alert.service';
import { CreateSlaDto } from './dto/create-sla.dto';
import { UpdateSlaDto } from './dto/update-sla.dto';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class SlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertService: AlertService,
  ) {}

  async create(dto: CreateSlaDto) {
    return this.prisma.slaPolicy.create({
      data: dto as any,
    });
  }

  async findAll() {
    return this.prisma.slaPolicy.findMany({
      where: { deletedAt: null },
      include: {
        partner: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findOne(id: string) {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { id, deletedAt: null },
      include: {
        partner: { select: { id: true, name: true, code: true } },
      },
    });

    if (!policy) {
      throw new NotFoundException('SLA policy not found');
    }

    return policy;
  }

  async update(id: string, dto: UpdateSlaDto) {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { id, deletedAt: null },
    });

    if (!policy) {
      throw new NotFoundException('SLA Policy not found');
    }

    return this.prisma.slaPolicy.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { id, deletedAt: null },
    });

    if (!policy) {
      throw new NotFoundException('SLA Policy not found');
    }

    await this.prisma.slaPolicy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // Periodic SLA compliance evaluator cron. Runs every 5 minutes.
  @Cron('0 */5 * * * *')
  async evaluateSlaCompliance() {
    const policies = await this.prisma.slaPolicy.findMany({
      where: { isActive: true, deletedAt: null },
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    for (const policy of policies) {
      try {
        const [expHours, expMinutes] = policy.expectedTime.split(':').map(Number);
        
        // SLA deadline time
        const deadline = new Date(now);
        deadline.setHours(expHours, expMinutes + policy.toleranceMin, 0, 0);

        if (now >= deadline) {
          // Check if file matching name pattern arrived today
          const arrivedFile = await this.prisma.file.findFirst({
            where: {
              tenantId: policy.tenantId,
              partnerId: policy.partnerId || undefined,
              filename: {
                // Convert glob-like pattern to prisma contains/startsWith
                // For safety: if filename contains wildcard, we search generally, 
                // or match pattern containing standard strings.
                contains: policy.filenamePattern.replace(/\*/g, ''),
              },
              createdAt: {
                gte: new Date(`${todayStr}T00:00:00.000Z`),
              },
              status: {
                not: 'ERROR',
              },
            },
          });

          if (!arrivedFile) {
            // SLA breached. Check if we already alerted today
            const alreadyAlerted = await this.prisma.alert.findFirst({
              where: {
                tenantId: policy.tenantId,
                title: {
                  contains: `SLA Breach: ${policy.name}`,
                },
                triggeredAt: {
                  gte: new Date(`${todayStr}T00:00:00.000Z`),
                },
              },
            });

            if (!alreadyAlerted) {
              // Dispatch breach alert
              await this.alertService.triggerAlert({
                tenantId: policy.tenantId,
                title: `SLA Breach: ${policy.name} is missing/late`,
                message: `Expected file matching pattern '${policy.filenamePattern}' did not arrive by deadline: ${deadline.toLocaleTimeString()}`,
                severity: 'CRITICAL',
                condition: 'LATE_FILE',
              });
            }
          }
        }
      } catch (err: any) {
        // Log error globally
        console.error(`Error evaluating SLA ${policy.id}: ${err.message}`);
      }
    }
  }
}
