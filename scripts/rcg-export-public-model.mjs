#!/usr/bin/env node
// Publishes the RCG 3D model without the photos.
//
// Decrypts the payload embedded in _pages/rcg.md, then writes only the house plan
// and the 2D fallback floor plans to assets/rcg/house-plan.json. The photos stay
// encrypted. /rcg/ loads that file for everyone; the password still unlocks the photos.
//
// Usage:  node scripts/rcg-export-public-model.mjs        (prompts for the password)
//         RCG_PASSWORD=... node scripts/rcg-export-public-model.mjs
//
// Review the printed summary before committing: everything in the plan, including room
// labels and notes, becomes public.
import {readFileSync, writeFileSync} from 'node:fs';
import {pbkdf2Sync, createDecipheriv} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(path.join(root, '_pages/rcg.md'), 'utf8');
const match = page.match(/<script id="rcg-encrypted-data" type="application\/json">(.*?)<\/script>/s);
if (!match) throw new Error('Could not find #rcg-encrypted-data in _pages/rcg.md');
const cfg = JSON.parse(match[1]);

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    const {stdin, stdout} = process;
    if (!stdin.isTTY) return reject(new Error('No terminal for the password prompt; set RCG_PASSWORD instead.'));
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    stdin.on('data', function onData(ch) {
      if (ch === '\u0003') process.exit(130);
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        return resolve(value);
      }
      value = ch === '\u007f' ? value.slice(0, -1) : value + ch;
    });
  });
}

const password = process.env.RCG_PASSWORD ?? (await askHidden('RCG password: '));
const key = pbkdf2Sync(password, Buffer.from(cfg.salt, 'base64'), cfg.iterations, 32, 'sha256');
const sealed = Buffer.from(cfg.ciphertext, 'base64');
const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(cfg.iv, 'base64'));
decipher.setAuthTag(sealed.subarray(sealed.length - 16)); // WebCrypto appends the 16-byte GCM tag
let plain;
try {
  plain = Buffer.concat([decipher.update(sealed.subarray(0, sealed.length - 16)), decipher.final()]);
} catch {
  console.error('Incorrect password.');
  process.exit(1);
}
const data = JSON.parse(gunzipSync(plain).toString('utf8'));
const fallbackPlans = data.fallbackPlans || (data.fallback ? {0: data.fallback} : {});
const out = path.join(root, 'assets/rcg/house-plan.json');
writeFileSync(out, JSON.stringify({house: data.house, fallbackPlans}));

const rooms = data.house.rooms || [];
console.log(`Wrote ${path.relative(root, out)} (${rooms.length} rooms, ${Object.keys(fallbackPlans).length} fallback plans).`);
console.log('Photos were NOT exported. Everything below becomes public. Review it:');
for (const r of rooms) console.log(`  · ${r.label ?? r.id}${r.notes ? ` | ${[].concat(r.notes).join(' ')}` : ''}`);
if (data.house.site?.notes) console.log(`  · site | ${[].concat(data.house.site.notes).join(' ')}`);
