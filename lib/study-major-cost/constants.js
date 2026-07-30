'use strict';

/** Fixed point tables for rules_v3_prototype_deterministic. Prototype assumptions only. */

const SCENARIOS = ['essential', 'standard', 'comfortable'];

const CITY_TIER = {
  metro: 'A',
  mid_size: 'B',
  small_town: 'C',
};

const HOUSING = {
  A: {
    campus_or_shared: 10800,
    shared_off_campus: 14400,
    private_studio_or_1br: 19800,
  },
  B: {
    campus_or_shared: 6600,
    shared_off_campus: 9000,
    private_studio_or_1br: 12600,
  },
  C: {
    campus_or_shared: 4200,
    shared_off_campus: 5700,
    private_studio_or_1br: 8100,
  },
};

const CAR_ADDON = {
  essential: 2400,
  standard: 3000,
  comfortable: 3600,
};

const TRANSPORT_BASE = {
  A: { essential: 900, standard: 1200, comfortable: 1600 },
  B: { essential: 600, standard: 800, comfortable: 1000 },
  C: { essential: 300, standard: 500, comfortable: 700 },
};

const FOOD = {
  A: { essential: 4800, standard: 6000, comfortable: 7200 },
  B: { essential: 3600, standard: 4500, comfortable: 5400 },
  C: { essential: 3000, standard: 3600, comfortable: 4200 },
};

const INSURANCE = {
  essential: 1800,
  standard: 2400,
  comfortable: 3200,
};

const PERSONAL = {
  A: { essential: 2400, standard: 3300, comfortable: 4200 },
  B: { essential: 1800, standard: 2400, comfortable: 3000 },
  C: { essential: 1500, standard: 1950, comfortable: 2400 },
};

const TRAVEL_PER_TRIP = {
  essential: 800,
  standard: 1000,
  comfortable: 1300,
};

const INTERNATIONAL_ROUND_TRIPS_PER_YEAR = 1;

const TUITION_BACHELOR = {
  lower_band: 24000,
  middle_band: 34000,
  upper_band: 46000,
};

const INITIAL_VISA_ADMIN = {
  essential: 500,
  standard: 700,
  comfortable: 1000,
};

const INITIAL_SETUP_EQUIPMENT = {
  essential: 700,
  standard: 1000,
  comfortable: 1400,
};

const ARRIVAL_RELOCATION_SETUP = {
  essential: 500,
  standard: 800,
  comfortable: 1200,
};

const GRADUATION_RELOCATION_RESERVE = {
  essential: 1500,
  standard: 2500,
  comfortable: 3500,
};

const EMERGENCY_BUFFER_PCT = {
  essential: 0.08,
  standard: 0.1,
  comfortable: 0.12,
};

const BUDGET_BOUNDS = {
  lt_30k: { f_low: 0, f_high: 30000 },
  '30_45k': { f_low: 30000, f_high: 45000 },
  '45_60k': { f_low: 45000, f_high: 60000 },
  '60_80k': { f_low: 60000, f_high: 80000 },
  gt_80k: { f_low: 80000, f_high: 999999 },
};

const BACHELOR_YEARS = 4;

/** Must match schema-v3.json disclaimer const exactly. */
const DISCLAIMER_REQUIRED =
  '本报告为情景分析原型，仅覆盖美国（US）study场景，不构成录取、就业、签证、工作许可或收入承诺；不评估移民身份与雇主担保；具体学校数据、录取率、排名、薪资与市场趋势需以官方与第三方权威数据为准；财务回报（ROI）比较未经核实数据支持，本版本不作评估。';

const MARKET_CLAIM_DISCLAIMER =
  '行业需求、认可度与增长趋势为本工具原型分类，非已核实的市场数据。';

const WORK_AUTHORIZATION_ASSUMPTION =
  '本工具不评估工作许可、移民身份、雇主担保或未来政策变化，具体身份与合法工作资格问题需咨询移民律师或学校国际学生办公室（DSO）。';

module.exports = {
  SCENARIOS,
  CITY_TIER,
  HOUSING,
  CAR_ADDON,
  TRANSPORT_BASE,
  FOOD,
  INSURANCE,
  PERSONAL,
  TRAVEL_PER_TRIP,
  INTERNATIONAL_ROUND_TRIPS_PER_YEAR,
  TUITION_BACHELOR,
  INITIAL_VISA_ADMIN,
  INITIAL_SETUP_EQUIPMENT,
  ARRIVAL_RELOCATION_SETUP,
  GRADUATION_RELOCATION_RESERVE,
  EMERGENCY_BUFFER_PCT,
  BUDGET_BOUNDS,
  BACHELOR_YEARS,
  DISCLAIMER_REQUIRED,
  MARKET_CLAIM_DISCLAIMER,
  WORK_AUTHORIZATION_ASSUMPTION,
};
