'use strict';

const C = require('./constants');
const { RULES_VERSION } = require('./versions');
const { ENROLLED_STAGES } = require('./validate-input');

function roundToHundred(n) {
  return Math.round(n / 100) * 100;
}

function resolveTuitionPosition(pos) {
  if (!pos || pos === 'unsure') return 'middle_band';
  return pos;
}

function carAddon(carNeed, scenario) {
  if (carNeed === 'definitely_need_car') return C.CAR_ADDON[scenario];
  if (carNeed === 'may_need_car' && scenario === 'comfortable') {
    return C.CAR_ADDON[scenario];
  }
  return 0;
}

function annualRecurring(input, scenario) {
  const tier = C.CITY_TIER[input.target_city_type];
  const tuitionPos = resolveTuitionPosition(input.tuition_position);
  const tuition = C.TUITION_BACHELOR[tuitionPos];
  const housing = C.HOUSING[tier][input.housing_type];
  const food = C.FOOD[tier][scenario];
  const insurance = C.INSURANCE[scenario];
  const transport = C.TRANSPORT_BASE[tier][scenario];
  const car = carAddon(input.car_need, scenario);
  const personal = C.PERSONAL[tier][scenario];
  const travel =
    C.INTERNATIONAL_ROUND_TRIPS_PER_YEAR * C.TRAVEL_PER_TRIP[scenario];

  const line_items = {
    tuition,
    housing,
    food,
    insurance,
    transport_base: transport,
    car_addon: car,
    personal_spending: personal,
    international_travel: travel,
  };

  const subtotal =
    tuition +
    housing +
    food +
    insurance +
    transport +
    car +
    personal +
    travel;

  return { line_items, subtotal };
}

function yearSubtotal(recurringSubtotal, scenario, yearKind) {
  let oneTime = 0;
  let gradReserve = 0;
  if (yearKind === 'year1') {
    oneTime =
      C.INITIAL_VISA_ADMIN[scenario] +
      C.INITIAL_SETUP_EQUIPMENT[scenario] +
      C.ARRIVAL_RELOCATION_SETUP[scenario];
  }
  if (yearKind === 'final') {
    gradReserve = C.GRADUATION_RELOCATION_RESERVE[scenario];
  }
  return {
    subtotal: recurringSubtotal + oneTime + gradReserve,
    one_time: oneTime,
    graduation_reserve: gradReserve,
  };
}

function applyBuffer(subtotal, scenario) {
  const withBuffer = subtotal * (1 + C.EMERGENCY_BUFFER_PCT[scenario]);
  return {
    raw: withBuffer,
    total: roundToHundred(withBuffer),
  };
}

function yearKindForProgramYear(programYear, totalYears) {
  if (programYear === 1) return 'year1';
  if (programYear === totalYears) return 'final';
  return 'middle';
}

function budgetPressure(annualBudgetRange, comparisonStandardTotal) {
  const bounds = C.BUDGET_BOUNDS[annualBudgetRange];
  const S = comparisonStandardTotal;
  const { f_low: F_low, f_high: F_high } = bounds;

  let level;
  if (F_high < S) level = 'very_high';
  else if (F_low < S && S <= F_high && F_high < S * 1.15) level = 'high';
  else if (F_low < S && S <= F_high && F_high >= S * 1.15) level = 'moderate';
  else if (F_low >= S) level = 'low';
  else level = 'very_high'; // defensive fallback

  return {
    level,
    comparison_year_standard_total: S,
    f_low: F_low,
    f_high: F_high,
  };
}

/**
 * Pure deterministic cost engine. Never calls Claude.
 * @param {object} answers — validated/normalized answers
 * @returns {object} cost result + calculation_trace
 */
function calculateCosts(answers) {
  const assumptions = [
    'All amounts are prototype fixed-point assumptions (rules_v3), not verified school quotes.',
    'international_round_trips_per_year = 1',
    'Amounts rounded to nearest $100 after emergency buffer',
  ];

  if (answers.tuition_position === 'unsure') {
    assumptions.push('tuition_position unsure → middle_band');
  }

  const enrolled = ENROLLED_STAGES.has(answers.current_stage);
  const planningPeriodType = enrolled ? 'remaining_program' : 'full_program';
  const startYear = enrolled ? Number(answers.program_year) : 1;
  const totalYears = C.BACHELOR_YEARS;

  const scenarios = {};
  const recurringByScenario = {};

  for (const scenario of C.SCENARIOS) {
    const recurring = annualRecurring(answers, scenario);
    recurringByScenario[scenario] = recurring;

    const yearTotals = {};
    let programTotal = 0;
    const yearsIncluded = [];

    for (let y = startYear; y <= totalYears; y++) {
      const kind = yearKindForProgramYear(y, totalYears);
      const { subtotal, one_time, graduation_reserve } = yearSubtotal(
        recurring.subtotal,
        scenario,
        kind
      );
      const { total, raw } = applyBuffer(subtotal, scenario);
      yearTotals[`year_${y}`] = {
        year: y,
        kind,
        recurring_subtotal: recurring.subtotal,
        one_time,
        graduation_reserve,
        subtotal_before_buffer: subtotal,
        buffer_pct: C.EMERGENCY_BUFFER_PCT[scenario],
        total_raw: raw,
        total,
      };
      programTotal += total;
      yearsIncluded.push(y);
    }

    const firstPlanningYear = yearTotals[`year_${startYear}`];

    scenarios[scenario] = {
      annual_recurring: recurring,
      year_totals: yearTotals,
      first_planning_year_total: firstPlanningYear.total,
      program_total: programTotal,
      years_included: yearsIncluded,
    };
  }

  // Transfer stress test: middle-year Standard recurring × buffer (always computed; disclosed separately)
  const stdRecurring = recurringByScenario.standard.subtotal;
  const transferStressRaw =
    stdRecurring * (1 + C.EMERGENCY_BUFFER_PCT.standard);
  const transferStressTotal = roundToHundred(transferStressRaw);

  const pressure = budgetPressure(
    answers.annual_budget_range,
    scenarios.standard.first_planning_year_total
  );

  const tier = C.CITY_TIER[answers.target_city_type];
  const tuitionPos = resolveTuitionPosition(answers.tuition_position);

  const calculation_trace = {
    rules_version: RULES_VERSION,
    inputs: {
      target_degree: answers.target_degree,
      tuition_position_input: answers.tuition_position,
      tuition_position_used: tuitionPos,
      tuition_annual: C.TUITION_BACHELOR[tuitionPos],
      target_city_type: answers.target_city_type,
      city_tier: tier,
      housing_type: answers.housing_type,
      housing_annual: C.HOUSING[tier][answers.housing_type],
      car_need: answers.car_need,
      international_round_trips_per_year: C.INTERNATIONAL_ROUND_TRIPS_PER_YEAR,
      program_year: answers.program_year,
      planning_period_type: planningPeriodType,
      planning_start_year: startYear,
      annual_budget_range: answers.annual_budget_range,
    },
    scenarios: Object.fromEntries(
      C.SCENARIOS.map((s) => [
        s,
        {
          recurring_subtotal: scenarios[s].annual_recurring.subtotal,
          line_items: scenarios[s].annual_recurring.line_items,
          year_totals: Object.fromEntries(
            Object.entries(scenarios[s].year_totals).map(([k, v]) => [
              k,
              {
                kind: v.kind,
                subtotal_before_buffer: v.subtotal_before_buffer,
                total: v.total,
              },
            ])
          ),
          first_planning_year_total: scenarios[s].first_planning_year_total,
          program_total: scenarios[s].program_total,
        },
      ])
    ),
    transfer_stress_test: {
      included_in_base_totals: false,
      scenario: 'standard',
      recurring_subtotal: stdRecurring,
      total_raw: transferStressRaw,
      total: transferStressTotal,
    },
    budget_pressure: pressure,
  };

  return {
    rules_version: RULES_VERSION,
    currency: 'USD',
    planning_period_type: planningPeriodType,
    planning_start_year: startYear,
    bachelor_years: totalYears,
    assumptions,
    scenarios: {
      essential: {
        first_planning_year_total: scenarios.essential.first_planning_year_total,
        program_total: scenarios.essential.program_total,
        year_totals: scenarios.essential.year_totals,
        years_included: scenarios.essential.years_included,
        annual_recurring_subtotal: scenarios.essential.annual_recurring.subtotal,
        line_items: scenarios.essential.annual_recurring.line_items,
      },
      standard: {
        first_planning_year_total: scenarios.standard.first_planning_year_total,
        program_total: scenarios.standard.program_total,
        year_totals: scenarios.standard.year_totals,
        years_included: scenarios.standard.years_included,
        annual_recurring_subtotal: scenarios.standard.annual_recurring.subtotal,
        line_items: scenarios.standard.annual_recurring.line_items,
      },
      comfortable: {
        first_planning_year_total:
          scenarios.comfortable.first_planning_year_total,
        program_total: scenarios.comfortable.program_total,
        year_totals: scenarios.comfortable.year_totals,
        years_included: scenarios.comfortable.years_included,
        annual_recurring_subtotal:
          scenarios.comfortable.annual_recurring.subtotal,
        line_items: scenarios.comfortable.annual_recurring.line_items,
      },
    },
    transfer_stress_test: {
      included_in_base_totals: false,
      standard_extra_year_total: transferStressTotal,
    },
    budget_coverage: {
      pressure_level: pressure.level,
      comparison_standard_total: pressure.comparison_year_standard_total,
      f_low: pressure.f_low,
      f_high: pressure.f_high,
    },
    calculation_trace,
  };
}

module.exports = {
  calculateCosts,
  roundToHundred,
  annualRecurring,
  resolveTuitionPosition,
};
