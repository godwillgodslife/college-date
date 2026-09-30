import fetch from "node-fetch";

async function testExpired() {
  console.log("=== TEST D: INVALID / CONSUMED TOKEN TEST ===");
  // Re-verify the already-consumed token
  const consumedUrl = "https://gedoyoleoscgxgdqszzc.supabase.co/auth/v1/verify?token=38ae9f5eab58ba2143723b5737b027989e6d8f1610efb8117c30d984&type=recovery&redirect_to=https://www.thecollegedate.com/reset-password";
  const resp = await fetch(consumedUrl, { redirect: "manual" });
  console.log("Status:", resp.status);
  const loc = resp.headers.get("location");
  console.log("Redirect location:", loc);
  if (loc && loc.includes("error")) {
    console.log("VERIFIED: Supabase redirects to error URL:", loc);
  }
}
testExpired();
