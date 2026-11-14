#!/usr/bin/env node
/**
 * Import the Indian college directory into SWAY.
 *
 * Source: PriyanKishoreMS/colleges-api (AISHE-derived, ~53k institutions, free).
 * Rows go in through POST /admin/colleges/import in batches of 400.
 *
 * Usage:
 *   node scripts/import-colleges.mjs --email admin@sway.app --password '...'
 *   node scripts/import-colleges.mjs --file ./data/colleges.csv --limit 500
 */

import { readFile } from 'node:fs/promises';

const SOURCE =
  'https://raw.githubusercontent.com/PriyanKishoreMS/colleges-api/master/data/colleges.csv';
const BATCH = 400;

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};

const API = arg('api', 'https://sway-api.getfixyes.workers.dev');
const EMAIL = arg('email', 'admin@sway.app');
const PASSWORD = arg('password', '');
const FILE = arg('file', '');
const LIMIT = Number.parseInt(arg('limit', '0'), 10) || 0;

if (!PASSWORD) {
  console.error('Missing --password');
  process.exit(1);
}

/* ---------- CSV ---------- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const clean = (value) =>
  (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim();

const titleish = (value) => {
  if (!value) return null;
  const text = clean(value);
  if (!text || /^(na|n\/a|nil|-)$/i.test(text)) return null;
  return text;
};

function normalise(rows) {
  const [header, ...body] = rows;
  const index = Object.fromEntries(header.map((name, position) => [clean(name).toLowerCase(), position]));

  const seen = new Set();
  const colleges = [];

  for (const row of body) {
    const name = clean(row[index.name]);
    if (name.length < 3) continue;

    const state = titleish(row[index.state])?.slice(0, 120) ?? null;
    const city =
      (titleish(row[index.city]) ?? titleish(row[index.district]))?.slice(0, 120) ?? null;
    const safeName = name.slice(0, 200);
    const key = `${safeName.toLowerCase()}|${(state ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    colleges.push({ name: safeName, city, state });
  }

  return colleges;
}

/* ---------- api ---------- */

async function login() {
  const response = await fetch(`${API}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Login failed: ${body.error ?? response.status}`);
  return body.session.access_token;
}

async function importBatch(token, colleges) {
  const response = await fetch(`${API}/admin/colleges/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ colleges }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Import failed: ${body.error ?? response.status}`);
  return body;
}

/* ---------- main ---------- */

const csv = FILE ? await readFile(FILE, 'utf8') : await (await fetch(SOURCE)).text();
console.log(`source: ${FILE || SOURCE} (${(csv.length / 1024 / 1024).toFixed(1)} MB)`);

const colleges = normalise(parseCsv(csv)).slice(0, LIMIT || undefined);
console.log(`parsed: ${colleges.length} unique colleges`);

const token = await login();
console.log('admin login ok');

let inserted = 0;
let skipped = 0;

for (let i = 0; i < colleges.length; i += BATCH) {
  const batch = colleges.slice(i, i + BATCH);
  const result = await importBatch(token, batch);
  inserted += result.inserted ?? 0;
  skipped += result.skipped ?? 0;

  const done = Math.min(i + BATCH, colleges.length);
  if (done % 4000 === 0 || done === colleges.length) {
    console.log(`progress: ${done}/${colleges.length} · inserted ${inserted} · skipped ${skipped}`);
  }
}

console.log(`done. inserted ${inserted}, skipped ${skipped}`);
