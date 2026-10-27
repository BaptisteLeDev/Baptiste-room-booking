import { DataSource, type DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'resa_user',
  password: process.env.DB_PASSWORD ?? 'resa_password',
  database: process.env.DB_NAME ?? 'resa_db',
  entities: [],
  migrations: [],
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
