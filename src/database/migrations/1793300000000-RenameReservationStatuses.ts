import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameReservationStatuses1793300000000 implements MigrationInterface {
  name = 'RenameReservationStatuses1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "no_overlap_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "CHK_4bf0975bfae439db59697e21b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ALTER COLUMN "status" TYPE varchar(20)`,
    );
    await queryRunner.query(
      `UPDATE "reservations" SET "status" = 'PENDING_PAYMENT' WHERE "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `UPDATE "reservations" SET "status" = 'REFUSED' WHERE "status" = 'REJECTED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "CHK_reservations_status" CHECK ("status" IN ('PENDING_PAYMENT','CONFIRMED','REFUSED','CANCELLED','COMPLETED'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "no_overlap_active" EXCLUDE USING gist ("room_id" WITH =, tstzrange("start_time", "end_time") WITH &&) WHERE ("status" IN ('PENDING_PAYMENT', 'CONFIRMED'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "no_overlap_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "CHK_reservations_status"`,
    );
    await queryRunner.query(
      `UPDATE "reservations" SET "status" = 'PENDING' WHERE "status" = 'PENDING_PAYMENT'`,
    );
    await queryRunner.query(
      `UPDATE "reservations" SET "status" = 'REJECTED' WHERE "status" = 'REFUSED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ALTER COLUMN "status" TYPE varchar(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "CHK_4bf0975bfae439db59697e21b0" CHECK ("status" IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "no_overlap_active" EXCLUDE USING gist ("room_id" WITH =, tstzrange("start_time", "end_time") WITH &&) WHERE ("status" IN ('PENDING', 'CONFIRMED'))`,
    );
  }
}
