import { adbDevice } from './adb_tool.mjs';

try {
  const schema = adbDevice(['shell', 'sqlite3', '/data/data/com.collegedate.app/databases/OneSignal.db', '.schema']);
  console.log('Schema:', schema);

  const rows = adbDevice(['shell', 'sqlite3 /data/data/com.collegedate.app/databases/OneSignal.db "SELECT notification_id, title, message, created_time FROM notification;"']);
  console.log('Rows:\n', rows);
} catch (e) {
  console.error('Error:', e);
}
