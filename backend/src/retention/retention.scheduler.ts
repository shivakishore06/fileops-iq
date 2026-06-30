import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RetentionService } from './retention.service';

@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(private readonly retentionService: RetentionService) {}

  // Run everyday at 2:00 AM
  @Cron('0 2 * * *')
  async handleRetentionEvaluations() {
    this.logger.log('Executing daily retention policy evaluator job.');
    try {
      await this.retentionService.evaluatePolicies();
      this.logger.log('Daily retention policy evaluator completed successfully.');
    } catch (err: any) {
      this.logger.error(`Error running daily retention evaluator: ${err.message}`);
    }
  }
}
