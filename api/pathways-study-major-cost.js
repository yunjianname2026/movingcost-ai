'use strict';

/**
 * POST /api/pathways-study-major-cost
 * Isolated Study, Major & Cost Planner endpoint.
 * Does not touch Report Engine / Stripe / Member APIs.
 */

const fs = require('fs');
const path = require('path');

const {
  validateAndNormalizeInput,
} = require('../lib/study-major-cost/validate-input');
const { calculateCosts } = require('../lib/study-major-cost/calculate-costs');
const {
  buildCostOutlookFromEngine,
} = require('../lib/study-major-cost/build-cost-outlook');
const {
  RULES_VERSION,
  SCHEMA_VERSION,
  PRODUCT_VERSION,
} = require('../lib/study-major-cost/versions');
const C = require('../lib/study-major-cost/constants');
const { validateReport } = require('./study-major-cost/validate-report');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;

const rateMap = new Map();
const LIMIT = 8;
const WINDOW = 60 * 60 * 1000;

function isAllowed(ip) {
  const now = Date.now();
  const record = rateMap.get(ip);
  if (!record || now - record.start > WINDOW) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (record.count >= LIMIT) return false;
  record.count += 1;
  return true;
}

function readPrompt(name) {
  return fs.readFileSync(
    path.join(__dirname, 'study-major-cost', 'prompts', name),
    'utf8'
  );
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : text.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callClaude({ system, user }) {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) {
    const err = new Error('Claude API key is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const err = new Error('Upstream model error');
    err.code = 'CLAUDE_HTTP';
    err.status = resp.status;
    err.detail = errText.slice(0, 200);
    throw err;
  }

  const data = await resp.json();
  return {
    text: data.content?.[0]?.text || '',
    stop_reason: data.stop_reason || 'unknown',
  };
}

function buildUserPrompt({ answers, costs, costOutlookBase, retryErrors }) {
  const reportPrompt = readPrompt('report-prompt-v3.md');
  const safeAnswers = { ...answers };
  // Do not send unbounded sensitive financial account detail (none collected)
  const transferNote =
    answers.transfer_intent === 'considering' ||
    answers.transfer_intent === 'already_decided'
      ? {
          transfer_stress_test_standard_usd:
            costs.transfer_stress_test.standard_extra_year_total,
          note: 'Show as independent stress test only; not in base program totals.',
        }
      : null;

  const lockedCostOutlook = {
    ...costOutlookBase,
    family_budget_gap:
      '（请按 rules 第9节用文字描述家庭预算区间与对比年份 Standard 总额的关系，不要编造精确缺口金额）',
    top_overspend_items: ['请填写1–3项最可能超支的成本项（中文）'],
    top_savings_items: ['请填写1–3项可节省方向（中文）'],
  };

  let retryBlock = '';
  if (retryErrors && retryErrors.length) {
    retryBlock = `\n\n## 上次输出未通过校验，请只输出修正后的完整 JSON，不要解释。错误列表：\n- ${retryErrors
      .slice(0, 25)
      .join('\n- ')}\n`;
  }

  return `${reportPrompt}

## 固定约束（必须原样遵守）
- schema_version = "v3"
- rules_version_used = "${RULES_VERSION}"
- financial_roi_assessed = false
- feasibility_confidence = "not_assessed"
- career_feasibility_confidence = "not_assessed"
- disclaimer 必须等于给定常量（见下方）
- work_authorization_assumption 必须等于给定常量
- market_claim_disclaimer 对每条 recommended_paths 必须等于给定常量
- cost_outlook 中的金额必须与下方 DETERMINISTIC_COST_OUTLOOK 完全一致，不得改动任何数字
- 不要输出具体学校名称，除非用户 answers 中已提供
- 不要声称录取率、排名、薪资、就业率、移民/OPT/CPT 可行性
- 只输出一个 JSON 对象，不要 markdown 说明文字

## disclaimer 常量
${C.DISCLAIMER_REQUIRED}

## work_authorization_assumption 常量
${C.WORK_AUTHORIZATION_ASSUMPTION}

## market_claim_disclaimer 常量
${C.MARKET_CLAIM_DISCLAIMER}

## USER_ANSWERS (normalized)
${JSON.stringify(safeAnswers, null, 2)}

## DETERMINISTIC_COST_SUMMARY
${JSON.stringify(
  {
    planning_period_type: costs.planning_period_type,
    planning_start_year: costs.planning_start_year,
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
    budget_pressure_level: costs.budget_coverage.pressure_level,
    transfer_stress_test: transferNote,
  },
  null,
  2
)}

## DETERMINISTIC_COST_OUTLOOK (copy numbers exactly; fill only narrative string fields)
${JSON.stringify(lockedCostOutlook, null, 2)}
${retryBlock}

请输出符合 Schema v3 的完整 JSON 报告（generated_stage 用 "full_prototype"）。`;
}

function buildFreePreview(report, costs) {
  const ds = report.decision_summary || {};
  return {
    best_major_direction: ds.best_major_direction || '',
    recommended_school_city_type: ds.recommended_school_city_type || '',
    budget_pressure_level: costs.budget_coverage.pressure_level,
    biggest_opportunity: ds.biggest_opportunity || '',
    biggest_risk: ds.biggest_risk || '',
    most_important_next_action: ds.most_important_next_action || '',
    summary_text: ds.summary_text || '',
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
    planning_period_type: costs.planning_period_type,
    transfer_stress_test_standard_usd:
      costs.transfer_stress_test.standard_extra_year_total,
  };
}

function safeCostsPayload(costs) {
  return {
    currency: 'USD',
    planning_period_type: costs.planning_period_type,
    planning_start_year: costs.planning_start_year,
    scenarios: {
      essential: {
        first_planning_year_total:
          costs.scenarios.essential.first_planning_year_total,
        program_total: costs.scenarios.essential.program_total,
      },
      standard: {
        first_planning_year_total:
          costs.scenarios.standard.first_planning_year_total,
        program_total: costs.scenarios.standard.program_total,
      },
      comfortable: {
        first_planning_year_total:
          costs.scenarios.comfortable.first_planning_year_total,
        program_total: costs.scenarios.comfortable.program_total,
      },
    },
    budget_coverage: {
      pressure_level: costs.budget_coverage.pressure_level,
      comparison_standard_total:
        costs.budget_coverage.comparison_standard_total,
    },
    transfer_stress_test: {
      included_in_base_totals: false,
      standard_extra_year_total:
        costs.transfer_stress_test.standard_extra_year_total,
    },
    rules_version: RULES_VERSION,
  };
}

function userFacingError(code) {
  const map = {
    VALIDATION_ERROR: '提交内容未通过校验，请检查问卷后重试。',
    UNSUPPORTED_SCOPE: '当前仅支持美国本科（US / bachelor）规划。',
    NO_API_KEY: '服务暂时不可用，请稍后再试。',
    CLAUDE_HTTP: '分析服务暂时繁忙，请稍后再试。',
    PARSE_ERROR: '报告生成格式异常，请稍后再试。',
    SCHEMA_ERROR: '报告未通过结构校验，请稍后再试。',
    RATE_LIMIT: '请求过于频繁，请稍后再试。',
  };
  return map[code] || '分析失败，请稍后再试。';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!isAllowed(ip)) {
    return res.status(429).json({
      ok: false,
      error: userFacingError('RATE_LIMIT'),
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawAnswers = body.answers;
    const validated = validateAndNormalizeInput(rawAnswers);
    if (!validated.ok) {
      return res.status(400).json({
        ok: false,
        error: userFacingError('VALIDATION_ERROR'),
        // safe field names only — no stack / prompts
        fields: validated.errors.slice(0, 12),
      });
    }

    const answers = validated.answers;
    if (answers.target_country !== 'US' || answers.target_degree !== 'bachelor') {
      return res.status(400).json({
        ok: false,
        error: userFacingError('UNSUPPORTED_SCOPE'),
      });
    }

    const costs = calculateCosts(answers);
    const costOutlookBase = buildCostOutlookFromEngine(costs, {
      calculation_trace_ref: 'study-major-cost-calculation-trace Profile (runtime)',
    });

    const system = readPrompt('system-prompt-v3.md');
    let lastErrors = [];
    let report = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const user = buildUserPrompt({
        answers,
        costs,
        costOutlookBase,
        retryErrors: attempt === 0 ? null : lastErrors,
      });

      let claude;
      try {
        claude = await callClaude({ system, user });
      } catch (e) {
        const code = e.code || 'CLAUDE_HTTP';
        return res.status(code === 'NO_API_KEY' ? 503 : 502).json({
          ok: false,
          error: userFacingError(code),
        });
      }

      report = extractJson(claude.text);
      if (!report) {
        lastErrors = ['Could not parse JSON object from model output'];
        continue;
      }

      // Force fixed constants / cost numbers from engine (still validate)
      report.disclaimer = C.DISCLAIMER_REQUIRED;
      if (report.education_value) {
        report.education_value.financial_roi_assessed = false;
      }
      if (report.mobility_outlook) {
        report.mobility_outlook.feasibility_confidence = 'not_assessed';
        report.mobility_outlook.work_authorization_assumption =
          C.WORK_AUTHORIZATION_ASSUMPTION;
      }
      if (report.decision_summary) {
        report.decision_summary.career_feasibility_confidence = 'not_assessed';
        report.decision_summary.budget_pressure_level =
          costs.budget_coverage.pressure_level;
      }
      if (report.report_meta) {
        report.report_meta.schema_version = SCHEMA_VERSION;
        report.report_meta.language = 'zh-CN-primary';
        report.report_meta.market_scope = { country: 'US', currency: 'USD' };
      }
      if (Array.isArray(report.recommended_paths)) {
        for (const p of report.recommended_paths) {
          p.market_claim_disclaimer = C.MARKET_CLAIM_DISCLAIMER;
        }
      }

      // Merge narrative fields into locked cost outlook
      const narrativeGap =
        report.cost_outlook && report.cost_outlook.family_budget_gap;
      const narrativeOver =
        report.cost_outlook && report.cost_outlook.top_overspend_items;
      const narrativeSave =
        report.cost_outlook && report.cost_outlook.top_savings_items;
      report.cost_outlook = {
        ...costOutlookBase,
        family_budget_gap:
          typeof narrativeGap === 'string' && narrativeGap.length >= 8
            ? narrativeGap
            : `家庭预算区间与规划起始年 Standard 情景年度总额（$${costs.scenarios.standard.first_planning_year_total.toLocaleString('en-US')}）相比，压力等级为 ${costs.budget_coverage.pressure_level}（按 rules_v3 第9节确定性规则）。`,
        top_overspend_items:
          Array.isArray(narrativeOver) && narrativeOver.length
            ? narrativeOver.slice(0, 3)
            : ['学费定位', '住宿', '生活开销'],
        top_savings_items:
          Array.isArray(narrativeSave) && narrativeSave.length
            ? narrativeSave.slice(0, 3)
            : ['调整住宿类型', '调整城市层级', '复核学费定位'],
      };

      const v = validateReport(report, costs);
      if (v.ok) {
        return res.status(200).json({
          ok: true,
          free: buildFreePreview(report, costs),
          report,
          costs: safeCostsPayload(costs),
          versions: {
            rules: RULES_VERSION,
            schema: SCHEMA_VERSION,
            product: PRODUCT_VERSION,
            model: MODEL,
          },
          retry_used: attempt === 1,
        });
      }
      lastErrors = v.errors;
    }

    return res.status(502).json({
      ok: false,
      error: userFacingError('SCHEMA_ERROR'),
    });
  } catch (err) {
    console.error('[pathways-study-major-cost]', err && err.message);
    return res.status(500).json({
      ok: false,
      error: '分析失败，请稍后再试。',
    });
  }
};

// Local/Preview timeout budget — do not change vercel.json until measured.
// send-report uses 800s; this planner is a single structured JSON call.
module.exports.config = { maxDuration: 120 };
