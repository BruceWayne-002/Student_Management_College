

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

// ---------- Env helpers ----------
function getEnv(name, required = true) {
  const val = process.env[name];
  if (required && (!val || val.trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val?.trim();
}

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const SHEET_ID = getEnv('GOOGLE_SHEET_ID');
const SHEET_GID = process.env.GOOGLE_SHEET_GID ? String(process.env.GOOGLE_SHEET_GID) : '0';
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A1:Z1000';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_SA_JSON_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || '';
const GOOGLE_SA_CREDENTIALS_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';

function ensureValidServiceRoleKey(k) {
  const tooShort = !k || k.length < 50;
  const looksTruncated = typeof k === 'string' && k.includes('...');
  if (tooShort || looksTruncated) {
    throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY. Paste the full Service Role key from Supabase project settings.');
  }
}
ensureValidServiceRoleKey(SUPABASE_SERVICE_ROLE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
 

// ---------- Fetch helpers ----------
async function fetchWithRetry(url, options = {}, maxRetries = 3, backoffMs = 500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return res;
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries) throw err;
      await new Promise(r => setTimeout(r, backoffMs * attempt));
    }
  }
}

async function fetchSheetCSV(sheetId, gid = '0') {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetchWithRetry(csvUrl);
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error('Invalid sheet structure: empty CSV');
  }
  return text;
}

async function fetchSheetValuesAPI(sheetId, range, apiKey) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const res = await fetchWithRetry(url);
  const json = await res.json();
  if (!json || !json.values || json.values.length === 0) {
    throw new Error('Invalid sheet structure: no values returned');
  }
  return json.values; // array of rows (arrays)
}

async function fetchSheetValuesWithServiceAccount(sheetId, range) {
  let auth;
  if (GOOGLE_SA_JSON_PATH) {
    const resolved = path.resolve(GOOGLE_SA_JSON_PATH);
    auth = new google.auth.GoogleAuth({
      keyFile: resolved,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } else if (GOOGLE_SA_CREDENTIALS_JSON) {
    const creds = JSON.parse(GOOGLE_SA_CREDENTIALS_JSON);
    const client = new google.auth.JWT(
      creds.client_email,
      undefined,
      creds.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    auth = { getClient: async () => client };
  } else {
    throw new Error('Service Account credentials not provided. Set GOOGLE_SERVICE_ACCOUNT_JSON_PATH or GOOGLE_SERVICE_ACCOUNT_JSON.');
  }

  try {
    const authedClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authedClient });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });
    const values = res.data.values;
    if (!values || values.length === 0) {
      throw new Error('Sheets API returned empty values');
    }
    return values;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('401')) {
      throw new Error('Sheets API auth failed (401). Check service account credentials.');
    }
    if (msg.includes('403')) {
      throw new Error('Sheets API permission denied (403). Share the spreadsheet with the service account email.');
    }
    throw err;
  }
}
// ---------- CSV parsing ----------
function parseCSV(csvText) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const text = String(csvText ?? '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((ch === '\n') && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = rows[0].map(h => String(h).trim());
  const dataRows = rows.slice(1);
  return { headers, rows: dataRows };
}

// ---------- Normalization ----------
function normalizeHeaderForMap(key) {
  return key
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Ensure year is always numeric (1..6). Accepts roman or digits.
function normalizeYear(value) {
  if (!value) return null;
  const v = String(value).trim().toUpperCase();
  const romanMap = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  if (romanMap[v]) return romanMap[v];
  if (/^\d+$/.test(v)) return Number(v);
  return null;
}

const HEADER_MAP = {
  // 1
  'register no': 'register_no',
  'register_no': 'register_no',
  'registration number': 'register_no',

  // 2
  'name': 'name',

  // 3
  'father name': 'father_name',

  // 4
  'mother name': 'mother_name',

  // 5
  'address': 'address',

  // 6
  'class': 'class',

  // 7
  'year': 'year',

  // 8
  'email': 'email',

  // 9
  'overall attendance percentage': 'attendance_percentage',
  'attendance percentage': 'attendance_percentage',

  // 10
  'present to class (today)': 'present_today',
  'present today': 'present_today',

  // 11
  'leave taken': 'leave_taken',

  // 12
  'result percentage': 'result_percentage',

  // 13
  'student_number': 'phone_number',
  'student number': 'phone_number',
  'phone number': 'phone_number',

  // 14
  'parents_number': 'parents_number',
  'parents number': 'parents_number',

  // 15
  'blood group': 'blood_group',

  // 16
  'hostel': 'hostel',

  // 17
  'dob': 'dob',
  'date of birth': 'dob',

  // 18
  'displinary action': 'disciplinary_action',
  'disciplinary action': 'disciplinary_action',

  // 19
  'year of passing': 'year_of_passing',
  'mentor': 'mentor',
};

function buildHeaderIndex(headers) {
  const index = {};
  headers.forEach((h, i) => {
    const norm = normalizeHeaderForMap(h);
    const mapped = HEADER_MAP[norm] || norm.replace(/\s+/g, '_');
    index[mapped] = i;
  });
  return index;
}

function mapRowToStudent(headerIndex, row, rowNumber) {
  const getStrOrEmpty = (key) => {
    const idx = headerIndex[key];
    const val = idx !== undefined ? row[idx] : '';
    const s = String(val ?? '').trim();
    return s.length > 0 ? s : '';
  };
  const getNumOrNull = (key) => {
    const idx = headerIndex[key];
    if (idx === undefined) return null;
    const raw = row[idx];
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const getDateOrNull = (key) => {
    const idx = headerIndex[key];
    if (idx === undefined) return null;
    const raw = String(row[idx] ?? '').trim();
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? null
      : d.toISOString().split('T')[0];
  };

  const register_no = getStrOrEmpty('register_no');
  const name = getStrOrEmpty('name');
  const father_name = getStrOrEmpty('father_name');
  const mother_name = getStrOrEmpty('mother_name');
  const address = getStrOrEmpty('address').replace(/\r?\n+/g, '; ');
  const classNameRaw = getStrOrEmpty('class');
  const yearRaw = getStrOrEmpty('year');
  const present_today = getNumOrNull('present_today');
  const leave_taken = getNumOrNull('leave_taken');
  const attendance_percentage = getNumOrNull('attendance_percentage');
  const result_percentage = getNumOrNull('result_percentage');
  const email = getStrOrEmpty('email');
  const phone_number = getStrOrEmpty('phone_number');
  const parents_number = getStrOrEmpty('parents_number');
  const blood_group = getStrOrEmpty('blood_group');
  const hostel = getStrOrEmpty('hostel') || null;
  const dob = getStrOrEmpty('dob') || null;
  const profile_image_url = getStrOrEmpty('profile_image_url');
  const disciplinary_action = getStrOrEmpty('disciplinary_action');
  const year_of_passing = getNumOrNull('year_of_passing');
  const mentor = getStrOrEmpty('mentor');

  console.log(`[PARSE] row ${rowNumber} register_no=${register_no || '(unknown)'} email=${email || '(blank)'} phone=${phone_number || '(blank)'}`);

  const className = String(classNameRaw || '').trim();
  const department = className ? className.toUpperCase().replace(/\s+/g, '') : '';
  const year = normalizeYear(yearRaw);

  return {
    register_no,
    name,
    father_name,
    mother_name,
    address,
    department,
    year, // numeric or null
    email,
    attendance_percentage,
    present_today,
    leave_taken,
    result_percentage,
    phone_number,
    parents_number,
    blood_group,
    hostel,
    dob,
    profile_image_url,
    disciplinary_action,
    year_of_passing,
    mentor,
  };
}

function validateStudent(row) {
  const warnings = [];
  if (!row.register_no) warnings.push('register_no missing');
  if (!row.name) warnings.push('name missing');
  const validRegister = /^[A-Za-z0-9/_-]+$/.test(String(row.register_no || ''));
  if (!validRegister) warnings.push('register_no invalid');
  if (!row.department || String(row.department).trim() === '') warnings.push('class missing');
  if (!row.year || !Number.isFinite(Number(row.year))) warnings.push('year missing');
  return { warnings };
}

function deriveAttendance(row) {
  const total = (row.present_today || 0) + (row.leave_taken || 0);
  const percentage = total > 0 ? (row.present_today / total) * 100 : 0;
  return Number.isFinite(percentage) ? Math.round(percentage * 100) / 100 : 0;
}

// ---------- Supabase UPSERT ----------
async function upsertStudents(students) {
  const batchSize = 500;
  let upserted = 0;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize).map(s => {
      const hasAttendanceData =
        s.present_today !== null ||
        s.leave_taken !== null;
      const payload = { ...s };
      const year = normalizeYear(payload.year);
      if (!year) {
        console.warn('Skipping row due to invalid year', s);
        return null;
      }
      payload.year = year;
      if (hasAttendanceData) {
        payload.attendance_percentage = deriveAttendance({
          present_today: s.present_today || 0,
          leave_taken: s.leave_taken || 0,
        });
      }
      if (typeof payload.email === 'string' && payload.email.trim() === '') {
        delete payload.email;
      }
      if (typeof payload.phone_number === 'string' && payload.phone_number.trim() === '') {
        delete payload.phone_number;
      }
      return payload;
    }).filter(Boolean);
    console.log('UPSERT payload preview:', batch.slice(0, Math.min(3, batch.length)));
    const { error } = await supabaseAdmin
      .from('students')
      .upsert(batch, { onConflict: 'register_no' });
    if (error) {
      throw new Error(`Supabase upsert error: ${error.message}`);
    }
    upserted += batch.length;
  }
  return { upserted };
}

// ---------- Hard Sync Deletion ----------
async function deleteMissingStudents(sheetRegisterNos) {
  const uniqueNos = Array.from(new Set((sheetRegisterNos || []).map(r => String(r || '').trim()).filter(r => r.length > 0)));
  if (uniqueNos.length === 0) {
    console.warn('Hard sync: sheetRegisterNos is empty. Deleting all students to mirror empty sheet.');
    const { error } = await supabaseAdmin.from('students').delete();
    if (error) throw new Error(`Delete all students failed: ${error.message}`);
    return;
  }
  const { data: existing, error: selErr } = await supabaseAdmin
    .from('students')
    .select('register_no');
  if (selErr) throw new Error(`Fetch existing students failed: ${selErr.message}`);
  const existingNos = (existing || []).map(r => String(r.register_no || '').trim()).filter(r => r.length > 0);
  const missingNos = existingNos.filter(r => !uniqueNos.includes(r));
  if (missingNos.length === 0) return;
  const { error: delErr } = await supabaseAdmin
    .from('students')
    .delete()
    .in('register_no', missingNos);
  if (delErr) throw new Error(`Delete missing students failed: ${delErr.message}`);
}

function logDuplicateRegisterNos(rows) {
  const seen = new Set();
  const dupes = new Set();
  for (const r of rows) {
    if (!r.register_no) continue;
    if (seen.has(r.register_no)) dupes.add(r.register_no);
    seen.add(r.register_no);
  }
  if (dupes.size > 0) {
    console.warn('⚠️ Duplicate register_no values in sheet:', [...dupes]);
  }
}

function dedupeByRegisterNo(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.register_no) continue;
    map.set(row.register_no, row);
  }
  return Array.from(map.values());
}

// ---------- Main ----------
async function syncGoogleSheet() {
  const start = Date.now();
  console.log('Starting Google Sheet → Supabase sync...');

  let headers = [];
  let rows = [];
  try {
    if (GOOGLE_SA_JSON_PATH || GOOGLE_SA_CREDENTIALS_JSON) {
      console.log('Fetching sheet via Google Sheets API with Service Account...');
      const values = await fetchSheetValuesWithServiceAccount(SHEET_ID, SHEET_RANGE);
      headers = values[0].map(h => String(h).trim());
      rows = values.slice(1);
    } else if (GOOGLE_API_KEY) {
      console.log('Fetching sheet via Google Sheets API (values endpoint)...');
      const values = await fetchSheetValuesAPI(SHEET_ID, SHEET_RANGE, GOOGLE_API_KEY);
      headers = values[0].map(h => String(h).trim());
      rows = values.slice(1);
    } else {
      console.log('Fetching sheet via public CSV export...');
      const csvText = await fetchSheetCSV(SHEET_ID, SHEET_GID);
      const parsed = parseCSV(csvText);
      headers = parsed.headers;
      rows = parsed.rows;
    }
    console.log(`Sheet fetch successful. Raw rows read (excluding header): ${rows.length}`);
  } catch (err) {
    console.error('Network or sheet fetch failure:', err.message);
    throw err; // abort sync
  }

  // Convert -> normalize -> validate
  const headerIndex = buildHeaderIndex(headers);
  console.log('Parsed headers:', Object.keys(headerIndex));
  const normalized = rows.map((r, i) => mapRowToStudent(headerIndex, r, i + 2));
  const totalRows = normalized.length;
  const failedRows = [];
  const validRows = [];

  if (normalized.length > 0) {
    const s = normalized[0] || {};
    console.log('[SAMPLE ROW]', {
      register_no: s.register_no || '(unknown)',
      disciplinary_action: s.disciplinary_action || '(blank)',
      year_of_passing: s.year_of_passing ?? null,
    });
  }

  if (totalRows === 0) {
    console.warn('Warning: No rows found in the sheet after parsing. Nothing to process.');
  }

  for (let idx = 0; idx < normalized.length; idx++) {
    const row = normalized[idx];
    for (const k of Object.keys(row)) {
      if (typeof row[k] === 'string') row[k] = row[k].trim();
    }
    const { warnings } = validateStudent(row);
    if (warnings.length > 0) {
      console.log(`Row ${idx + 2} warnings: ${warnings.join('; ')}`);
    }
    if (!row.register_no) {
      failedRows.push({ row_number: idx + 2, reason: 'register_no missing' });
      continue;
    }
    if (warnings.includes('register_no invalid')) {
      failedRows.push({ row_number: idx + 2, reason: 'register_no invalid' });
      continue;
    }
    if (warnings.includes('class missing') || warnings.includes('year missing')) {
      failedRows.push({ row_number: idx + 2, reason: 'class/year missing' });
      continue;
    }
    const hasAttendanceData =
      row.present_today !== null ||
      row.leave_taken !== null;
    if (hasAttendanceData) {
      row.attendance_percentage = deriveAttendance(row);
    }
    validRows.push(row);
  }

  // Perform UPSERT
  let processed_rows = 0;
  try {
    logDuplicateRegisterNos(validRows);
    const dedupedRows = dedupeByRegisterNo(validRows);
    console.log(`De-duplicated rows: ${validRows.length} → ${dedupedRows.length}`);

    const sheetRegisterNos = dedupedRows.map(r => r.register_no);
    console.log('Deleting Supabase rows not present in sheet...');
    await deleteMissingStudents(sheetRegisterNos);

    console.log(`Beginning Supabase upsert for ${dedupedRows.length} valid rows...`);
    const result = await upsertStudents(dedupedRows);
    processed_rows = result.upserted;
    console.log(`Upsert completed. Processed rows: ${processed_rows}`);
  } catch (err) {
    console.error('Supabase error:', err.message);
    throw err; // abort sync
  }

  const durationMs = Date.now() - start;
  const summary = {
    total_rows: totalRows,
    processed_rows,
    failed_rows: failedRows.length,
    duration_ms: durationMs,
  };

  console.log('Sync Summary:');
  console.log(` - Total rows: ${summary.total_rows}`);
  console.log(` - Processed rows: ${summary.processed_rows}`);
  console.log(` - Failed: ${summary.failed_rows}`);
  console.log(` - Duration (ms): ${summary.duration_ms}`);
  console.log('Sync completed successfully');

  return summary;
}

// Explicit entry point (non-negotiable)
syncGoogleSheet()
  .then(() => {
    console.log('Sync completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
