import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPasswordChangedAt1793196619708 implements MigrationInterface {
  name = 'AddUserPasswordChangedAt1793196619708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "password_changed_at"`,
    );
  }
}
