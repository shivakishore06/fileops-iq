import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async searchFiles(filters: {
    filename?: string;
    status?: string;
    checksum?: string;
    connectionId?: string;
    partnerId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Number(filters.limit) || 20;
    const offset = Number(filters.offset) || 0;

    const where: any = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.checksum ? { checksum: filters.checksum } : {}),
      ...(filters.connectionId ? { connectionId: filters.connectionId } : {}),
      ...(filters.partnerId ? { partnerId: filters.partnerId } : {}),
    };

    if (filters.filename) {
      where.filename = {
        contains: filters.filename,
        mode: 'insensitive',
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [files, total] = await this.prisma.$transaction([
      this.prisma.file.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          connection: { select: { id: true, name: true, type: true } },
          partner: { select: { id: true, name: true, code: true } },
        },
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.file.count({ where }),
    ]);

    // Handle BigInt serialization for JSON responses
    const serializedFiles = files.map(file => ({
      ...file,
      fileSize: file.fileSize.toString(), // Convert BigInt to string
    }));

    return {
      files: serializedFiles,
      total,
      limit,
      offset,
    };
  }

  async getFileDetails(id: string) {
    const file = await this.prisma.file.findFirst({
      where: { id, deletedAt: null },
      include: {
        connection: true,
        partner: true,
        events: { orderBy: { timestamp: 'asc' } },
        lifecycles: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!file) {
      throw new NotFoundException('File record not found');
    }

    return {
      ...file,
      fileSize: file.fileSize.toString(),
    };
  }
}
