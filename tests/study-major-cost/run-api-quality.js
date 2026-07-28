'use strict';

/**
 * Quality runner for Study, Major & Cost Planner API.
 * Usage:
 *   CLAUDE_API_KEY=... node tests/study-major-cost/run-api-quality.js
 *   SMC_API_URL=https://.../api/pathways-study-major-cost node tests/study-major-cost/run-api-quality.js
 *
 * Does not print prompts, keys, or raw Claude dumps.
 */

const fs = require('fs');
const path = require('path');
const {
  validateAndNormalizeInput,
} = require('../../lib/study-major-cost/validate-input');
const { calculateCosts } = require('../../lib/study-major-cost/calculate-costs');
const { validateReport } = require('../../api/study-major-cost/validate-report');
const handler = require('../../api/pathways-study-major-cost');

const FIX = path.join(__dirname, '../../fixtures/study-major-cost');
const API_URL = process.env.SMC_API_URL || '';

function mockRes() {
  const out = { statusCode: 200, body: null };
  return {
    statusCode: 200,
    setHeader() {},
    status(code) {
      out.statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(payload) {
      out.body = payload;
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
    _out: out,
  };
}

async function invokeLocal(answers, full) {
  const req = {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    body: { answers, full: !!full },
  };
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, data: res.body };
}

async function invokeRemote(answers, full) {
  const t0 = Date.now();
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, full: !!full }),
  });
  const data = await resp.json().catch(() => ({}));
  return { status: resp.status, data, ms: Date.now() - t0 };
}

async function runProfile(id) {
  const profile = JSON.parse(
    fs.readFileSync(path.join(FIX, `sample-profile-${id}.json`), 'utf8')
  );
  const validated = validateAndNormalizeInput(profile.answers);
  if (!validated.ok) {
    return { id, ok: false, stage: 'input', errors: validated.errors };
  }
  const costs = calculateCosts(validated.answers);
  const invoke = API_URL ? invokeRemote : invokeLocal;
  const t0 = Date.now();
  const { status, data, ms } = await invoke(validated.answers, true);
  const elapsed = ms || Date.now() - t0;

  if (!data || !data.ok || !data.report) {
    return {
      id,
      ok: false,
      stage: 'api',
      status,
      error: data && data.error,
      elapsed_ms: elapsed,
      retry_used: data && data.retry_used,
    };
  }

  const v = validateReport(data.report, costs);
  return {
    id,
    ok: v.ok,
    stage: 'validate',
    status,
    elapsed_ms: elapsed,
    retry_used: !!data.retry_used,
    model: data.versions && data.versions.model,
    pressure: data.free && data.free.budget_pressure_level,
    std_year1: data.costs && data.costs.scenarios.standard.first_planning_year_total,
    std_program: data.costs && data.costs.scenarios.standard.program_total,
    schema_errors: v.ok ? [] : v.errors.slice(0, 15),
  };
}

async function runErrorCases() {
  const results = [];
  const base = JSON.parse(
    fs.readFileSync(path.join(FIX, 'sample-profile-a.json'), 'utf8')
  ).answers;

  const cases = [
    { name: 'non_us', answers: { ...base, target_country: 'UK' } },
    { name: 'non_bachelor', answers: { ...base, target_degree: 'master' } },
    { name: 'q08_conflict', answers: { ...base, tech_acceptance: ['none', 'math'] } },
  ];

  for (const c of cases) {
    const invoke = API_URL ? invokeRemote : invokeLocal;
    const { status, data } = await invoke(c.answers, false);
    results.push({
      name: c.name,
      status,
      ok: status === 400 && data && data.ok === false,
      error: data && data.error,
    });
  }
  return results;
}

(async () => {
  if (!API_URL && !process.env.CLAUDE_API_KEY) {
    console.error('Need CLAUDE_API_KEY (local) or SMC_API_URL (Preview).');
    process.exit(2);
  }
  console.log('mode:', API_URL ? 'remote' : 'local');
  console.log('model env default:', process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6');

  const profiles = [];
  for (const id of ['a', 'b', 'c']) {
    console.log('running profile', id, '...');
    const r = await runProfile(id);
    profiles.push(r);
    console.log(JSON.stringify(r));
  }

  const errors = await runErrorCases();
  console.log('error_cases', JSON.stringify(errors));

  const allOk = profiles.every((p) => p.ok) && errors.every((e) => e.ok);
  process.exit(allOk ? 0 : 1);
})().catch((e) => {
  console.error('runner_failed', e.message);
  process.exit(1);
});
