import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { ValidateIfDefined } from '../../../../common/validation/validate-if-defined.js';
import type { RoomCreateRequest } from '../../../../contract.js';

export class CreateRoomDto implements RoomCreateRequest {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateIfDefined()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsNotEmpty()
  location: string;

  @ValidateIfDefined()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @ValidateIfDefined()
  @IsUrl()
  imageUrl?: string;
}
