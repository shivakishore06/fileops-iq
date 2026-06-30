import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsUUID, IsEnum, Matches } from 'class-validator';

export enum SlaFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateSlaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  filenamePattern: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'expectedTime must be in HH:MM format',
  })
  expectedTime: string;

  @IsInt()
  @Min(0)
  toleranceMin: number;

  @IsInt()
  @Min(0)
  alertMarginMin: number;

  @IsEnum(SlaFrequency)
  frequency: SlaFrequency;

  @IsOptional()
  @IsUUID()
  partnerId?: string;
}
