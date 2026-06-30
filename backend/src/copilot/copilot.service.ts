import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  handleStatusIntent, 
  handleSummaryIntent, 
  handleThroughputIntent, 
  handleHelpIntent 
} from './copilot-intents';

@Injectable()
export class CopilotService {
  constructor(private readonly prisma: PrismaService) {}

  async handleQuery(queryText: string) {
    const text = queryText.toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(`${todayStr}T00:00:00.000Z`);

    // Dynamic Intent routing from copilot-intents.ts
    if (text.includes('status') || text.includes('health')) {
      return handleStatusIntent(this.prisma);
    }
    if (text.includes('summary') || text.includes('operations')) {
      return handleSummaryIntent(this.prisma);
    }
    if (text.includes('throughput') || text.includes('performance')) {
      return handleThroughputIntent(this.prisma);
    }
    if (text.includes('help') || text.includes('command') || text.includes('what can i')) {
      return handleHelpIntent();
    }

    // Intent 1: "Show files missing today" or "missing files"
    if (text.includes('missing') || text.includes('late')) {
      const activeAlerts = await this.prisma.alert.findMany({
        where: {
          title: { contains: 'SLA Breach' },
          status: 'ACTIVE',
          triggeredAt: { gte: todayStart },
          deletedAt: null,
        },
      });

      const listStr = activeAlerts.map(a => `- ${a.title}: ${a.message}`).join('\n');
      return {
        response: `Based on today's SLA checks, we have identified ${activeAlerts.length} missing or late files:\n\n${listStr || 'No missing files detected today. All SLAs are currently satisfied.'}`,
        type: 'ALERTS_LIST',
        data: activeAlerts,
      };
    }

    // Intent 2: "Show failed files" or "errors"
    if (text.includes('fail') || text.includes('error')) {
      const failedFiles = await this.prisma.file.findMany({
        where: {
          status: 'ERROR',
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
        include: {
          connection: { select: { name: true } },
        },
      });

      const listStr = failedFiles.map(f => `- *${f.filename}* (Source: ${f.connection?.name || 'Unknown'})`).join('\n');
      return {
        response: `I found ${failedFiles.length} file transfers that encountered errors today:\n\n${listStr || 'No file errors recorded today. All transfers completed successfully.'}`,
        type: 'FILES_LIST',
        data: failedFiles.map(f => ({ ...f, fileSize: f.fileSize.toString() })),
      };
    }

    // Intent 3: "Compare today's files with yesterday" or "compare"
    if (text.includes('compare') || text.includes('yesterday')) {
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(todayStart.getTime() - 1);

      const todayCount = await this.prisma.file.count({
        where: { createdAt: { gte: todayStart }, deletedAt: null },
      });

      const yesterdayCount = await this.prisma.file.count({
        where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd }, deletedAt: null },
      });

      const diff = todayCount - yesterdayCount;
      const changeStr = diff >= 0 ? `an increase of +${diff}` : `a decrease of ${diff}`;

      return {
        response: `Here is the comparison between today and yesterday:\n\n- *Today's volume*: ${todayCount} files\n- *Yesterday's volume*: ${yesterdayCount} files\n\nThis represents ${changeStr} in file operations.`,
        type: 'COMPARISON',
        data: { todayCount, yesterdayCount, diff },
      };
    }

    // Default intent: General Search
    const files = await this.prisma.file.findMany({
      where: { deletedAt: null },
      take: 5,
      orderBy: { receivedAt: 'desc' },
    });

    const listStr = files.map(f => `- ${f.filename} (${f.status})`).join('\n');
    return {
      response: `I wasn't able to map that exact command, but here are the 5 most recent files processed:\n\n${listStr}`,
      type: 'FILES_LIST',
      data: files.map(f => ({ ...f, fileSize: f.fileSize.toString() })),
    };
  }
}
