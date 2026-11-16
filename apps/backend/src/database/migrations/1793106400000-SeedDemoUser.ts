import type { MigrationInterface, QueryRunner } from 'typeorm';

const DEMO_USER_ID = '5d0e9c1a-2b3c-4d5e-8f60-718293a4b5c6';

export class SeedDemoUser1793106400000 implements MigrationInterface {
  name = 'SeedDemoUser1793106400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // '!' is not a valid scrypt hash: the demo user cannot log in.
    await queryRunner.query(
      `INSERT INTO "users" ("id", "email", "password_hash", "first_name", "last_name", "role", "created_at")
       VALUES ($1, $2, '!', $3, $4, $5, $6)`,
      [
        DEMO_USER_ID,
        'ada@example.com',
        'Ada',
        'Lovelace',
        'CLIENT',
        '2026-10-01T08:00:00Z',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE "id" = $1`, [
      DEMO_USER_ID,
    ]);
  }
}
