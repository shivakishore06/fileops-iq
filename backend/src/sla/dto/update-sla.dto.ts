import { IsString, IsOptional, IsInt, Min, IsEnum, Matches, IsUUID } from 'class-validator';
import { SlaFrequency } from './create-sla.dto';

export class UpdateSlaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  filenamePattern?: string;

  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'expectedTime must be in HH:MM format',
  })
  expectedTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  toleranceMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  alertMarginMin?: number;

  @IsOptional()
  @IsEnum(SlaFrequency)
  frequency?: SlaFrequency;

  @IsOptional()
  @IsUUID()
  partnerId?: string;
}
