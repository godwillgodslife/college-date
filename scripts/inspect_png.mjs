import fs from "fs";

// Read png header
const buf = fs.readFileSync("c:\\college-date\\public\\evidence_hardening\\forensic_60_focus_password.png");
console.log("File size:", buf.length);
