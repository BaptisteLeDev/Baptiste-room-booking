import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailabilityAvailable1793106500000 implements MigrationInterface {
  name = 'AddAvailabilityAvailable1793106500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "availabilities"
       ADD COLUMN IF NOT EXISTS "available" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "availabilities" DROP COLUMN IF EXISTS "available"`,
    );
  }
}
