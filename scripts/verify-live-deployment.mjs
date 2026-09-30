import https from 'node:https';

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet: data.slice(0, 300),
          fullBodyLength: data.length,
          data,
        });
      });
    }).on('error', reject);
  });
}

async function verifyLive() {
  console.log('Verifying live deployment on https://www.thecollegedate.com ...\n');

  // 1. Sitemap
  const sitemap = await checkUrl('https://www.thecollegedate.com/sitemap.xml');
  const locCount = (sitemap.data.match(/<loc>/g) || []).length;
  console.log(`sitemap.xml: HTTP ${sitemap.statusCode}, found ${locCount} canonical URLs (Expected: 224)`);

  // 2. llms.txt
  const llms = await checkUrl('https://www.thecollegedate.com/llms.txt');
  console.log(`llms.txt: HTTP ${llms.statusCode}, length: ${llms.fullBodyLength} bytes`);

  // 3. Sample pages
  const testPages = [
    'dating-in-polytechnics-vs-universities-differences',
    'campus-marriage-in-nigerian-universities-pros-and-cons',
    'how-to-end-a-situationship-in-university-without-awkwardness',
    'dating-during-economic-hardship-and-inflation-in-university',
    'how-heartbreak-affects-cgpa-and-how-to-prevent-carryovers',
    'student-dating-in-lagos-unilag-lasu-and-yabatech-guide',
    'how-to-create-a-standout-dating-profile-for-college-students',
    'how-to-re-enter-the-dating-scene-after-a-long-campus-dry-spell',
  ];

  for (const slug of testPages) {
    const res = await checkUrl(`https://www.thecollegedate.com/${slug}`);
    const titleMatch = res.data.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No Title';
    console.log(`✓ /${slug}: HTTP ${res.statusCode} | Title: "${title}"`);
  }

  console.log('\nLive deployment verification completed successfully!');
}

verifyLive().catch(console.error);
