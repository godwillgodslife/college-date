import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://postgres.swnzdfuoykqoaxgylvcc:[REDACTED]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();

        console.log('--- Checking for net extension ---');
        const ext = await client.query("SELECT * FROM pg_extension WHERE extname = 'pg_net'");
        console.log('Extension pg_net:', ext.rows.length > 0 ? 'INSTALLED' : 'MISSING');

        console.log('--- Applying Trigger ---');
        await client.query(`
      CREATE OR REPLACE FUNCTION public.notify_on_confession()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
          payload jsonb;
      BEGIN
          IF (TG_OP = 'INSERT') THEN
              RETURN NEW;
          END IF;
          IF (COALESCE(NEW.likes, 0) >= 20) 
              AND (OLD.pulse_notified IS NULL OR OLD.pulse_notified = false) THEN
              payload := jsonb_build_object('record', row_to_json(NEW)::jsonb);
              -- Only try HTTP if net exists
              BEGIN
                PERFORM net.http_post(url := 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/notify-on-event', body := payload::text);
              EXCEPTION WHEN OTHERS THEN
                NULL;
              END;
          END IF;
          RETURN NEW;
      END;
      $$;
    `);

        await client.query(`
      DROP TRIGGER IF EXISTS confession_notification_trigger ON public.confessions;
      CREATE TRIGGER confession_notification_trigger
      AFTER INSERT OR UPDATE ON public.confessions
      FOR EACH ROW EXECUTE FUNCTION public.notify_on_confession();
    `);

        console.log('✅ Success');

    } catch (err) {
        console.error('❌ CATCH ERROR:', err);
    } finally {
        await client.end();
    }
}
run();
