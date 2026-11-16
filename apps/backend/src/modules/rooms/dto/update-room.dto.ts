import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { enumValues } from '../../../common/validation/enum-values.js';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import { MinProperties } from '../../../common/validation/min-properties.js';
import type { RoomStatus, RoomUpdateRequest } from '../../../contract.js';

const ROOM_STATUSES = enumValues<RoomStatus>()(['ACTIVE', 'INACTIVE']);

@MinProperties(1)
export class UpdateRoomDto implements RoomUpdateRequest {
  @ValidateIfDefined()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ValidateIfDefined()
  @IsString()
  description?: string;

  @ValidateIfDefined()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ValidateIfDefined()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ValidateIfDefined()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ValidateIfDefined()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @ValidateIfDefined()
  @IsUrl()
  @MaxLength(2048)
  imageUrl?: string;

  @ValidateIfDefined()
  @IsIn(ROOM_STATUSES)
  status?: RoomStatus;
}
