import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const inputHtmlPath = path.resolve(
  process.env.USERPROFILE || 'C:/Users/DELL',
  '.gemini/antigravity/brain/3ea16d0b-a418-4a5d-9859-b3f3d44c905a/college_date_pitch_deck.html'
);

console.log('[1/5] Reading pitch deck source:', inputHtmlPath);
const rawHtml = fs.readFileSync(inputHtmlPath, 'utf8');
const match = rawHtml.match(/const slides = (\[[\s\S]*?\]);\s*let currentSlide/);

if (!match) {
  console.error('Error: Could not extract slides array from', inputHtmlPath);
  process.exit(1);
}

const slides = eval(match[1]);
console.log(`[1/5] Extracted ${slides.length} slides successfully.`);

// Build printable HTML
console.log('[2/5] Constructing printable A4-landscape presentation document...');

const printableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>The College Date — Investor Pitch Deck (Confidential)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }

    @page {
      size: 297mm 210mm;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      background-color: #020617 !important;
      color: #f8fafc !important;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .slide-page {
      width: 297mm;
      height: 210mm;
      max-height: 210mm;
      min-height: 210mm;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      padding: 13mm 18mm 11mm 18mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: #020617 !important;
      position: relative;
      overflow: hidden;
    }

    .slide-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
    }

    .tag-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 6px;
      background-color: rgba(49, 46, 129, 0.6);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }

    .slide-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
    }

    .footer-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100">

${slides
  .map((slide, idx) => {
    const slideNum = (idx + 1).toString().padStart(2, '0');
    const totalSlides = slides.length.toString().padStart(2, '0');
    return `
  <!-- Slide ${idx + 1}: ${slide.title} -->
  <section class="slide-page" id="slide-${idx + 1}">
    <div class="accent-bar"></div>

    <!-- Slide Header -->
    <div>
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-2.5">
          <div class="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-black text-white text-[10px] shadow-sm">
            CD
          </div>
          <span class="tag-badge">${slide.tag}</span>
        </div>
        <span class="slide-counter">SLIDE ${slideNum} / ${totalSlides}</span>
      </div>
      <h1 class="text-2xl font-extrabold text-white tracking-tight leading-tight mt-1">${slide.title}</h1>
      <h2 class="text-xs text-slate-400 font-medium mt-0.5">${slide.subtitle}</h2>
    </div>

    <!-- Slide Body -->
    <div class="flex-1 flex flex-col justify-center py-2">
      ${slide.content}
    </div>

    <!-- Slide Footer -->
    <div class="pt-2.5 border-t border-slate-800/80 flex items-center justify-between footer-text">
      <div class="flex items-center gap-2">
        <span class="font-bold text-slate-400">THE COLLEGE DATE (CD2.0)</span>
        <span>•</span>
        <span>CONFIDENTIAL INVESTOR PITCH DECK</span>
        <span>•</span>
        <span>PRE-SEED ROUND (SEPTEMBER 2026)</span>
      </div>
      <div class="flex items-center gap-3">
        <span>com.collegedate.app</span>
        <span>•</span>
        <span class="text-indigo-400">www.thecollegedate.com</span>
      </div>
    </div>
  </section>
`;
  })
  .join('\n')}

</body>
</html>
`;

const publicDir = path.join(projectRoot, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const printablePath = path.join(publicDir, 'pitch-deck-printable.html');
fs.writeFileSync(printablePath, printableHtml, 'utf8');
console.log('[2/5] Wrote printable HTML to:', printablePath);

// Target PDF outputs
const outputPdfRoot = path.join(projectRoot, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfPublic = path.join(publicDir, 'TheCollegeDate-Investor-Pitch-Deck.pdf');
const outputPdfArtifact = path.resolve(
  process.env.USERPROFILE || 'C:/Users/DELL',
  '.gemini/antigravity/brain/3ea16d0b-a418-4a5d-9859-b3f3d44c905a/TheCollegeDate-Investor-Pitch-Deck.pdf'
);

console.log('[3/5] Compiling PDF via Chrome headless...');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const fileUrl = 'file:///' + printablePath.replace(/\\/g, '/');

const chromeArgs = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--virtual-time-budget=5000',
  `--print-to-pdf=${outputPdfRoot}`,
  fileUrl
];

const chromeProcess = spawnSync(chromePath, chromeArgs, { stdio: 'inherit' });

if (chromeProcess.error) {
  console.error('Chrome spawn error:', chromeProcess.error);
  process.exit(1);
}

if (!fs.existsSync(outputPdfRoot)) {
  console.error('Error: PDF file was not created at', outputPdfRoot);
  process.exit(1);
}

const stats = fs.statSync(outputPdfRoot);
console.log(`[3/5] PDF created successfully at root! File size: ${(stats.size / 1024).toFixed(1)} KB`);

// Distribute to public and artifacts
console.log('[4/5] Distributing PDF to public web directory and artifacts directory...');
fs.copyFileSync(outputPdfRoot, outputPdfPublic);
fs.copyFileSync(outputPdfRoot, outputPdfArtifact);

// Verify page count
const pdfBuffer = fs.readFileSync(outputPdfRoot);
const pdfContent = pdfBuffer.toString('latin1');
const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
const pageCount = pageMatches ? pageMatches.length : 'unknown';

console.log('[5/5] Verification complete!');
console.log(JSON.stringify({
  rootFile: outputPdfRoot,
  publicFile: outputPdfPublic,
  artifactFile: outputPdfArtifact,
  sizeBytes: stats.size,
  sizeKB: `${(stats.size / 1024).toFixed(1)} KB`,
  detectedPages: pageCount
}, null, 2));
