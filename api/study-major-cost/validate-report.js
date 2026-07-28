'use strict';

const fs = require('fs');
const path = require('path');
const C = require('../../lib/study-major-cost/constants');
const { RULES_VERSION, SCHEMA_VERSION } = require('../../lib/study-major-cost/versions');

let cachedSchema = null;

function loadSchema() {
  if (cachedSchema) return cachedSchema;
  const p = path.join(__dirname, 'schema-v3.json');
  cachedSchema = JSON.parse(fs.readFileSync(p, 'utf8'));
  return cachedSchema;
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/**
 * Lightweight JSON Schema subset validator (draft-ish) for Schema v3.
 * Enforces: type, const, enum, required, additionalProperties:false,
 * min/maxItems, min/maxLength, minimum, integer.
 */
function validateAgainstSchema(data, schema, pointer = '$') {
  const errors = [];

  if (schema.const !== undefined) {
    if (data !== schema.const) {
      errors.push(`${pointer}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
    }
    return errors;
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${pointer}: value not in enum`);
    return errors;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(data);
    const ok = types.some((t) => {
      if (t === 'integer') return Number.isInteger(data);
      if (t === 'number') return typeof data === 'number' && !Number.isNaN(data);
      if (t === 'object') return actual === 'object';
      return actual === t;
    });
    if (!ok) {
      errors.push(`${pointer}: expected type ${types.join('|')}, got ${actual}`);
      return errors;
    }
  }

  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${pointer}: below minimum ${schema.minimum}`);
    }
  }

  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push(`${pointer}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push(`${pointer}: exceeds maxLength ${schema.maxLength}`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${pointer}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(`${pointer}: more than maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      data.forEach((item, i) => {
        errors.push(...validateAgainstSchema(item, schema.items, `${pointer}[${i}]`));
      });
    }
  }

  if (typeOf(data) === 'object' && schema.properties) {
    if (schema.required) {
      for (const key of schema.required) {
        if (data[key] === undefined) {
          errors.push(`${pointer}: missing required property "${key}"`);
        }
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!schema.properties[key]) {
          errors.push(`${pointer}: undeclared field "${key}"`);
        }
      }
    }
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (data[key] !== undefined) {
        errors.push(
          ...validateAgainstSchema(data[key], propSchema, `${pointer}.${key}`)
        );
      }
    }
  }

  return errors;
}

/**
 * Verify deterministic money fields match engine output.
 */
function verifyCostAlignment(report, costs) {
  const errors = [];
  const co = report.cost_outlook;
  if (!co) {
    errors.push('missing cost_outlook');
    return errors;
  }

  if (co.rules_version_used !== RULES_VERSION) {
    errors.push(`rules_version_used must be ${RULES_VERSION}`);
  }
  if (co.planning_period_type !== costs.planning_period_type) {
    errors.push('planning_period_type mismatch vs deterministic engine');
  }
  if (co.planning_start_year !== costs.planning_start_year) {
    errors.push('planning_start_year mismatch vs deterministic engine');
  }

  const annual = co.annual_total_by_scenario || {};
  for (const name of C.SCENARIOS) {
    if (annual[name] !== costs.scenarios[name].first_planning_year_total) {
      errors.push(
        `annual_total_by_scenario.${name}: AI ${annual[name]} !== engine ${costs.scenarios[name].first_planning_year_total}`
      );
    }
  }

  const prog = co.program_total_by_scenario || {};
  for (const name of C.SCENARIOS) {
    if (prog[name] !== costs.scenarios[name].program_total) {
      errors.push(
        `program_total_by_scenario.${name}: AI ${prog[name]} !== engine ${costs.scenarios[name].program_total}`
      );
    }
  }

  if (Array.isArray(co.scenarios)) {
    for (const sc of co.scenarios) {
      const eng = costs.scenarios[sc.scenario_name];
      if (!eng) {
        errors.push(`unknown scenario ${sc.scenario_name}`);
        continue;
      }
      if (sc.annual_total_usd !== eng.first_planning_year_total) {
        errors.push(
          `scenarios[${sc.scenario_name}].annual_total_usd mismatch`
        );
      }
    }
  }

  if (
    report.decision_summary &&
    report.decision_summary.budget_pressure_level !==
      costs.budget_coverage.pressure_level
  ) {
    errors.push(
      `budget_pressure_level ${report.decision_summary.budget_pressure_level} !== engine ${costs.budget_coverage.pressure_level}`
    );
  }

  return errors;
}

function verifyFixedConstraints(report) {
  const errors = [];
  if (!report.report_meta || report.report_meta.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  }
  if (
    !report.cost_outlook ||
    report.cost_outlook.rules_version_used !== RULES_VERSION
  ) {
    errors.push(`rules_version_used must be ${RULES_VERSION}`);
  }
  if (
    !report.education_value ||
    report.education_value.financial_roi_assessed !== false
  ) {
    errors.push('financial_roi_assessed must be false');
  }
  if (
    !report.mobility_outlook ||
    report.mobility_outlook.feasibility_confidence !== 'not_assessed'
  ) {
    errors.push('feasibility_confidence must be not_assessed');
  }
  if (
    !report.decision_summary ||
    report.decision_summary.career_feasibility_confidence !== 'not_assessed'
  ) {
    errors.push('career_feasibility_confidence must be not_assessed');
  }
  if (report.disclaimer !== C.DISCLAIMER_REQUIRED) {
    errors.push('disclaimer must match required constant');
  }
  if (
    report.mobility_outlook &&
    report.mobility_outlook.work_authorization_assumption !==
      C.WORK_AUTHORIZATION_ASSUMPTION
  ) {
    errors.push('work_authorization_assumption must match required constant');
  }
  if (Array.isArray(report.recommended_paths)) {
    for (const [i, p] of report.recommended_paths.entries()) {
      if (p.market_claim_disclaimer !== C.MARKET_CLAIM_DISCLAIMER) {
        errors.push(`recommended_paths[${i}].market_claim_disclaimer mismatch`);
      }
    }
  }
  return errors;
}

/**
 * Full report validation after Claude structured output.
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
function validateReport(report, costs) {
  const schema = loadSchema();
  const errors = [
    ...validateAgainstSchema(report, schema),
    ...verifyFixedConstraints(report),
    ...verifyCostAlignment(report, costs),
  ];
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

module.exports = {
  validateReport,
  validateAgainstSchema,
  verifyFixedConstraints,
  verifyCostAlignment,
  loadSchema,
};
