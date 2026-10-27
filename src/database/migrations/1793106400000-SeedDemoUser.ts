import type { MigrationInterface, QueryRunner } from 'typeorm';
import { userFixture } from '../../modules/auth/fixtures/user.fixture.js';

export class SeedDemoUser1793106400000 implements MigrationInterface {
  name = 'SeedDemoUser1793106400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // '!' is not a valid scrypt hash: the demo user cannot log in.
    await queryRunner.query(
      `INSERT INTO "users" ("id", "email", "password_hash", "first_name", "last_name", "role", "created_at")
       VALUES ($1, $2, '!', $3, $4, $5, $6)`,
      [
        userFixture.id,
        userFixture.email,
        userFixture.firstName,
        userFixture.lastName,
        userFixture.role,
        userFixture.createdAt,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE "id" = $1`, [
      userFixture.id,
    ]);
  }
}
