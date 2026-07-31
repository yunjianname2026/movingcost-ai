'use strict';

const { RULES_VERSION, SCHEMA_VERSION } = require('./versions');

const ENROLLED_STAGES = new Set(['college_current', 'grad_current']);
const PRE_ENROLL_STAGES = new Set(['high_school', 'graduated', 'working_professional']);

const ALLOWED = {
  current_stage: [
    'high_school',
    'college_current',
    'graduated',
    'grad_current',
    'working_professional',
  ],
  target_degree: ['bachelor'],
  planned_intake: ['within_6mo', '6to12mo', '1to2yr', 'undecided'],
  offer_status: ['has_offer', 'applied_waiting', 'not_applied', 'just_exploring'],
  academic_range: ['top', 'above_average', 'average', 'below_average', 'unsure'],
  strong_subjects: [
    'math',
    'science',
    'language_writing',
    'art_design',
    'social_science',
    'business_econ',
    'computer',
  ],
  english_level: ['fluent', 'proficient', 'intermediate', 'basic'],
  tech_acceptance: ['math', 'programming', 'none'],
  rigor_acceptance: ['fully_accept', 'partially', 'prefer_efficient'],
  transfer_intent: ['considering', 'not_considering', 'already_decided'],
  interest_strengths: [
    'data_analysis',
    'problem_solving',
    'programming_tech',
    'business_sales',
    'writing_expression',
    'design_creative',
    'science_research',
    'communication',
    'organization_mgmt',
    'helping_others',
    'hands_on',
    'content_creation',
  ],
  career_values: [
    'high_income',
    'stability',
    'creativity',
    'social_impact',
    'work_life_balance',
    'global_mobility',
    'entrepreneurship',
    'remote_work',
    'big_company',
    'professional_status',
    'fast_growth',
  ],
  domain_preference: [
    'technical',
    'business',
    'creative',
    'research',
    'service',
    'management',
  ],
  risk_acceptance: ['high', 'medium', 'low'],
  target_country: ['US'],
  target_city_type: ['metro', 'mid_size', 'small_town'],
  priority_top3: ['ranking', 'major', 'employment', 'cost', 'city', 'campus_life'],
  school_type_pref: ['large_research', 'small_teaching', 'no_preference'],
  tuition_position: ['lower_band', 'middle_band', 'upper_band', 'unsure'],
  annual_budget_range: ['lt_30k', '30_45k', '45_60k', '60_80k', 'gt_80k'],
  finance_structure: [
    'family_full',
    'family_plus_scholarship',
    'mainly_scholarship',
    'needs_loan',
  ],
  housing_type: ['campus_or_shared', 'shared_off_campus', 'private_studio_or_1br'],
  car_need: ['no_car', 'may_need_car', 'definitely_need_car'],
  cost_worry: [
    'tuition',
    'housing',
    'healthcare',
    'transport',
    'emergency',
    'international_travel',
  ],
  post_grad_direction: [
    'stay_study_country',
    'return_home',
    'third_country',
    'undecided',
  ],
  relocation_pref: [
    'yes_best_opportunity',
    'yes_prefer_metro',
    'yes_prefer_lower_cost',
    'prefer_not_move_again',
  ],
  upskill_willingness: ['very_willing', 'somewhat', 'not_priority'],
  independence_timeline: [
    'right_after_grad',
    'within_1yr',
    '2to3yr',
    'not_urgent',
  ],
  top_decision_question: [
    'major_uncertain',
    'cost_pressure',
    'city_uncertain',
    'family_disagreement',
    'other',
  ],
  planning_period_type: ['full_program', 'remaining_program'],
};

const TEXT_LIMITS = {
  strength_one_liner: 280,
  current_major: 120,
  offer_or_considered_school_major: 400,
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function fail(errors) {
  const err = new Error(errors.join('; '));
  err.code = 'VALIDATION_ERROR';
  err.errors = errors;
  return err;
}

function requireEnum(answers, key, errors) {
  const v = answers[key];
  if (typeof v !== 'string' || !ALLOWED[key].includes(v)) {
    errors.push(`${key} must be one of: ${ALLOWED[key].join(', ')}`);
  }
}

function requireMulti(answers, key, max, errors, { min = 1 } = {}) {
  const v = answers[key];
  if (!Array.isArray(v)) {
    errors.push(`${key} must be an array`);
    return;
  }
  if (v.length < min || v.length > max) {
    errors.push(`${key} must have ${min}–${max} selection(s)`);
  }
  const seen = new Set();
  for (const item of v) {
    if (typeof item !== 'string' || !ALLOWED[key].includes(item)) {
      errors.push(`${key} contains invalid value: ${String(item)}`);
    }
    if (seen.has(item)) errors.push(`${key} contains duplicate: ${item}`);
    seen.add(item);
  }
}

function boundText(answers, key, errors) {
  const v = answers[key];
  if (v == null || v === '') {
    answers[key] = '';
    return;
  }
  if (typeof v !== 'string') {
    errors.push(`${key} must be a string`);
    return;
  }
  const limit = TEXT_LIMITS[key];
  if (v.length > limit) {
    errors.push(`${key} exceeds max length ${limit}`);
  }
}

/**
 * Validate and normalize questionnaire answers for Study, Major & Cost Planner.
 * @param {unknown} rawAnswers
 * @returns {{ ok: true, answers: object, assumptions: string[] } | { ok: false, errors: string[] }}
 */
function validateAndNormalizeInput(rawAnswers) {
  const errors = [];
  const assumptions = [];

  if (!isPlainObject(rawAnswers)) {
    return { ok: false, errors: ['answers must be an object'] };
  }

  // Shallow clone — never mutate caller input
  const answers = { ...rawAnswers };

  // Scalar country / degree — reject unsupported early
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
  requireMulti(answers, 'tech_acceptance', 2, errors, { min: 1 });
  requireEnum(answers, 'rigor_acceptance', errors);
  requireMulti(answers, 'interest_strengths', 5, errors);
  requireMulti(answers, 'career_values', 3, errors);
  requireEnum(answers, 'domain_preference', errors);
  requireEnum(answers, 'risk_acceptance', errors);
  requireEnum(answers, 'target_city_type', errors);
  requireMulti(answers, 'priority_top3', 3, errors, { min: 3 });
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

  // Q08 none XOR
  if (Array.isArray(answers.tech_acceptance)) {
    const hasNone = answers.tech_acceptance.includes('none');
    const hasOther = answers.tech_acceptance.some((x) => x !== 'none');
    if (hasNone && hasOther) {
      errors.push('tech_acceptance: none is mutually exclusive with math/programming');
    }
  }

  // priority_top3 uniqueness already checked; also require ordered distinct from allowed
  if (Array.isArray(answers.priority_top3)) {
    const uniq = new Set(answers.priority_top3);
    if (uniq.size !== answers.priority_top3.length) {
      errors.push('priority_top3 must be unique ordered values');
    }
  }

  boundText(answers, 'strength_one_liner', errors);
  boundText(answers, 'offer_or_considered_school_major', errors);
  boundText(answers, 'current_major', errors);

  const stage = answers.current_stage;
  const enrolled = ENROLLED_STAGES.has(stage);

  if (enrolled) {
    boundText(answers, 'current_major', errors);
    if (
      typeof answers.transfer_intent !== 'string' ||
      !ALLOWED.transfer_intent.includes(answers.transfer_intent)
    ) {
      errors.push('transfer_intent is required for currently enrolled users');
    }
    const py = answers.program_year;
    if (![1, 2, 3, 4].includes(py) && py !== '4+') {
      // Accept numeric 4 for "4+" as 4
      if (py === '4+' || py === 4) {
        answers.program_year = 4;
      } else {
        errors.push('program_year is required for currently enrolled users (1–4)');
      }
    } else if (py === '4+') {
      answers.program_year = 4;
    } else {
      answers.program_year = Number(py);
    }

    answers.planning_period_type = 'remaining_program';
    answers.planning_start_year = answers.program_year;
  } else if (PRE_ENROLL_STAGES.has(stage) || ALLOWED.current_stage.includes(stage)) {
    answers.program_year = 1;
    answers.planning_period_type = 'full_program';
    answers.planning_start_year = 1;
    if (answers.transfer_intent == null || answers.transfer_intent === '') {
      answers.transfer_intent = 'not_considering';
    } else if (!ALLOWED.transfer_intent.includes(answers.transfer_intent)) {
      errors.push('transfer_intent invalid');
    }
    if (answers.current_major == null) answers.current_major = '';
  }

  // Validate planning fields after normalization
  if (
    answers.planning_period_type &&
    !ALLOWED.planning_period_type.includes(answers.planning_period_type)
  ) {
    errors.push('planning_period_type is invalid');
  }
  if (
    typeof answers.planning_start_year !== 'number' ||
    answers.planning_start_year < 1 ||
    answers.planning_start_year > 4 ||
    !Number.isInteger(answers.planning_start_year)
  ) {
    errors.push('planning_start_year is invalid');
  }

  // housing_type and car_need must both be present as separate enums (already required)

  if (answers.tuition_position === 'unsure') {
    assumptions.push(
      'tuition_position was unsure; cost engine uses middle_band per rules_v3'
    );
  }

  assumptions.push(
    'international_round_trips_per_year fixed to 1 (rules_v3 §5)'
  );
  assumptions.push(`rules_version=${RULES_VERSION}`);
  assumptions.push(`schema_version=${SCHEMA_VERSION}`);

  if (errors.length) return { ok: false, errors };
  return { ok: true, answers, assumptions };
}

module.exports = {
  validateAndNormalizeInput,
  ALLOWED,
  ENROLLED_STAGES,
  TEXT_LIMITS,
};
