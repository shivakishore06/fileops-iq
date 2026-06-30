import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { FileExplorerService } from './file-explorer.service';
import { FileExplorerController } from './file-explorer.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [FileService, FileExplorerService],
  controllers: [FileController, FileExplorerController],
  exports: [FileService, FileExplorerService],
})
export class FileModule {}
