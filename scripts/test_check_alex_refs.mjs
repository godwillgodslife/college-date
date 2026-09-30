import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf8");
let supabaseUrl = "";
let supabaseAnon = "";
for (const line of envFile.split("\n")) {
  if (line.startsWith("VITE_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
  if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) supabaseAnon = line.split("=")[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseAnon);

async function checkAlex() {
  await supabase.auth.signInWithPassword({
    email: "student.tester2026@gmail.com",
    password: "CollegeDate2026!VerifiedPass"
  });
  const { data: refs } = await supabase.from("referrals").select("*").eq("referrer_id", "1e618bba-9d24-4262-b3c0-1b24b4ff40ff");
  console.log("Alex Davis referrals rows:", refs);
}
checkAlex();
