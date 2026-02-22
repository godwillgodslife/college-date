import fs from 'fs';

const raw = fs.readFileSync('lint.json', 'utf8');
const data = JSON.parse(raw);

const criticalErrors = [];

for (const file of data) {
    const errors = file.messages.filter(m => m.ruleId === 'no-undef' || m.severity === 2 && !m.ruleId?.includes('unused') && !m.ruleId?.includes('exhaustive-deps'));
    if (errors.length > 0) {
        criticalErrors.push({
            file: file.filePath,
            errors: errors.map(e => `${e.line}:${e.column} - ${e.message} (${e.ruleId})`)
        });
    }
}

console.log(JSON.stringify(criticalErrors, null, 2));
