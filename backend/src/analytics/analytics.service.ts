import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKpis() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    // 1. Total Files Today
    const totalFiles = await this.prisma.file.count({
      where: {
        createdAt: { gte: todayStart },
        deletedAt: null,
      },
    });

    // 2. Failed Files Today
    const failedFiles = await this.prisma.file.count({
      where: {
        status: 'ERROR',
        createdAt: { gte: todayStart },
        deletedAt: null,
      },
    });

    // 3. Active SLA Breaches (Late/Missing Alerts)
    const activeAlerts = await this.prisma.alert.count({
      where: {
        status: 'ACTIVE',
        severity: 'CRITICAL',
        triggeredAt: { gte: todayStart },
        deletedAt: null,
      },
    });

    // 4. Expected files (derived from active SLA policies count)
    const expectedCount = await this.prisma.slaPolicy.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    });

    // 5. Average processing duration (from lifecycle entries)
    const lifecycles = await this.prisma.fileLifecycle.aggregate({
      where: {
        stage: 'PROCESSED',
        status: 'SUCCESS',
        createdAt: { gte: todayStart },
      },
      _avg: {
        durationMs: true,
      },
    });

    const avgDurationSec = lifecycles._avg.durationMs 
      ? parseFloat((lifecycles._avg.durationMs / 1000).toFixed(2)) 
      : 0;

    const successRate = totalFiles > 0 
      ? parseFloat((((totalFiles - failedFiles) / totalFiles) * 100).toFixed(2)) 
      : 100.0;

    return {
      totalFiles,
      failedFiles,
      activeAlerts,
      expectedCount,
      successRate,
      avgDurationSec,
    };
  }

  async getVolumeTrends() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group files by day in the last 30 days
    const files = await this.prisma.file.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Aggregate in memory (very flexible and database agnostic)
    const dailyMap: Record<string, { total: number; success: number; failed: number }> = {};

    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap[dateStr] = { total: 0, success: 0, failed: 0 };
    }

    for (const file of files) {
      const dateStr = file.createdAt.toISOString().split('T')[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].total++;
        if (file.status === 'ERROR') {
          dailyMap[dateStr].failed++;
        } else {
          dailyMap[dateStr].success++;
        }
      }
    }

    return Object.keys(dailyMap)
      .sort()
      .map(date => ({
        date,
        total: dailyMap[date].total,
        success: dailyMap[date].success,
        failed: dailyMap[date].failed,
      }));
  }

  async getPartnerPerformance() {
    // Get top partners by volumes and error counts
    const partners = await this.prisma.partner.findMany({
      where: { deletedAt: null },
      include: {
        files: {
          where: { deletedAt: null },
          select: { status: true },
        },
      },
    });

    return partners.map(p => {
      const total = p.files.length;
      const failed = p.files.filter(f => f.status === 'ERROR').length;
      const successRate = total > 0 ? parseFloat((((total - failed) / total) * 100).toFixed(2)) : 100.0;

      return {
        partnerName: p.name,
        partnerCode: p.code,
        totalTransfers: total,
        failedTransfers: failed,
        successRate,
      };
    });
  }

  async generateCsvReport() {
    const files = await this.prisma.file.findMany({
      where: { deletedAt: null },
      include: {
        connection: { select: { name: true } },
      },
    });

    let csv = 'File ID,Filename,Status,Size (Bytes),Checksum,Timestamp,Source Connection\n';
    for (const f of files) {
      csv += `${f.id},"${f.filename}",${f.status},${f.fileSize.toString()},"${f.checksum || ''}",${f.receivedAt.toISOString()},"${f.connection?.name || ''}"\n`;
    }

    return { csv };
  }
}
