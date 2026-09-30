import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
let url = "", anon = "";
for (const l of env.split("\n")) {
  if (l.startsWith("VITE_SUPABASE_URL=")) url = l.split("=")[1].trim();
  if (l.startsWith("VITE_SUPABASE_ANON_KEY=")) anon = l.split("=")[1].trim();
}
const supabase = createClient(url, anon);
const testEmail = `test.rpc.${Date.now()}@thecollegedate.com`;
const { data: signData, error: signErr } = await supabase.auth.signUp({ 
  email: testEmail, 
  password: "Password123!Test", 
  options: { data: { role: "Female" } } 
});

if (signErr) { 
  console.error("Sign error:", signErr); 
  process.exit(1); 
}
console.log("Signed up:", signData.user?.id);

const { data: rpcData, error: rpcErr } = await supabase.rpc("complete_user_onboarding", {
  p_full_name: "RPC Tester",
  p_age: 22,
  p_university: "University of Ibadan (UI)",
  p_level: "400 Level",
  p_interests: ["Art", "Music"],
  p_attraction_goal: "Long-term",
  p_profile_photos: ["https://example.com/photo1.jpg"],
  p_avatar_url: "https://example.com/photo1.jpg"
});

if (rpcErr) {
  console.error("RPC ERROR:", rpcErr);
} else {
  console.log("RPC SUCCESS:", rpcData.id, rpcData.full_name, rpcData.is_onboarded, rpcData.age);
}
