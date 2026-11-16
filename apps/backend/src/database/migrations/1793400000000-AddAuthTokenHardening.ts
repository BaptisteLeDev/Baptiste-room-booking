import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthTokenHardening1793400000000 implements MigrationInterface {
  name = 'AddAuthTokenHardening1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "revoked_tokens" ("jti" varchar(64) NOT NULL, "expires_at" timestamptz NOT NULL, CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("jti"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "revoked_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version"`,
    );
  }
}
