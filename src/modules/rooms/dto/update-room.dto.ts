import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  IsUrl,
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
  imageUrl?: string;

  @ValidateIfDefined()
  @IsIn(ROOM_STATUSES)
  status?: RoomStatus;
}
