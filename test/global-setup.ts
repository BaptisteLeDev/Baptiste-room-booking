import { DataSource, type DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source.js';

export default async function globalSetup(): Promise<void> {
  const options = dataSourceOptions as Extract<
    DataSourceOptions,
    { type: 'postgres' }
  >;
  const dataSource = new DataSource({ ...options, database: 'resa_db_test' });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
}
