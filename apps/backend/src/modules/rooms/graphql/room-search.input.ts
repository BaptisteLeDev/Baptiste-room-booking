import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { MAX_PAGE } from '../../../common/database/paginate.js';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';

@InputType()
export class RoomSearchInput {
  @Field(() => Int, { nullable: true })
  @ValidateIfDefined()
  @IsInt()
  @Min(1)
  @Max(10000)
  minCapacity?: number;

  @Field(() => Float, { nullable: true })
  @ValidateIfDefined()
  @IsNumber()
  @Min(0)
  maxPricePerHour?: number;

  @Field(() => Int, { nullable: true })
  @ValidateIfDefined()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page: number = 1;

  @Field(() => Int, { nullable: true })
  @ValidateIfDefined()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
