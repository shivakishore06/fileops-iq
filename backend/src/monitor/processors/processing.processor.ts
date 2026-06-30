import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DriverFactory } from '../../connection/drivers/driver.factory';
import { StorageService } from '../../common/storage.service';
import { tenantLocalStorage } from '../../tenant/tenant.storage';
import { RealtimeGateway } from '../../common/realtime.gateway';

@Processor('file-processing')
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverFactory: DriverFactory,
    private readonly storageService: StorageService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { fileId, connectionId, tenantId } = job.data;

    return tenantLocalStorage.run({ tenantId }, async () => {
      this.logger.log(`Processing file: ${fileId} [Connection: ${connectionId}, Tenant: ${tenantId}]`);

      let file = await this.prisma.file.findFirst({
        where: { id: fileId, deletedAt: null },
      });

      if (!file) {
        this.logger.error(`File record ${fileId} not found in database`);
        return;
      }

      const startTime = Date.now();

      try {
        const driver = await this.driverFactory.getDriver(connectionId);

        // ----------------------------------------------------
        // Stage 1: Download & Stream to MinIO (TRANSFERRED)
        // ----------------------------------------------------
        const remoteStream = await driver.downloadFile(file.path);
        
        // Stream to transient landing bucket and calculate checksum/size dynamically
        const uploadResult = await this.storageService.uploadAndCalculateChecksum(
          this.storageService.TRANSIENT_BUCKET,
          file.id,
          remoteStream
        );

        const durationTransferred = Date.now() - startTime;

        file = await this.prisma.file.update({
          where: { id: file.id },
          data: {
            checksum: uploadResult.checksum,
            fileSize: uploadResult.size,
            status: 'TRANSFERRED',
          },
        });

        await this.prisma.fileLifecycle.create({
          data: {
            tenantId,
            fileId: file.id,
            stage: 'TRANSFERRED',
            status: 'SUCCESS',
            durationMs: durationTransferred,
          },
        });

        // Broadcast Realtime Event
        this.realtimeGateway.sendToTenant(tenantId, 'file.lifecycle', {
          fileId: file.id,
          filename: file.filename,
          stage: 'TRANSFERRED',
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        // Log file event
        await this.prisma.fileEvent.create({
          data: {
            tenantId,
            fileId: file.id,
            eventType: 'DOWNLOADED',
            description: `File downloaded from connection source and stored in transient MinIO bucket. Hash: ${uploadResult.checksum}`,
          },
        });

        // ----------------------------------------------------
        // Stage 2: Validation (VALIDATED)
        // ----------------------------------------------------
        const validationStart = Date.now();
        let validationStatus = 'SUCCESS';
        let validationError = null;

        if (uploadResult.size === BigInt(0)) {
          validationStatus = 'FAILED';
          validationError = 'Zero-byte empty file detected';
        }

        const durationValidated = Date.now() - validationStart;

        await this.prisma.fileLifecycle.create({
          data: {
            tenantId,
            fileId: file.id,
            stage: 'VALIDATED',
            status: validationStatus,
            durationMs: durationValidated,
            errorMessage: validationError,
          },
        });

        // Broadcast Realtime Event
        this.realtimeGateway.sendToTenant(tenantId, 'file.lifecycle', {
          fileId: file.id,
          filename: file.filename,
          stage: 'VALIDATED',
          status: validationStatus,
          timestamp: new Date(),
          error: validationError,
        });

        if (validationStatus === 'FAILED') {
          await this.prisma.file.update({
            where: { id: file.id },
            data: { status: 'ERROR' },
          });
          throw new Error(`File validation failed: ${validationError}`);
        }

        file = await this.prisma.file.update({
          where: { id: file.id },
          data: { status: 'VALIDATED' },
        });

        // ----------------------------------------------------
        // Stage 3: Process / Parse (PROCESSED)
        // ----------------------------------------------------
        const processStart = Date.now();
        // Placeholder for future schema discovery / parsing pipelines
        const durationProcessed = Date.now() - processStart;

        file = await this.prisma.file.update({
          where: { id: file.id },
          data: { status: 'PROCESSED' },
        });

        await this.prisma.fileLifecycle.create({
          data: {
            tenantId,
            fileId: file.id,
            stage: 'PROCESSED',
            status: 'SUCCESS',
            durationMs: durationProcessed,
          },
        });

        // Broadcast Realtime Event
        this.realtimeGateway.sendToTenant(tenantId, 'file.lifecycle', {
          fileId: file.id,
          filename: file.filename,
          stage: 'PROCESSED',
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        // ----------------------------------------------------
        // Stage 4: Archive (ARCHIVED)
        // ----------------------------------------------------
        const archiveStart = Date.now();
        
        const transientStream = await driver.downloadFile(file.path);
        await this.storageService.archiveFile(file.id, transientStream);

        const durationArchived = Date.now() - archiveStart;

        file = await this.prisma.file.update({
          where: { id: file.id },
          data: { status: 'ARCHIVED' },
        });

        await this.prisma.fileLifecycle.create({
          data: {
            tenantId,
            fileId: file.id,
            stage: 'ARCHIVED',
            status: 'SUCCESS',
            durationMs: durationArchived,
          },
        });

        // Broadcast Realtime Event
        this.realtimeGateway.sendToTenant(tenantId, 'file.lifecycle', {
          fileId: file.id,
          filename: file.filename,
          stage: 'ARCHIVED',
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        await this.prisma.fileEvent.create({
          data: {
            tenantId,
            fileId: file.id,
            eventType: 'ARCHIVED',
            description: `File moved to archival storage bucket. Transient copy cleared.`,
          },
        });

        this.logger.log(`Completed full processing pipeline for File: ${file.filename} (${file.id})`);

      } catch (err: any) {
        this.logger.error(`File processing pipeline failed for ${file.id}: ${err.message}`);
        
        await this.prisma.file.update({
          where: { id: file.id },
          data: { status: 'ERROR' },
        });

        await this.prisma.fileLifecycle.create({
          data: {
            tenantId,
            fileId: file.id,
            stage: 'PROCESSED',
            status: 'FAILED',
            durationMs: Date.now() - startTime,
            errorMessage: err.message,
          },
        });

        // Broadcast Realtime Error Event
        this.realtimeGateway.sendToTenant(tenantId, 'file.lifecycle', {
          fileId: file.id,
          filename: file?.filename || 'unknown',
          stage: 'PROCESSED',
          status: 'FAILED',
          timestamp: new Date(),
          error: err.message,
        });
      }
    });
  }
}
