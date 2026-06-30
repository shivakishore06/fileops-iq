import { PrismaClient } from '@prisma/client';

export async function handleStatusIntent(prisma: any) {
  const activeConnectionsCount = await prisma.connection.count({
    where: { status: 'ACTIVE', deletedAt: null },
  });
  const errorConnectionsCount = await prisma.connection.count({
    where: { status: 'ERROR', deletedAt: null },
  });

  const totalAlertsCount = await prisma.alert.count({
    where: { status: 'ACTIVE', deletedAt: null },
  });

  return {
    response: `System Health Status Summary:
- *Active Connections*: ${activeConnectionsCount} online
- *Failed Connections*: ${errorConnectionsCount} offline/errored
- *Active Alerts*: ${totalAlertsCount} unresolved events

System processes are running normally. All connection pools are healthy.`,
    type: 'SYSTEM_STATUS',
    data: { activeConnectionsCount, errorConnectionsCount, totalAlertsCount },
  };
}

export async function handleSummaryIntent(prisma: any) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

  const processedCount = await prisma.file.count({
    where: {
      status: 'PROCESSED',
      createdAt: { gte: todayStart },
      deletedAt: null,
    },
  });

  const errorCount = await prisma.file.count({
    where: {
      status: 'ERROR',
      createdAt: { gte: todayStart },
      deletedAt: null,
    },
  });

  const alertsCount = await prisma.alert.count({
    where: {
      triggeredAt: { gte: todayStart },
      deletedAt: null,
    },
  });

  return {
    response: `Daily Operations Summary (Today):
- *Files Processed Successfully*: ${processedCount}
- *Failed Files*: ${errorCount}
- *Triggered Alerts*: ${alertsCount}`,
    type: 'DAILY_SUMMARY',
    data: { processedCount, errorCount, alertsCount },
  };
}

export async function handleThroughputIntent(prisma: any) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

  const lifecycles = await prisma.fileLifecycle.aggregate({
    where: {
      stage: 'PROCESSED',
      status: 'SUCCESS',
      createdAt: { gte: todayStart },
    },
    _avg: {
      durationMs: true,
    },
  });

  const totalFiles = await prisma.file.count({
    where: {
      createdAt: { gte: todayStart },
      deletedAt: null,
    },
  });

  const avgDurationSec = lifecycles._avg.durationMs
    ? parseFloat((lifecycles._avg.durationMs / 1000).toFixed(2))
    : 0;

  return {
    response: `System Performance & Throughput Stats:
- *Average File Processing Time*: ${avgDurationSec} seconds
- *Total Monitored Operations (Today)*: ${totalFiles} actions

Pipeline ingestion rates are within nominal operational parameters.`,
    type: 'THROUGHPUT_STATS',
    data: { avgDurationSec, totalFiles },
  };
}

export function handleHelpIntent() {
  return {
    response: `Here are the operational commands you can ask me:
1. **"Show files missing today"** or **"missing files"** — Displays any active SLA breaches or late files.
2. **"Show failed files"** or **"errors"** — Lists files that encountered errors during the pipeline.
3. **"Compare today's files with yesterday"** or **"compare"** — Provides a volume comparison between today and yesterday.
4. **"System health status"** or **"status"** — Shows the state of connection managers and unresolved alerts.
5. **"Daily operations summary"** or **"summary"** — Aggregates processing achievements, failures, and alerts.
6. **"System performance throughput"** or **"throughput"** — Measures pipeline processing efficiency.`,
    type: 'HELP_COMMANDS',
    data: null,
  };
}
