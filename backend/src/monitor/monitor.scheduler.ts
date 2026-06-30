import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitorScheduler {
  private readonly logger = new Logger(MonitorScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('file-polling') private readonly pollingQueue: Queue,
  ) {}

  // Run every 10 seconds to discover connections that require polling
  @Cron('*/10 * * * * *')
  async schedulePollers() {
    try {
      const now = new Date();

      // Find connections that are ACTIVE, not soft-deleted, and due for polling
      // Bypass standard multi-tenancy filter on this query because the scheduler runs globally
      // (Wait, since we proxied Prisma queries, how do we query globally?
      // Our proxy bypasses filtering if tenantLocalStorage.getStore() is undefined!
      // Since this cron runs in a background execution stack without request context, 
      // getStore() is undefined, so the query will query all connections across all tenants automatically!
      // This is absolutely perfect and matches our design.)
      const connections = await this.prisma.connection.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      for (const conn of connections) {
        const nextPoll = new Date(
          (conn.lastCheckedAt ? new Date(conn.lastCheckedAt).getTime() : 0) + 
          conn.pollingInterval * 1000
        );

        if (nextPoll <= now) {
          // Add job to BullMQ queue
          await this.pollingQueue.add(
            'poll-connection',
            { connectionId: conn.id, tenantId: conn.tenantId },
            { jobId: `poll-${conn.id}`, removeOnComplete: true, removeOnFail: true }
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`Scheduler execution failed: ${err.message}`);
    }
  }
}
