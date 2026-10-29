import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { ReservationStatus } from '../domain/enums/reservation-status.enum.js';

registerEnumType(ReservationStatus, { name: 'ReservationStatus' });

@ObjectType('Reservation')
export class ReservationType {
  @Field(() => ID)
  id: string;

  @Field(() => GraphQLISODateTime)
  startAt: Date;

  @Field(() => GraphQLISODateTime)
  endAt: Date;

  @Field(() => ReservationStatus)
  status: ReservationStatus;

  @Field(() => Int, { nullable: true })
  numberOfParticipants?: number;

  @Field(() => Float)
  totalAmount: number;

  @Field(() => String)
  currency: string;
}
