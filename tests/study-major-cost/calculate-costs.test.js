'use strict';

/**
 * Golden tests for Study, Major & Cost Planner deterministic engine.
 * Must match api/study-major-cost/calculation-trace-v3.md exactly.
 * Run: node --test tests/study-major-cost/calculate-costs.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  validateAndNormalizeInput,
} = require('../../lib/study-major-cost/validate-input');
const { calculateCosts } = require('../../lib/study-major-cost/calculate-costs');
const { RULES_VERSION } = require('../../lib/study-major-cost/versions');

const FIXTURES = path.join(__dirname, '../../fixtures/study-major-cost');

function loadProfile(id) {
  const raw = JSON.parse(
    fs.readFileSync(path.join(FIXTURES, `sample-profile-${id}.json`), 'utf8')
  );
  const result = validateAndNormalizeInput(raw.answers);
  assert.equal(result.ok, true, result.errors && result.errors.join('; '));
  return { profile: raw, answers: result.answers };
}

function expectScenarioTotals(actual, expected) {
  assert.equal(
    actual.first_planning_year_total,
    expected.first,
    `first_planning_year mismatch: got ${actual.first_planning_year_total}, want ${expected.first}`
  );
  assert.equal(
    actual.program_total,
    expected.program,
    `program_total mismatch: got ${actual.program_total}, want ${expected.program}`
  );
  assert.equal(
    actual.annual_recurring_subtotal,
    expected.recurring,
    `recurring mismatch: got ${actual.annual_recurring_subtotal}, want ${expected.recurring}`
  );
}

describe('Study Major Cost — Profile A (full program)', () => {
  it('matches calculation-trace Profile A Standard/Essential/Comfortable', () => {
    const { answers } = loadProfile('a');
    const costs = calculateCosts(answers);

    assert.equal(costs.rules_version, RULES_VERSION);
    assert.equal(costs.planning_period_type, 'full_program');
    assert.equal(costs.planning_start_year, 1);

    expectScenarioTotals(costs.scenarios.essential, {
      first: 84500,
      program: 333900,
      recurring: 76500,
    });
    expectScenarioTotals(costs.scenarios.standard, {
      first: 90400,
      program: 356200,
      recurring: 79700,
    });
    expectScenarioTotals(costs.scenarios.comfortable, {
      first: 101400,
      program: 397200,
      recurring: 86900,
    });

    // Middle years Standard
    assert.equal(costs.scenarios.standard.year_totals.year_2.total, 87700);
    assert.equal(costs.scenarios.standard.year_totals.year_3.total, 87700);
    assert.equal(costs.scenarios.standard.year_totals.year_4.total, 90400);

    assert.equal(costs.budget_coverage.pressure_level, 'very_high');
    assert.equal(costs.budget_coverage.comparison_standard_total, 90400);
  });
});

describe('Study Major Cost — Profile B (full program)', () => {
  it('matches calculation-trace Profile B', () => {
    const { answers } = loadProfile('b');
    const costs = calculateCosts(answers);

    assert.equal(costs.planning_period_type, 'full_program');

    expectScenarioTotals(costs.scenarios.essential, {
      first: 44200,
      program: 172800,
      recurring: 39200,
    });
    expectScenarioTotals(costs.scenarios.standard, {
      first: 48600,
      program: 189000,
      recurring: 41700,
    });
    expectScenarioTotals(costs.scenarios.comfortable, {
      first: 53900,
      program: 207300,
      recurring: 44500,
    });

    assert.equal(costs.scenarios.standard.year_totals.year_2.total, 45900);
    assert.equal(costs.scenarios.standard.year_totals.year_4.total, 48600);
    assert.equal(costs.budget_coverage.pressure_level, 'very_high');
    assert.equal(costs.budget_coverage.comparison_standard_total, 48600);
  });
});

describe('Study Major Cost — Profile C (remaining program + transfer stress)', () => {
  it('matches calculation-trace Profile C', () => {
    const { answers } = loadProfile('c');
    const costs = calculateCosts(answers);

    assert.equal(costs.planning_period_type, 'remaining_program');
    assert.equal(costs.planning_start_year, 2);

    expectScenarioTotals(costs.scenarios.essential, {
      first: 63800,
      program: 193000,
      recurring: 59100,
    });
    expectScenarioTotals(costs.scenarios.standard, {
      first: 68500,
      program: 208300,
      recurring: 62300,
    });
    expectScenarioTotals(costs.scenarios.comfortable, {
      first: 77800,
      program: 237400,
      recurring: 69500,
    });

    assert.equal(costs.scenarios.standard.year_totals.year_2.total, 68500);
    assert.equal(costs.scenarios.standard.year_totals.year_3.total, 68500);
    assert.equal(costs.scenarios.standard.year_totals.year_4.total, 71300);
    assert.equal(
      costs.scenarios.standard.year_totals.year_1,
      undefined,
      'Year 1 must not be included for remaining program starting at year 2'
    );

    assert.equal(costs.transfer_stress_test.included_in_base_totals, false);
    assert.equal(costs.transfer_stress_test.standard_extra_year_total, 68500);

    assert.equal(costs.budget_coverage.pressure_level, 'very_high');
    assert.equal(costs.budget_coverage.comparison_standard_total, 68500);
  });
});

describe('Validation guards', () => {
  it('rejects non-US country', () => {
    const { profile } = loadProfile('a');
    const bad = { ...profile.answers, target_country: 'UK' };
    const result = validateAndNormalizeInput(bad);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('US')));
  });

  it('rejects non-bachelor degree', () => {
    const { profile } = loadProfile('a');
    const bad = { ...profile.answers, target_degree: 'master' };
    const result = validateAndNormalizeInput(bad);
    assert.equal(result.ok, false);
  });

  it('rejects Q08 none + math together', () => {
    const { profile } = loadProfile('a');
    const bad = {
      ...profile.answers,
      tech_acceptance: ['none', 'math'],
    };
    const result = validateAndNormalizeInput(bad);
    assert.equal(result.ok, false);
  });
});
