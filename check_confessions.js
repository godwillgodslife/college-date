import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.swnzdfuoykqoaxgylvcc:[REDACTED]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'confessions';
    `);
    console.log('--- COLUMNS ---');
    console.table(res.rows);

    const rules = await client.query(`
      select * from pg_policies where tablename = 'confessions';
    `);
    console.log('--- POLICIES ---');
    console.table(rules.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
