import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://postgres.swnzdfuoykqoaxgylvcc:[REDACTED]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();

        // 1. Re-enable the trigger with the correct ref
        await client.query(`
      CREATE OR REPLACE FUNCTION public.notify_on_confession()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
          payload jsonb;
      BEGIN
          IF (COALESCE(NEW.reaction_count, 0) + COALESCE(NEW.comment_count, 0) >= 20) 
              AND (OLD.pulse_notified IS NULL OR OLD.pulse_notified = false) THEN

              payload := jsonb_build_object(
                  'type', TG_OP,
                  'table', TG_TABLE_NAME,
                  'schema', TG_TABLE_SCHEMA,
                  'record', row_to_json(NEW)::jsonb
              );

              PERFORM net.http_post(
                  url := 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/notify-on-event',
                  headers := jsonb_build_object(
                      'Content-Type', 'application/json',
                      'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
                  ),
                  body := payload::text
              );
          END IF;

          RETURN NEW;
      END;
      $$;

      DROP TRIGGER IF EXISTS confession_notification_trigger ON public.confessions;
      CREATE TRIGGER confession_notification_trigger
      AFTER INSERT OR UPDATE ON public.confessions
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_confession();
    `);

        console.log('✅ Confession trigger re-enabled successfully with correct project reference.');

        // 2. Verify it exists
        const res = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'confessions';
    `);
        console.log('Current triggers on confessions:', res.rows.map(r => r.trigger_name));

    } catch (err) {
        console.error('❌ Error applying SQL:', err.message);
    } finally {
        await client.end();
    }
}
run();
