'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  validateAndNormalizeInput,
} = require('../../lib/study-major-cost/validate-input');
const { calculateCosts } = require('../../lib/study-major-cost/calculate-costs');
const { validateReport } = require('../../api/study-major-cost/validate-report');
const C = require('../../lib/study-major-cost/constants');

const FIX = path.join(__dirname, '../../fixtures/study-major-cost');

describe('fixture-report-a schema + cost alignment', () => {
  it('passes validateReport against Profile A engine output', () => {
    const report = JSON.parse(
      fs.readFileSync(path.join(FIX, 'fixture-report-a.json'), 'utf8')
    );
    const profile = JSON.parse(
      fs.readFileSync(path.join(FIX, 'sample-profile-a.json'), 'utf8')
    );
    const v = validateAndNormalizeInput(profile.answers);
    assert.equal(v.ok, true);
    const costs = calculateCosts(v.answers);
    const result = validateReport(report, costs);
    assert.equal(result.ok, true, result.errors && result.errors.join('\n'));
    assert.equal(report.disclaimer, C.DISCLAIMER_REQUIRED);
    assert.equal(report.education_value.financial_roi_assessed, false);
  });

  it('rejects undeclared top-level field', () => {
    const report = JSON.parse(
      fs.readFileSync(path.join(FIX, 'fixture-report-a.json'), 'utf8')
    );
    report.secret_prompt = 'leak';
    const profile = JSON.parse(
      fs.readFileSync(path.join(FIX, 'sample-profile-a.json'), 'utf8')
    );
    const costs = calculateCosts(
      validateAndNormalizeInput(profile.answers).answers
    );
    const result = validateReport(report, costs);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('undeclared')));
  });

  it('rejects AI-altered standard annual total', () => {
    const report = JSON.parse(
      fs.readFileSync(path.join(FIX, 'fixture-report-a.json'), 'utf8')
    );
    report.cost_outlook.annual_total_by_scenario.standard = 99999;
    const profile = JSON.parse(
      fs.readFileSync(path.join(FIX, 'sample-profile-a.json'), 'utf8')
    );
    const costs = calculateCosts(
      validateAndNormalizeInput(profile.answers).answers
    );
    const result = validateReport(report, costs);
    assert.equal(result.ok, false);
  });
});
