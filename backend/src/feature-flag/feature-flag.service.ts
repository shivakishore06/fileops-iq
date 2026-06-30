import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { tenantLocalStorage } from '../tenant/tenant.storage';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { key: string; value?: boolean; description?: string }) {
    const context = tenantLocalStorage.getStore();
    return this.prisma.featureFlag.create({
      data: {
        tenantId: context?.tenantId || '',
        key: data.key,
        value: data.value ?? false,
        description: data.description || null,
      },
    });
  }

  async findAll() {
    return this.prisma.featureFlag.findMany({
      where: { deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }

  async findOne(id: string) {
    const flag = await this.prisma.featureFlag.findFirst({
      where: { id, deletedAt: null },
    });
    if (!flag) {
      throw new NotFoundException('Feature flag not found');
    }
    return flag;
  }

  async update(id: string, data: { value?: boolean; description?: string }) {
    await this.findOne(id);
    return this.prisma.featureFlag.update({
      where: { id },
      data,
    });
  }

  async toggle(id: string) {
    const flag = await this.findOne(id);
    return this.prisma.featureFlag.update({
      where: { id },
      data: { value: !flag.value },
    });
  }

  async isEnabled(key: string): Promise<boolean> {
    const context = tenantLocalStorage.getStore();
    if (!context?.tenantId) {
      return false;
    }

    const flag = await this.prisma.featureFlag.findFirst({
      where: {
        tenantId: context.tenantId,
        key,
        deletedAt: null,
      },
    });

    return flag ? flag.value : false;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.featureFlag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
