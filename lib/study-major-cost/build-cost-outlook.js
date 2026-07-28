'use strict';

const C = require('./constants');
const { RULES_VERSION } = require('./versions');

/**
 * Build schema cost_outlook block strictly from deterministic engine output.
 * Claude must copy these numbers; validation rejects contradictions.
 */
function buildCostOutlookFromEngine(costs, { calculation_trace_ref = '' } = {}) {
  const scenarios = [];
  for (const name of C.SCENARIOS) {
    const s = costs.scenarios[name];
    const firstYearKey = `year_${costs.planning_start_year}`;
    const first = s.year_totals[firstYearKey];
    const li = s.line_items;
    const line_items = [
      { item: 'tuition_fees', amount_usd: li.tuition },
      { item: 'housing', amount_usd: li.housing },
      { item: 'food', amount_usd: li.food },
      { item: 'insurance', amount_usd: li.insurance },
      { item: 'transport', amount_usd: li.transport_base },
      { item: 'car_addon', amount_usd: li.car_addon },
      { item: 'personal_spending', amount_usd: li.personal_spending },
      { item: 'international_travel', amount_usd: li.international_travel },
    ];
    if (first.one_time > 0) {
      line_items.push(
        {
          item: 'initial_visa_admin',
          amount_usd: C.INITIAL_VISA_ADMIN[name],
        },
        {
          item: 'initial_setup_equipment',
          amount_usd: C.INITIAL_SETUP_EQUIPMENT[name],
        },
        {
          item: 'arrival_relocation_setup',
          amount_usd: C.ARRIVAL_RELOCATION_SETUP[name],
        }
      );
    }
    if (first.graduation_reserve > 0) {
      line_items.push({
        item: 'graduation_relocation_reserve',
        amount_usd: first.graduation_reserve,
      });
    }
    const bufferAmount = Math.round(
      first.subtotal_before_buffer * C.EMERGENCY_BUFFER_PCT[name]
    );
    line_items.push({ item: 'emergency_buffer', amount_usd: bufferAmount });

    scenarios.push({
      scenario_name: name,
      annual_total_usd: s.first_planning_year_total,
      line_items,
    });
  }

  return {
    currency: 'USD',
    planning_period_type: costs.planning_period_type,
    planning_start_year: costs.planning_start_year,
    scenarios,
    annual_total_by_scenario: {
      essential: costs.scenarios.essential.first_planning_year_total,
      standard: costs.scenarios.standard.first_planning_year_total,
      comfortable: costs.scenarios.comfortable.first_planning_year_total,
    },
    program_total_by_scenario: {
      essential: costs.scenarios.essential.program_total,
      standard: costs.scenarios.standard.program_total,
      comfortable: costs.scenarios.comfortable.program_total,
      years_covered: costs.scenarios.standard.years_included.length,
    },
    family_budget_gap: '', // filled by narrative layer / Claude
    top_overspend_items: [],
    top_savings_items: [],
    rules_version_used: RULES_VERSION,
    calculation_trace_ref,
  };
}

module.exports = { buildCostOutlookFromEngine };
