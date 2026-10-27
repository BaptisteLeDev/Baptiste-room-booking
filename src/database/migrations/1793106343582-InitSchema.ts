import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1793106343582 implements MigrationInterface {
  name = 'InitSchema1793106343582';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(254) NOT NULL, "password_hash" character varying(255) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "role" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_4544c7077329114d450ca48c86" CHECK ("role" IN ('CLIENT','GESTIONNAIRE','ADMINISTRATEUR')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "availabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "room_id" uuid NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "CHK_33bddfa1a4d3ee130cc3469b0d" CHECK ("end_time" > "start_time"), CONSTRAINT "PK_9562bd8681d40361b1a124ea52c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "description" text, "capacity" integer NOT NULL, "location" character varying(255) NOT NULL, "equipment" text array NOT NULL DEFAULT '{}', "price_per_hour" numeric(10,2) NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'ACTIVE', "image_url" character varying(2048), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_eabbe45f00ccec8971847480ed" CHECK ("status" IN ('ACTIVE','INACTIVE')), CONSTRAINT "CHK_fb9b480254e464a624ea39039e" CHECK ("price_per_hour" >= 0), CONSTRAINT "CHK_d76bf749801903b5e0900d7d5d" CHECK ("capacity" >= 1), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "room_id" uuid NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(10) NOT NULL, "number_of_participants" integer, "comment" text, "total_amount" numeric(10,2) NOT NULL, "currency" character(3) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "CHK_4bf0975bfae439db59697e21b0" CHECK ("status" IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','COMPLETED')), CONSTRAINT "CHK_bde9f398fb82e1b9d13cf2344d" CHECK ("end_time" > "start_time"), CONSTRAINT "no_overlap_active" EXCLUDE USING gist ("room_id" WITH =, tstzrange("start_time", "end_time") WITH &&) WHERE ("status" IN ('PENDING', 'CONFIRMED')), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reservation_id" uuid NOT NULL, "external_transaction_id" character varying(255), "amount" numeric(10,2) NOT NULL, "currency" character(3) NOT NULL, "status" character varying(10) NOT NULL, "payment_url" character varying(2048), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_9ed5ff4942e09edfd44ee0ccf0" UNIQUE ("reservation_id"), CONSTRAINT "CHK_8f9d58a190f5df34d2f87e58e2" CHECK ("status" IN ('PENDING','PAID','FAILED','REFUNDED')), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "availabilities" ADD CONSTRAINT "FK_5c2a31145060ad0733c1ddebd51" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD CONSTRAINT "FK_9f38c339cb7a6e33b02f9d2c743" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_4af5055a871c46d011345a255a6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_6aef3a04f7c96611e75d2db10fb" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_9ed5ff4942e09edfd44ee0ccf01" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_9ed5ff4942e09edfd44ee0ccf01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_6aef3a04f7c96611e75d2db10fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_4af5055a871c46d011345a255a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" DROP CONSTRAINT "FK_9f38c339cb7a6e33b02f9d2c743"`,
    );
    await queryRunner.query(
      `ALTER TABLE "availabilities" DROP CONSTRAINT "FK_5c2a31145060ad0733c1ddebd51"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TABLE "availabilities"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
