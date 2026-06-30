import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantLocalStorage } from '../tenant/tenant.storage';

@Injectable()
export class StoragePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; provider: string; bucketName: string; region?: string; isActive?: boolean }) {
    const context = tenantLocalStorage.getStore();
    const tenantId = context?.tenantId || '';
    const isActive = data.isActive ?? true;

    return this.prisma.$transaction(async (tx) => {
      if (isActive) {
        // Deactivate all other storage policies for this tenant
        await tx.storagePolicy.updateMany({
          where: { tenantId, deletedAt: null },
          data: { isActive: false },
        });
      }

      return tx.storagePolicy.create({
        data: {
          tenantId,
          name: data.name,
          provider: data.provider,
          bucketName: data.bucketName,
          region: data.region || null,
          isActive,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.storagePolicy.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const policy = await this.prisma.storagePolicy.findFirst({
      where: { id, deletedAt: null },
    });
    if (!policy) {
      throw new NotFoundException('Storage policy not found');
    }
    return policy;
  }

  async update(id: string, data: { name?: string; provider?: string; bucketName?: string; region?: string; isActive?: boolean }) {
    const context = tenantLocalStorage.getStore();
    const tenantId = context?.tenantId || '';
    
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (data.isActive === true) {
        // Deactivate all other storage policies for this tenant
        await tx.storagePolicy.updateMany({
          where: { tenantId, id: { not: id }, deletedAt: null },
          data: { isActive: false },
        });
      }

      return tx.storagePolicy.update({
        where: { id },
        data,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.storagePolicy.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getActivePolicy() {
    const context = tenantLocalStorage.getStore();
    if (!context?.tenantId) {
      return null;
    }

    return this.prisma.storagePolicy.findFirst({
      where: {
        tenantId: context.tenantId,
        isActive: true,
        deletedAt: null,
      },
    });
  }
}
