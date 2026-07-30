(function (global) {
  'use strict';

  var RULES_VERSION = 'rules_v3_prototype_deterministic';
  var SCHEMA_VERSION = 'v3';
  var PRODUCT_VERSION = 'study-major-cost-mvp-phase2';

  var SCENARIOS = ['essential', 'standard', 'comfortable'];

  var CITY_TIER = { metro: 'A', mid_size: 'B', small_town: 'C' };

  var HOUSING = {
    A: { campus_or_shared: 10800, shared_off_campus: 14400, private_studio_or_1br: 19800 },
    B: { campus_or_shared: 6600, shared_off_campus: 9000, private_studio_or_1br: 12600 },
    C: { campus_or_shared: 4200, shared_off_campus: 5700, private_studio_or_1br: 8100 },
  };

  var CAR_ADDON = { essential: 2400, standard: 3000, comfortable: 3600 };

  var TRANSPORT_BASE = {
    A: { essential: 900, standard: 1200, comfortable: 1600 },
    B: { essential: 600, standard: 800, comfortable: 1000 },
    C: { essential: 300, standard: 500, comfortable: 700 },
  };

  var FOOD = {
    A: { essential: 4800, standard: 6000, comfortable: 7200 },
    B: { essential: 3600, standard: 4500, comfortable: 5400 },
    C: { essential: 3000, standard: 3600, comfortable: 4200 },
  };

  var INSURANCE = { essential: 1800, standard: 2400, comfortable: 3200 };

  var PERSONAL = {
    A: { essential: 2400, standard: 3300, comfortable: 4200 },
    B: { essential: 1800, standard: 2400, comfortable: 3000 },
    C: { essential: 1500, standard: 1950, comfortable: 2400 },
  };

  var TRAVEL_PER_TRIP = { essential: 800, standard: 1000, comfortable: 1300 };
  var INTERNATIONAL_ROUND_TRIPS_PER_YEAR = 1;

  var TUITION_BACHELOR = { lower_band: 24000, middle_band: 34000, upper_band: 46000 };

  var INITIAL_VISA_ADMIN = { essential: 500, standard: 700, comfortable: 1000 };
  var INITIAL_SETUP_EQUIPMENT = { essential: 700, standard: 1000, comfortable: 1400 };
  var ARRIVAL_RELOCATION_SETUP = { essential: 500, standard: 800, comfortable: 1200 };
  var GRADUATION_RELOCATION_RESERVE = { essential: 1500, standard: 2500, comfortable: 3500 };

  var EMERGENCY_BUFFER_PCT = { essential: 0.08, standard: 0.1, comfortable: 0.12 };

  var BUDGET_BOUNDS = {
    lt_30k: { f_low: 0, f_high: 30000 },
    '30_45k': { f_low: 30000, f_high: 45000 },
    '45_60k': { f_low: 45000, f_high: 60000 },
    '60_80k': { f_low: 60000, f_high: 80000 },
    gt_80k: { f_low: 80000, f_high: 999999 },
  };

  var BACHELOR_YEARS = 4;

  var ENROLLED_STAGES = { college_current: true, grad_current: true };
  var PRE_ENROLL_STAGES = { high_school: true, graduated: true, working_professional: true };

  var ALLOWED = {
    current_stage: ['high_school', 'college_current', 'graduated', 'grad_current', 'working_professional'],
    target_degree: ['bachelor'],
    planned_intake: ['within_6mo', '6to12mo', '1to2yr', 'undecided'],
    offer_status: ['has_offer', 'applied_waiting', 'not_applied', 'just_exploring'],
    academic_range: ['top', 'above_average', 'average', 'below_average', 'unsure'],
    strong_subjects: ['math', 'science', 'language_writing', 'art_design', 'social_science', 'business_econ', 'computer'],
    english_level: ['fluent', 'proficient', 'intermediate', 'basic'],
    tech_acceptance: ['math', 'programming', 'none'],
    rigor_acceptance: ['fully_accept', 'partially', 'prefer_efficient'],
    transfer_intent: ['considering', 'not_considering', 'already_decided'],
    interest_strengths: [
      'data_analysis', 'problem_solving', 'programming_tech', 'business_sales', 'writing_expression',
      'design_creative', 'science_research', 'communication', 'organization_mgmt', 'helping_others',
      'hands_on', 'content_creation',
    ],
    career_values: [
      'high_income', 'stability', 'creativity', 'social_impact', 'work_life_balance', 'global_mobility',
      'entrepreneurship', 'remote_work', 'big_company', 'professional_status', 'fast_growth',
    ],
    domain_preference: ['technical', 'business', 'creative', 'research', 'service', 'management'],
    risk_acceptance: ['high', 'medium', 'low'],
    target_country: ['US'],
    target_city_type: ['metro', 'mid_size', 'small_town'],
    priority_top3: ['ranking', 'major', 'employment', 'cost', 'city', 'campus_life'],
    school_type_pref: ['large_research', 'small_teaching', 'no_preference'],
    tuition_position: ['lower_band', 'middle_band', 'upper_band', 'unsure'],
    annual_budget_range: ['lt_30k', '30_45k', '45_60k', '60_80k', 'gt_80k'],
    finance_structure: ['family_full', 'family_plus_scholarship', 'mainly_scholarship', 'needs_loan'],
    housing_type: ['campus_or_shared', 'shared_off_campus', 'private_studio_or_1br'],
    car_need: ['no_car', 'may_need_car', 'definitely_need_car'],
    cost_worry: ['tuition', 'housing', 'healthcare', 'transport', 'emergency', 'international_travel'],
    post_grad_direction: ['stay_study_country', 'return_home', 'third_country', 'undecided'],
    relocation_pref: ['yes_best_opportunity', 'yes_prefer_metro', 'yes_prefer_lower_cost', 'prefer_not_move_again'],
    upskill_willingness: ['very_willing', 'somewhat', 'not_priority'],
    independence_timeline: ['right_after_grad', 'within_1yr', '2to3yr', 'not_urgent'],
    top_decision_question: ['major_uncertain', 'cost_pressure', 'city_uncertain', 'family_disagreement', 'other'],
    planning_period_type: ['full_program', 'remaining_program'],
  };

  var TEXT_LIMITS = {
    strength_one_liner: 280,
    current_major: 120,
    offer_or_considered_school_major: 400,
  };

  function roundToHundred(n) {
    return Math.round(n / 100) * 100;
  }

  function resolveTuitionPosition(pos) {
    if (!pos || pos === 'unsure') return 'middle_band';
    return pos;
  }

  function carAddon(carNeed, scenario) {
    if (carNeed === 'definitely_need_car') return CAR_ADDON[scenario];
    if (carNeed === 'may_need_car' && scenario === 'comfortable') return CAR_ADDON[scenario];
    return 0;
  }

  function annualRecurring(input, scenario) {
    var tier = CITY_TIER[input.target_city_type];
    var tuitionPos = resolveTuitionPosition(input.tuition_position);
    var tuition = TUITION_BACHELOR[tuitionPos];
    var housing = HOUSING[tier][input.housing_type];
    var food = FOOD[tier][scenario];
    var insurance = INSURANCE[scenario];
    var transport = TRANSPORT_BASE[tier][scenario];
    var car = carAddon(input.car_need, scenario);
    var personal = PERSONAL[tier][scenario];
    var travel = INTERNATIONAL_ROUND_TRIPS_PER_YEAR * TRAVEL_PER_TRIP[scenario];

    var line_items = {
      tuition: tuition,
      housing: housing,
      food: food,
      insurance: insurance,
      transport_base: transport,
      car_addon: car,
      personal_spending: personal,
      international_travel: travel,
    };

    var subtotal = tuition + housing + food + insurance + transport + car + personal + travel;
    return { line_items: line_items, subtotal: subtotal };
  }

  function yearSubtotal(recurringSubtotal, scenario, yearKind) {
    var oneTime = 0;
    var gradReserve = 0;
    if (yearKind === 'year1') {
      oneTime =
        INITIAL_VISA_ADMIN[scenario] +
        INITIAL_SETUP_EQUIPMENT[scenario] +
        ARRIVAL_RELOCATION_SETUP[scenario];
    }
    if (yearKind === 'final') {
      gradReserve = GRADUATION_RELOCATION_RESERVE[scenario];
    }
    return { subtotal: recurringSubtotal + oneTime + gradReserve, one_time: oneTime, graduation_reserve: gradReserve };
  }

  function applyBuffer(subtotal, scenario) {
    var withBuffer = subtotal * (1 + EMERGENCY_BUFFER_PCT[scenario]);
    return { raw: withBuffer, total: roundToHundred(withBuffer) };
  }

  function yearKindForProgramYear(programYear, totalYears) {
    if (programYear === 1) return 'year1';
    if (programYear === totalYears) return 'final';
    return 'middle';
  }

  function budgetPressure(annualBudgetRange, comparisonStandardTotal) {
    var bounds = BUDGET_BOUNDS[annualBudgetRange];
    var S = comparisonStandardTotal;
    var F_low = bounds.f_low;
    var F_high = bounds.f_high;
    var level;
    if (F_high < S) level = 'very_high';
    else if (F_low < S && S <= F_high && F_high < S * 1.15) level = 'high';
    else if (F_low < S && S <= F_high && F_high >= S * 1.15) level = 'moderate';
    else if (F_low >= S) level = 'low';
    else level = 'very_high';
    return { level: level, comparison_year_standard_total: S, f_low: F_low, f_high: F_high };
  }

  function calculateCosts(answers) {
    var assumptions = [
      'All amounts are prototype fixed-point assumptions (rules_v3), not verified school quotes.',
      'international_round_trips_per_year = 1',
      'Amounts rounded to nearest $100 after emergency buffer',
    ];

    if (answers.tuition_position === 'unsure') {
      assumptions.push('tuition_position unsure → middle_band');
    }

    var enrolled = !!ENROLLED_STAGES[answers.current_stage];
    var planningPeriodType = enrolled ? 'remaining_program' : 'full_program';
    var startYear = enrolled ? Number(answers.program_year) : 1;
    var totalYears = BACHELOR_YEARS;

    var scenarios = {};
    var recurringByScenario = {};

    for (var si = 0; si < SCENARIOS.length; si++) {
      var scenario = SCENARIOS[si];
      var recurring = annualRecurring(answers, scenario);
      recurringByScenario[scenario] = recurring;

      var yearTotals = {};
      var programTotal = 0;
      var yearsIncluded = [];

      for (var y = startYear; y <= totalYears; y++) {
        var kind = yearKindForProgramYear(y, totalYears);
        var ys = yearSubtotal(recurring.subtotal, scenario, kind);
        var buf = applyBuffer(ys.subtotal, scenario);
        yearTotals['year_' + y] = {
          year: y,
          kind: kind,
          recurring_subtotal: recurring.subtotal,
          one_time: ys.one_time,
          graduation_reserve: ys.graduation_reserve,
          subtotal_before_buffer: ys.subtotal,
          buffer_pct: EMERGENCY_BUFFER_PCT[scenario],
          total_raw: buf.raw,
          total: buf.total,
        };
        programTotal += buf.total;
        yearsIncluded.push(y);
      }

      var firstPlanningYear = yearTotals['year_' + startYear];

      scenarios[scenario] = {
        annual_recurring: recurring,
        year_totals: yearTotals,
        first_planning_year_total: firstPlanningYear.total,
        program_total: programTotal,
        years_included: yearsIncluded,
      };
    }

    var stdRecurring = recurringByScenario.standard.subtotal;
    var transferStressRaw = stdRecurring * (1 + EMERGENCY_BUFFER_PCT.standard);
    var transferStressTotal = roundToHundred(transferStressRaw);

    var pressure = budgetPressure(answers.annual_budget_range, scenarios.standard.first_planning_year_total);

    return {
      rules_version: RULES_VERSION,
      currency: 'USD',
      planning_period_type: planningPeriodType,
      planning_start_year: startYear,
      bachelor_years: totalYears,
      assumptions: assumptions,
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
          first_planning_year_total: scenarios.comfortable.first_planning_year_total,
          program_total: scenarios.comfortable.program_total,
          year_totals: scenarios.comfortable.year_totals,
          years_included: scenarios.comfortable.years_included,
          annual_recurring_subtotal: scenarios.comfortable.annual_recurring.subtotal,
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
    };
  }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function requireEnum(answers, key, errors) {
    var v = answers[key];
    if (typeof v !== 'string' || ALLOWED[key].indexOf(v) === -1) {
      errors.push(key + ' must be one of: ' + ALLOWED[key].join(', '));
    }
  }

  function requireMulti(answers, key, max, errors, min) {
    min = min == null ? 1 : min;
    var v = answers[key];
    if (!Array.isArray(v)) {
      errors.push(key + ' must be an array');
      return;
    }
    if (v.length < min || v.length > max) {
      errors.push(key + ' must have ' + min + '–' + max + ' selection(s)');
    }
    var seen = {};
    for (var i = 0; i < v.length; i++) {
      var item = v[i];
      if (typeof item !== 'string' || ALLOWED[key].indexOf(item) === -1) {
        errors.push(key + ' contains invalid value: ' + String(item));
      }
      if (seen[item]) errors.push(key + ' contains duplicate: ' + item);
      seen[item] = true;
    }
  }

  function boundText(answers, key, errors) {
    var v = answers[key];
    if (v == null || v === '') {
      answers[key] = '';
      return;
    }
    if (typeof v !== 'string') {
      errors.push(key + ' must be a string');
      return;
    }
    var limit = TEXT_LIMITS[key];
    if (limit && v.length > limit) {
      errors.push(key + ' exceeds max length ' + limit);
    }
  }

  function validateClientAnswers(rawAnswers) {
    var errors = [];
    var assumptions = [];

    if (!isPlainObject(rawAnswers)) {
      return { ok: false, errors: ['answers must be an object'] };
    }

    var answers = {};
    var k;
    for (k in rawAnswers) {
      if (Object.prototype.hasOwnProperty.call(rawAnswers, k)) answers[k] = rawAnswers[k];
    }

    if (typeof answers.target_country !== 'string') {
      errors.push('target_country must be a scalar string');
    } else if (answers.target_country !== 'US') {
      errors.push('target_country must be US (MVP scope)');
    }

    if (typeof answers.target_degree !== 'string') {
      errors.push('target_degree must be a scalar string');
    } else if (answers.target_degree !== 'bachelor') {
      errors.push('target_degree must be bachelor (MVP scope)');
    }

    requireEnum(answers, 'current_stage', errors);
    requireEnum(answers, 'planned_intake', errors);
    requireEnum(answers, 'offer_status', errors);
    requireEnum(answers, 'academic_range', errors);
    requireMulti(answers, 'strong_subjects', 3, errors);
    requireEnum(answers, 'english_level', errors);
    requireMulti(answers, 'tech_acceptance', 2, errors, 1);
    requireEnum(answers, 'rigor_acceptance', errors);
    requireMulti(answers, 'interest_strengths', 5, errors);
    requireMulti(answers, 'career_values', 3, errors);
    requireEnum(answers, 'domain_preference', errors);
    requireEnum(answers, 'risk_acceptance', errors);
    requireEnum(answers, 'target_city_type', errors);
    requireMulti(answers, 'priority_top3', 3, errors, 3);
    requireEnum(answers, 'school_type_pref', errors);
    requireEnum(answers, 'tuition_position', errors);
    requireEnum(answers, 'annual_budget_range', errors);
    requireEnum(answers, 'finance_structure', errors);
    requireEnum(answers, 'housing_type', errors);
    requireEnum(answers, 'car_need', errors);
    requireMulti(answers, 'cost_worry', 2, errors);
    requireEnum(answers, 'post_grad_direction', errors);
    requireEnum(answers, 'relocation_pref', errors);
    requireEnum(answers, 'upskill_willingness', errors);
    requireEnum(answers, 'independence_timeline', errors);
    requireEnum(answers, 'top_decision_question', errors);

    if (Array.isArray(answers.tech_acceptance)) {
      var hasNone = answers.tech_acceptance.indexOf('none') !== -1;
      var hasOther = false;
      for (var ti = 0; ti < answers.tech_acceptance.length; ti++) {
        if (answers.tech_acceptance[ti] !== 'none') hasOther = true;
      }
      if (hasNone && hasOther) {
        errors.push('tech_acceptance: none is mutually exclusive with math/programming');
      }
    }

    if (Array.isArray(answers.priority_top3)) {
      var uniq = {};
      for (var pi = 0; pi < answers.priority_top3.length; pi++) uniq[answers.priority_top3[pi]] = true;
      if (Object.keys(uniq).length !== answers.priority_top3.length) {
        errors.push('priority_top3 must be unique ordered values');
      }
    }

    boundText(answers, 'strength_one_liner', errors);
    boundText(answers, 'offer_or_considered_school_major', errors);
    boundText(answers, 'current_major', errors);

    var stage = answers.current_stage;
    var enrolled = !!ENROLLED_STAGES[stage];

    if (enrolled) {
      if (!answers.current_major || !String(answers.current_major).trim()) {
        errors.push('current_major is required for currently enrolled users');
      }
      if (typeof answers.transfer_intent !== 'string' || ALLOWED.transfer_intent.indexOf(answers.transfer_intent) === -1) {
        errors.push('transfer_intent is required for currently enrolled users');
      }
      var py = answers.program_year;
      if ([1, 2, 3, 4].indexOf(py) === -1 && py !== '4+') {
        if (py === '4+' || py === 4) answers.program_year = 4;
        else errors.push('program_year is required for currently enrolled users (1–4)');
      } else if (py === '4+') {
        answers.program_year = 4;
      } else {
        answers.program_year = Number(py);
      }
      answers.planning_period_type = 'remaining_program';
      answers.planning_start_year = answers.program_year;
    } else if (PRE_ENROLL_STAGES[stage] || ALLOWED.current_stage.indexOf(stage) !== -1) {
      answers.program_year = 1;
      answers.planning_period_type = 'full_program';
      answers.planning_start_year = 1;
      if (answers.transfer_intent == null || answers.transfer_intent === '') {
        answers.transfer_intent = 'not_considering';
      } else if (ALLOWED.transfer_intent.indexOf(answers.transfer_intent) === -1) {
        errors.push('transfer_intent invalid');
      }
      if (answers.current_major == null) answers.current_major = '';
    }

    if (answers.offer_status === 'has_offer') {
      if (!answers.offer_or_considered_school_major || !String(answers.offer_or_considered_school_major).trim()) {
        errors.push('offer_or_considered_school_major is required when offer_status is has_offer');
      }
    }

    if (answers.tuition_position === 'unsure') {
      assumptions.push('tuition_position was unsure; cost engine uses middle_band per rules_v3');
    }

    assumptions.push('international_round_trips_per_year fixed to 1 (rules_v3 §5)');
    assumptions.push('rules_version=' + RULES_VERSION);
    assumptions.push('schema_version=' + SCHEMA_VERSION);

    if (errors.length) return { ok: false, errors: errors };
    return { ok: true, answers: answers, assumptions: assumptions };
  }

  global.SMC = {
    calculateCosts: calculateCosts,
    validateClientAnswers: validateClientAnswers,
    RULES_VERSION: RULES_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    PRODUCT_VERSION: PRODUCT_VERSION,
  };
})(typeof window !== 'undefined' ? window : globalThis);
