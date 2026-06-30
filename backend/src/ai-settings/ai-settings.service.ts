import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { tenantLocalStorage } from '../tenant/tenant.storage';

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getSettings() {
    const context = tenantLocalStorage.getStore();
    if (!context?.tenantId) {
      return null;
    }

    const setting = await this.prisma.aiSetting.findFirst({
      where: { tenantId: context.tenantId, deletedAt: null },
    });

    if (!setting) {
      return {
        provider: process.env.AI_PROVIDER || 'openai',
        modelName: process.env.AI_MODEL || 'gpt-4o',
        hasApiKey: !!process.env.AI_API_KEY,
      };
    }

    return {
      id: setting.id,
      provider: setting.provider,
      modelName: setting.modelName,
      hasApiKey: !!setting.apiKeyEnc,
    };
  }

  async getDecryptedSettings() {
    const context = tenantLocalStorage.getStore();
    if (!context?.tenantId) {
      return null;
    }

    const setting = await this.prisma.aiSetting.findFirst({
      where: { tenantId: context.tenantId, deletedAt: null },
    });

    if (!setting) {
      return {
        provider: process.env.AI_PROVIDER || 'openai',
        modelName: process.env.AI_MODEL || 'gpt-4o',
        apiKey: process.env.AI_API_KEY || '',
      };
    }

    let apiKey = '';
    if (setting.apiKeyEnc) {
      try {
        apiKey = this.encryptionService.decrypt(setting.apiKeyEnc);
      } catch {
        apiKey = '';
      }
    }

    return {
      provider: setting.provider,
      modelName: setting.modelName,
      apiKey,
    };
  }

  async upsert(data: { provider: string; modelName: string; apiKey?: string }) {
    const context = tenantLocalStorage.getStore();
    const tenantId = context?.tenantId;
    if (!tenantId) {
      throw new Error('No tenant context found');
    }

    const existing = await this.prisma.aiSetting.findFirst({
      where: { tenantId, deletedAt: null },
    });

    let apiKeyEnc = existing?.apiKeyEnc || null;
    if (data.apiKey && data.apiKey !== '********') {
      apiKeyEnc = this.encryptionService.encrypt(data.apiKey);
    }

    if (existing) {
      return this.prisma.aiSetting.update({
        where: { id: existing.id },
        data: {
          provider: data.provider,
          modelName: data.modelName,
          apiKeyEnc,
        },
      });
    } else {
      return this.prisma.aiSetting.create({
        data: {
          tenantId,
          provider: data.provider,
          modelName: data.modelName,
          apiKeyEnc,
        },
      });
    }
  }

  async remove() {
    const context = tenantLocalStorage.getStore();
    const tenantId = context?.tenantId;
    if (!tenantId) {
      throw new Error('No tenant context found');
    }

    const existing = await this.prisma.aiSetting.findFirst({
      where: { tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('AI Settings not found');
    }

    return this.prisma.aiSetting.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  }
}
