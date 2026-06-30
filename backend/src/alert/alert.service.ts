import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../common/realtime.gateway';
import axios from 'axios';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async triggerAlert(params: {
    tenantId: string;
    title: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    condition: string;
  }) {
    this.logger.warn(`Alert triggered: [${params.severity}] ${params.title} - ${params.message}`);

    // 1. Persist Alert in Database
    const alert = await this.prisma.alert.create({
      data: {
        tenantId: params.tenantId,
        title: params.title,
        message: params.message,
        severity: params.severity,
        status: 'ACTIVE',
      },
    });

    // 2. Broadcast via WebSockets
    this.realtimeGateway.sendToTenant(params.tenantId, 'alert.new', alert);

    // 3. Evaluate matching Alert Rules to find notification channels (Slack, Webhook, etc.)
    const rules = await this.prisma.alertRule.findMany({
      where: {
        tenantId: params.tenantId,
        condition: params.condition,
        isActive: true,
        deletedAt: null,
      },
    });

    for (const rule of rules) {
      for (const channel of rule.channels) {
        try {
          if (channel === 'SLACK' && rule.channelCfg) {
            await this.sendToSlack(rule.channelCfg, params.title, params.message);
          } else if (channel === 'WEBHOOK' && rule.channelCfg) {
            await this.sendToWebhook(rule.channelCfg, params);
          }
        } catch (err: any) {
          this.logger.error(`Failed to dispatch alert on channel ${channel} for rule ${rule.id}: ${err.message}`);
        }
      }
    }

    return alert;
  }

  private async sendToSlack(webhookUrl: string, title: string, message: string) {
    await axios.post(webhookUrl, {
      text: `🚨 *FileOps IQ Alert: ${title}*\n${message}`,
    });
  }

  private async sendToWebhook(webhookUrl: string, payload: any) {
    await axios.post(webhookUrl, payload);
  }

  async findAll() {
    return this.prisma.alert.findMany({
      where: { deletedAt: null },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async acknowledge(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  async resolve(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });
  }
}
