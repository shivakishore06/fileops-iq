import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthCheckService,
  ) {}

  @Get('live')
  @HealthCheck()
  getLiveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  async getReadiness() {
    // Check Database connection
    let dbStatus = 'DOWN';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch (err: any) {
      dbStatus = `DOWN - ${err.message}`;
    }

    const overallStatus = dbStatus === 'UP' ? 'UP' : 'DOWN';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
      },
    };
  }

  @Get('startup')
  getStartup() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async getMetrics() {
    const memory = process.memoryUsage();
    
    // Fetch counts from database safely
    const [filesCount, alertsCount, connectionsCount] = await Promise.all([
      this.prisma.file.count({ where: { deletedAt: null } }).catch(() => 0),
      this.prisma.alert.count({ where: { status: 'ACTIVE', deletedAt: null } }).catch(() => 0),
      this.prisma.connection.count({ where: { deletedAt: null } }).catch(() => 0),
    ]);

    let prometheusMetrics = '';
    prometheusMetrics += `# HELP node_memory_heap_used_bytes Memory heap used in bytes\n`;
    prometheusMetrics += `# TYPE node_memory_heap_used_bytes gauge\n`;
    prometheusMetrics += `node_memory_heap_used_bytes ${memory.heapUsed}\n\n`;

    prometheusMetrics += `# HELP fileops_files_total Total count of files registered in the platform\n`;
    prometheusMetrics += `# TYPE fileops_files_total gauge\n`;
    prometheusMetrics += `fileops_files_total ${filesCount}\n\n`;

    prometheusMetrics += `# HELP fileops_alerts_active_total Total count of active alerts\n`;
    prometheusMetrics += `# TYPE fileops_alerts_active_total gauge\n`;
    prometheusMetrics += `fileops_alerts_active_total ${alertsCount}\n\n`;

    prometheusMetrics += `# HELP fileops_connections_total Total count of connections registered\n`;
    prometheusMetrics += `# TYPE fileops_connections_total gauge\n`;
    prometheusMetrics += `fileops_connections_total ${connectionsCount}\n`;

    return prometheusMetrics;
  }
}
