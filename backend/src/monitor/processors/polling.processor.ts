import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DriverFactory } from '../../connection/drivers/driver.factory';
import { tenantLocalStorage } from '../../tenant/tenant.storage';
import { ConnectionService } from '../../connection/connection.service';
import { RealtimeGateway } from '../../common/realtime.gateway';

@Processor('file-polling')
export class PollingProcessor extends WorkerHost {
  private readonly logger = new Logger(PollingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverFactory: DriverFactory,
    private readonly connectionService: ConnectionService,
    private readonly realtimeGateway: RealtimeGateway,
    @InjectQueue('file-processing') private readonly processingQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { connectionId, tenantId } = job.data;

    return tenantLocalStorage.run({ tenantId }, async () => {
      this.logger.log(`Starting polling check for Connection: ${connectionId} [Tenant: ${tenantId}]`);

      try {
        const driver = await this.driverFactory.getDriver(connectionId);
        
        // List remote directory
        const remoteFiles = await driver.listDirectory();
        
        for (const rFile of remoteFiles) {
          if (rFile.isDirectory) continue;

          // Check if file already exists in database
          let dbFile = await this.prisma.file.findFirst({
            where: {
              connectionId,
              path: rFile.path,
              deletedAt: null,
            },
          });

          // Detect new or modified files
          const isModified = dbFile && BigInt(dbFile.fileSize) !== rFile.size;
          const isNew = !dbFile;

          if (isNew || isModified) {
            if (isNew) {
              // Create file in DETECTED state
              dbFile = await this.prisma.file.create({
                data: {
                  tenantId,
                  connectionId,
                  filename: rFile.filename,
                  path: rFile.path,
                  fileSize: rFile.size,
                  status: 'DETECTED',
                  lastModified: rFile.lastModified,
                },
              });
            } else if (dbFile && isModified) {
              // Update file details, reset status to DETECTED
              dbFile = await this.prisma.file.update({
                where: { id: dbFile.id },
                data: {
                  fileSize: rFile.size,
                  status: 'DETECTED',
                  lastModified: rFile.lastModified,
                },
              });
            }

            if (dbFile) {
              // Write lifecycle log stage = DETECTED
              await this.prisma.fileLifecycle.create({
                data: {
                  tenantId,
                  fileId: dbFile.id,
                  stage: 'DETECTED',
                  status: 'SUCCESS',
                },
              });

              // Broadcast file detection event to tenant rooms
              this.realtimeGateway.sendToTenant(tenantId, 'file.lifecycle', {
                fileId: dbFile.id,
                filename: dbFile.filename,
                stage: 'DETECTED',
                status: 'SUCCESS',
                timestamp: new Date(),
              });

              // Queue download and processing task
              await this.processingQueue.add(
                'process-file',
                { fileId: dbFile.id, connectionId, tenantId },
                { jobId: `process-${dbFile.id}`, removeOnComplete: true, removeOnFail: true }
              );

              this.logger.log(`Queued processing job for detected file: ${rFile.filename} (${dbFile.id})`);
            }
          }
        }

        // Update connection diagnostics
        await this.connectionService.updateStatus(connectionId, 'ACTIVE');

      } catch (err: any) {
        this.logger.error(`Polling check failed for connection ${connectionId}: ${err.message}`);
        await this.connectionService.updateStatus(connectionId, 'ERROR');
        throw err;
      }
    });
  }
}
