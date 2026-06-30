import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FileExplorerService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: {
    filename?: string;
    status?: string;
    connectionId?: string;
    extension?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };

    if (params.status) {
      where.status = params.status;
    }
    if (params.connectionId) {
      where.connectionId = params.connectionId;
    }
    if (params.extension) {
      where.extension = params.extension;
    }
    if (params.filename) {
      where.filename = {
        contains: params.filename,
        mode: 'insensitive',
      };
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    const sortBy = params.sortBy || 'receivedAt';
    const sortOrder = params.sortOrder || 'desc';

    const [files, total] = await this.prisma.$transaction([
      this.prisma.file.findMany({
        where,
        take: pageSize,
        skip,
        include: {
          connection: { select: { id: true, name: true, type: true } },
          partner: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.file.count({ where }),
    ]);

    const serializedFiles = files.map(file => ({
      ...file,
      fileSize: file.fileSize.toString(),
    }));

    return {
      files: serializedFiles,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getLifecycleTimeline(fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, deletedAt: null },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.prisma.fileLifecycle.findMany({
      where: { fileId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getFileEvents(fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, deletedAt: null },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.prisma.fileEvent.findMany({
      where: { fileId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getFileStats() {
    // 1. Files by Status
    const statusCounts = await this.prisma.file.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    // 2. Files by Connection
    const connectionCounts = await this.prisma.file.groupBy({
      by: ['connectionId'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    // Resolve connection names
    const resolvedConnections = await Promise.all(
      connectionCounts.map(async (item) => {
        if (!item.connectionId) {
          return { name: 'Unknown', count: item._count._all };
        }
        const conn = await this.prisma.connection.findUnique({
          where: { id: item.connectionId },
          select: { name: true },
        });
        return {
          name: conn?.name || 'Unknown',
          count: item._count._all,
        };
      }),
    );

    return {
      statusStats: statusCounts.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      connectionStats: resolvedConnections,
    };
  }
}
