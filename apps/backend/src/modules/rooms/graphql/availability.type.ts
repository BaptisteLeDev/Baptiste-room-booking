import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType('Availability')
export class AvailabilityType {
  @Field(() => GraphQLISODateTime)
  startAt: Date;

  @Field(() => GraphQLISODateTime)
  endAt: Date;

  @Field(() => Boolean)
  available: boolean;
}
