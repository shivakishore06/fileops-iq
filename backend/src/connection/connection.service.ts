import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@Injectable()
export class ConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(dto: CreateConnectionDto) {
    const { password, privateKey, ...rest } = dto;

    const data: any = {
      ...rest,
      status: 'INACTIVE', // default status
    };

    if (password) {
      data.passwordEnc = this.encryptionService.encrypt(password);
    }

    if (privateKey) {
      data.privateKeyEnc = this.encryptionService.encrypt(privateKey);
    }

    const connection = await this.prisma.connection.create({
      data,
    });

    return this.sanitize(connection);
  }

  async findAll(type?: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        deletedAt: null,
        ...(type ? { type } : {}),
      },
      include: {
        partner: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map(conn => this.sanitize(conn));
  }

  async findOne(id: string) {
    const connection = await this.prisma.connection.findFirst({
      where: { id, deletedAt: null },
      include: {
        partner: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return this.sanitize(connection);
  }

  async update(id: string, dto: UpdateConnectionDto) {
    const connection = await this.prisma.connection.findFirst({
      where: { id, deletedAt: null },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const { password, privateKey, ...rest } = dto;
    const data: any = { ...rest };

    if (password !== undefined) {
      data.passwordEnc = password ? this.encryptionService.encrypt(password) : null;
    }

    if (privateKey !== undefined) {
      data.privateKeyEnc = privateKey ? this.encryptionService.encrypt(privateKey) : null;
    }

    const updated = await this.prisma.connection.update({
      where: { id },
      data,
    });

    return this.sanitize(updated);
  }

  async remove(id: string) {
    const connection = await this.prisma.connection.findFirst({
      where: { id, deletedAt: null },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Soft delete
    await this.prisma.connection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // Retrieve decrypted credentials for internal engines (e.g. S3/SFTP driver)
  async getDecryptedCredentials(id: string) {
    const connection = await this.prisma.connection.findFirst({
      where: { id, deletedAt: null },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    const password = connection.passwordEnc
      ? this.encryptionService.decrypt(connection.passwordEnc)
      : null;

    const privateKey = connection.privateKeyEnc
      ? this.encryptionService.decrypt(connection.privateKeyEnc)
      : null;

    return {
      ...connection,
      password,
      privateKey,
    };
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'ERROR' | 'INACTIVE') {
    return this.prisma.connection.update({
      where: { id },
      data: {
        status,
        lastCheckedAt: new Date(),
      },
    });
  }

  // Redact secrets when returning metadata to API client
  private sanitize(connection: any) {
    const { passwordEnc, privateKeyEnc, ...sanitized } = connection;
    return {
      ...sanitized,
      hasPassword: !!passwordEnc,
      hasPrivateKey: !!privateKeyEnc,
    };
  }
}
