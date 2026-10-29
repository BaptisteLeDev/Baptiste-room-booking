import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Room')
export class RoomType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  capacity: number;

  @Field(() => String)
  location: string;

  @Field(() => [String])
  equipment: string[];

  @Field(() => Float)
  pricePerHour: number;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  imageUrl?: string;
}
