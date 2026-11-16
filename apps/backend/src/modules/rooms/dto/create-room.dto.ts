import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import type { RoomCreateRequest } from '../../../contract.js';

export class CreateRoomDto implements RoomCreateRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ValidateIfDefined()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
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
  @MaxLength(2048)
  imageUrl?: string;
}
