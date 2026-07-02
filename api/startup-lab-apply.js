// ================================================================
// api/startup-lab-apply.js — AI Startup Career Lab application intake
// Writes to startup_lab_applications via service role only (RLS bypass).
// ================================================================

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PRODUCTION_ORIGINS = [
  'https://www.movingcost.ai',
  'https://movingcost.ai',
];

const DEGREE_LEVELS = ['Undergraduate', "Master's", 'PhD', 'Recent Graduate', 'Other'];
const PRIMARY_TRACKS = [
  'AI Content & SEO',
  'Data & Market Research',
  'Growth Marketing',
  'Business Development',
  'Product & User Experience',
  'AI Workflow & Automation',
  'Not Sure Yet',
];
const SECONDARY_TRACKS = PRIMARY_TRACKS.filter((t) => t !== 'Not Sure Yet');
const WEEKLY_AVAILABILITY = ['5–7 hours', '8–10 hours', '10+ hours'];
const ENGLISH_LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Fluent'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function getAllowedOrigins() {
  const extra = (process.env.STARTUP_LAB_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...PRODUCTION_ORIGINS, ...extra];
}

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function supabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase env missing');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: options.prefer ?? 'return=minimal',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return { ok: res.ok, status: res.status, data };
}

function trimStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function cleanText(value, maxLen) {
  const t = trimStr(value).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  if (t.includes('<') || t.includes('>')) return null;
  return t.slice(0, maxLen);
}

function optionalText(value, maxLen) {
  const t = trimStr(value);
  if (!t) return null;
  return cleanText(t, maxLen);
}

function validateUrl(value) {
  const t = trimStr(value);
  if (!t) return null;
  if (t.length > 500) return false;
  if (!URL_RE.test(t)) return false;
  if (/javascript:/i.test(t)) return false;
  return t;
}

function hashIp(req) {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) return null;
  const raw =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    '';
  if (!raw) return null;
  return crypto.createHash('sha256').update(`${raw}:${salt}`).digest('hex');
}

function submittedFrom(origin) {
  if (PRODUCTION_ORIGINS.includes(origin)) return 'production';
  if (origin) return 'preview';
  return 'unknown';
}

async function hasRecentSubmission(normalizedEmail) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const path =
    `/startup_lab_applications?email=eq.${encodeURIComponent(normalizedEmail)}` +
    `&created_at=gte.${encodeURIComponent(since)}` +
    '&select=id&limit=1';
  const { ok, data } = await supabase(path, { method: 'GET', prefer: '' });
  if (!ok) {
    throw new Error(data?.message || data?.error || 'Rate check failed');
  }
  return Array.isArray(data) && data.length > 0;
}

function validatePayload(body) {
  const errors = {};

  const full_name = cleanText(body.full_name, 120);
  if (!full_name) errors.full_name = 'Full name is required.';

  const emailRaw = trimStr(body.email).toLowerCase();
  const email = emailRaw.slice(0, 254);
  if (!email || !EMAIL_RE.test(email)) errors.email = 'Valid email is required.';

  const phone = optionalText(body.phone, 80);
  if (body.phone && phone === null) errors.phone = 'Invalid phone / contact info.';

  const location = optionalText(body.location, 120);
  if (body.location && location === null) errors.location = 'Invalid location.';

  const timezone = optionalText(body.timezone, 80);
  if (body.timezone && timezone === null) errors.timezone = 'Invalid time zone.';

  const school = cleanText(body.school, 200);
  if (!school) errors.school = 'School / university is required.';

  const degree_level = trimStr(body.degree_level);
  if (!DEGREE_LEVELS.includes(degree_level)) errors.degree_level = 'Valid degree level is required.';

  const major = cleanText(body.major, 200);
  if (!major) errors.major = 'Major / field of study is required.';

  let graduation_year = optionalText(body.graduation_year, 4);
  if (body.graduation_year) {
    if (!graduation_year || !/^\d{4}$/.test(graduation_year)) {
      errors.graduation_year = 'Graduation year must be a 4-digit year.';
    } else {
      const y = parseInt(graduation_year, 10);
      if (y < 1950 || y > 2040) errors.graduation_year = 'Please enter a realistic graduation year.';
    }
  } else {
    graduation_year = null;
  }

  const primary_track = trimStr(body.primary_track);
  if (!PRIMARY_TRACKS.includes(primary_track)) errors.primary_track = 'Valid primary track is required.';

  let secondary_track = trimStr(body.secondary_track);
  if (!secondary_track) {
    secondary_track = null;
  } else if (!SECONDARY_TRACKS.includes(secondary_track)) {
    errors.secondary_track = 'Invalid secondary track.';
  }

  const weekly_availability = trimStr(body.weekly_availability);
  if (!WEEKLY_AVAILABILITY.includes(weekly_availability)) {
    errors.weekly_availability = 'Valid weekly availability is required.';
  }

  const english_level = trimStr(body.english_level);
  if (!ENGLISH_LEVELS.includes(english_level)) {
    errors.english_level = 'Valid English level is required.';
  }

  const linkedin_url = body.linkedin_url ? validateUrl(body.linkedin_url) : null;
  if (body.linkedin_url && linkedin_url === false) errors.linkedin_url = 'Invalid LinkedIn URL.';

  const resume_url = body.resume_url ? validateUrl(body.resume_url) : null;
  if (body.resume_url && resume_url === false) errors.resume_url = 'Invalid resume URL.';

  const portfolio_url = body.portfolio_url ? validateUrl(body.portfolio_url) : null;
  if (body.portfolio_url && portfolio_url === false) errors.portfolio_url = 'Invalid portfolio URL.';

  const why_join = cleanText(body.why_join, 2000);
  if (!why_join || why_join.length < 20) errors.why_join = 'Please write at least 20 characters.';

  const learning_goal = cleanText(body.learning_goal, 2000);
  if (!learning_goal || learning_goal.length < 20) {
    errors.learning_goal = 'Please write at least 20 characters.';
  }

  const proud_experience = optionalText(body.proud_experience, 2000);
  if (body.proud_experience && proud_experience === null) {
    errors.proud_experience = 'Invalid characters in experience field.';
  }

  const consent_program = body.consent_program === true;
  const consent_letters = body.consent_letters === true;
  if (!consent_program) errors.consent_program = 'Program consent is required.';
  if (!consent_letters) errors.consent_letters = 'Letter policy consent is required.';

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let source_page = cleanText(body.source_page, 200) || '/startup-lab-apply';
  if (!source_page.startsWith('/')) source_page = '/startup-lab-apply';

  const referrer = optionalText(body.referrer, 2000);

  return {
    record: {
      full_name,
      email,
      phone,
      location,
      timezone,
      school,
      degree_level,
      major,
      graduation_year,
      primary_track,
      secondary_track,
      weekly_availability,
      english_level,
      linkedin_url: linkedin_url || null,
      resume_url: resume_url || null,
      portfolio_url: portfolio_url || null,
      why_join,
      learning_goal,
      proud_experience,
      consent_program: true,
      consent_letters: true,
      status: 'new',
      source_page,
      referrer,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  setCORS(req, res);

  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '';
    if (!getAllowedOrigins().includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers.origin || '';
  if (!getAllowedOrigins().includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[startup-lab-apply] Missing Supabase env');
    return res.status(500).json({ error: 'Unable to submit application. Please try again later.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const rawSize = JSON.stringify(body).length;
  if (rawSize > 32 * 1024) {
    return res.status(400).json({ error: 'Request too large' });
  }

  const { record, errors } = validatePayload(body);
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', fields: errors });
  }

  try {
    if (await hasRecentSubmission(record.email)) {
      return res.status(429).json({
        error: 'You already submitted an application recently. Please try again after 24 hours.',
      });
    }

    const user_agent = trimStr(req.headers['user-agent']).slice(0, 500) || null;
    const refererHeader = trimStr(req.headers.referer).slice(0, 2000) || null;

    const insertPayload = {
      ...record,
      user_agent,
      referrer: refererHeader || record.referrer,
      ip_hash: hashIp(req),
      submitted_from: submittedFrom(origin),
    };

    const { ok, status, data } = await supabase('/startup_lab_applications', {
      method: 'POST',
      body: JSON.stringify(insertPayload),
      prefer: 'return=minimal',
    });

    if (!ok) {
      console.error('[startup-lab-apply] Supabase insert failed', status, data);
      return res.status(500).json({ error: 'Unable to submit application. Please try again later.' });
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[startup-lab-apply] Unexpected error', err.message);
    return res.status(500).json({ error: 'Unable to submit application. Please try again later.' });
  }
}
