import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantLocalStorage } from '../tenant/tenant.storage';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(params: {
    userId?: string;
    action: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const context = tenantLocalStorage.getStore();
    const tenantId = context?.tenantId;

    if (!tenantId) {
      // Skip if no tenant context is active (e.g. general platform level)
      return;
    }

    return this.prisma.auditTrail.create({
      data: {
        tenantId,
        userId: params.userId || context?.userId || null,
        action: params.action,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  }

  async getLogs() {
    return this.prisma.auditTrail.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
