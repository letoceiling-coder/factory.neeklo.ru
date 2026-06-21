// i18n parity audit: ensures ru.json and en.json have the same key set.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'frontend', 'src', 'i18n');

const ru = JSON.parse(fs.readFileSync(path.join(dir, 'ru.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));

function flatten(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') keys.push(...flatten(v, full));
    else keys.push(full);
  }
  return keys;
}

const ruKeys = new Set(flatten(ru));
const enKeys = new Set(flatten(en));

const missingInEn = [...ruKeys].filter((k) => !enKeys.has(k));
const missingInRu = [...enKeys].filter((k) => !ruKeys.has(k));

if (missingInEn.length === 0 && missingInRu.length === 0) {
  console.log(`i18n OK — ${ruKeys.size} keys, RU/EN in parity`);
  process.exit(0);
}
if (missingInEn.length) console.log('Missing in en.json:', missingInEn);
if (missingInRu.length) console.log('Missing in ru.json:', missingInRu);
process.exit(1);
