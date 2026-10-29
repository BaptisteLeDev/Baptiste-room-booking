import {
  IsInt,
  IsNotEmpty,
  IsRFC3339,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import type { ReservationCreateRequest } from '../../../contract.js';

export class CreateReservationDto implements ReservationCreateRequest {
  @IsNotEmpty()
  @IsUUID()
  roomId: string;

  @IsNotEmpty()
  @IsRFC3339()
  startAt: string;

  @IsNotEmpty()
  @IsRFC3339()
  endAt: string;

  @ValidateIfDefined()
  @IsInt()
  @Min(1)
  numberOfParticipants?: number;

  @ValidateIfDefined()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
