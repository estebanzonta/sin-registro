import 'dotenv/config';
import { prisma } from './db.js';

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      stmt text;
    BEGIN
      SELECT
        'TRUNCATE TABLE '
        || string_agg(format('%I.%I', schemaname, tablename), ', ')
        || ' RESTART IDENTITY CASCADE'
      INTO stmt
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations';

      IF stmt IS NOT NULL THEN
        EXECUTE stmt;
      END IF;
    END $$;
  `);

  console.log('Development data cleared');
}

main()
  .catch((error) => {
    console.error('Clear dev data error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
