// api/send-report.js
const { Resend } = require('resend');

// ── Supabase 工具（Report Recovery v2.1）─────────────────────────────────
const SUPABASE_URL_SR = process.env.SUPABASE_URL;
const SUPABASE_KEY_SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sr_supabasePatch(filter, body) {
  if (!SUPABASE_URL_SR || !SUPABASE_KEY_SR) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL_SR}/rest/v1/report_orders?${filter}`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY_SR,
          'Authorization': `Bearer ${SUPABASE_KEY_SR}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.warn('[send-report] supabase PATCH failed:', res.status, txt.slice(0, 200));
    }
  } catch (err) {
    console.warn('[send-report] supabase PATCH error (non-fatal):', err.message);
  }
}

// 生成安全 resend_token（UUID v4）
function sr_generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SYSTEM RULES
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_RULES = `You are MovingCOST.ai's relocation planning analyst.
Your job is to generate a practical relocation planning report based only on the user's submitted information.

MANDATORY RULES — every rule applies without exception:
1. Do NOT invent exact legal, tax, visa, immigration, or medical conclusions.
2. For visa, tax, immigration, customs, and healthcare topics, provide cautious planning notes ONLY — never definitive statements.
3. ALWAYS use estimated ranges (e.g. "$1,800–$2,400/month") instead of exact single numbers.
4. ALWAYS include uncertainty language: "as of 2026", "typically", "commonly reported", "verify with official sources".
5. Do NOT claim that a visa, tax status, benefit, or legal pathway is guaranteed or certain.
6. If user information is insufficient, state clearly what the user needs to verify.
7. Do NOT mention SEF — use AIMA (Agência para a Integração, Migrações e Asilo) for Portugal immigration.
8. Do NOT present Portugal NHR as available without noting it closed in 2024. Reference IFICI/NHR 2.0 and advise verification.
9. Do NOT use the D7 income figure of €4,320/year — the correct 2026 reference is approximately €920/month for a single applicant.
10. Do NOT promise exact savings — use "estimated potential savings of X–Y range".
11. The report MUST include all 10 required sections — never skip or abbreviate any section.
12. Tone must be professional, clear, warm, and practical.
13. NEVER say "100% guaranteed", "perfectly aligns", or present AI-generated estimates as official data.`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. DESTINATION KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────────────────────
const DESTINATION_KB = {
  portugal: {
    immigration_body: 'AIMA (Agência para a Integração, Migrações e Asilo) — replaced SEF in late 2023',
    visas: [
      'D7 Passive Income Visa: requires approximately €920/month stable income for a single applicant (2026 guidance — verify with Portuguese consulate as requirements change annually)',
      'D8 Digital Nomad Visa: for remote workers employed by foreign companies; income threshold commonly cited around €3,280/month (verify officially)',
      'D2 Entrepreneur Visa: for those starting or investing in a business in Portugal; requires a business plan and investment',
      'Golden Visa: property or fund investment routes available; minimum thresholds have changed multiple times — verify current requirements',
    ],
    tax_notes: [
      'Portugal original NHR (Non-Habitual Resident) regime was closed to most new applicants in 2024',
      'IFICI / NHR 2.0 has stricter eligibility — primarily for qualifying professions in tech, science, research — consult a Portugal-qualified tax advisor',
      'Standard IRS income tax: approximately 14.5% to 48% depending on income bracket',
      'Portugal has double taxation treaties with many countries — check your home country treaty status',
    ],
    cost_context: 'Lisbon 2026 rental market: 2BR apartments in central areas typically €1,600–2,500/month; outer districts €900–1,400/month.',
  },
  uae: {
    immigration_body: 'GDRFA (General Directorate of Residency and Foreigners Affairs) for Dubai; ICP for federal matters',
    visas: [
      'Remote Work Visa (Virtual Working Programme): 1-year renewable; requires proof of employment outside UAE and minimum ~$3,500/month income',
      'UAE Golden Visa: 10-year residence for investors, outstanding professionals, entrepreneurs; property investment threshold AED 2M+',
      'Employment Visa: sponsored by UAE employer; most common route for those with a job offer',
      'Freelancer/Self-Employment Permits: available through free zones; costs vary by zone (typically AED 7,000–20,000/year)',
    ],
    tax_notes: [
      'UAE has no personal income tax as of 2026',
      'Corporate tax of 9% applies to businesses with taxable income above AED 375,000 (introduced 2023)',
      'VAT: 5% on most goods and services',
      'No capital gains tax on personal investments in UAE',
      'Check your home country exit tax obligations and whether your country taxes worldwide income of citizens abroad',
    ],
    cost_context: 'Dubai 2026 rental: 2BR in prime areas (Marina, Downtown, JBR) AED 120,000–200,000/year; more affordable in JVC, Sports City AED 70,000–110,000/year.',
  },
  spain: {
    immigration_body: 'Oficina de Extranjería for residence permits; Spanish consulate in home country for initial visa application',
    visas: [
      'Non-Lucrative Visa (NLV): for those with sufficient passive income or savings; income commonly ~€2,160/month for single applicant (verify as SMI increases annually)',
      'Digital Nomad Visa (Startup Law 2023): for remote workers employed by non-Spanish companies; income requirement approximately €2,646/month (verify officially)',
      'Golden Visa: property investment of €500,000+ for residence; under review for changes — verify current status',
    ],
    tax_notes: [
      'Beckham Law: flat 24% tax on income up to €600,000 for qualifying new Spanish residents; must apply within 6 months of becoming tax resident',
      'Standard IRPF income tax: approximately 19%–47% depending on income level and autonomous community',
      'Spanish tax residency: 183+ days in Spain in a calendar year, or centre of economic interests in Spain',
    ],
    cost_context: 'Madrid 2026 rental: 2BR in desirable areas €1,800–3,500/month. Valencia significantly more affordable at €900–1,600/month.',
  },
  mexico: {
    immigration_body: 'Instituto Nacional de Migración (INM) for all immigration matters',
    visas: [
      'Temporary Resident Visa (Residente Temporal): 1–4 years renewable; requires proof of financial solvency — commonly approximately $1,400–2,500/month income (verify with Mexican consulate)',
      'No dedicated digital nomad visa; many remote workers enter on tourist/visitor permit (FMM, up to 180 days) then apply for Temporary Residency',
      'Permanent Residency: available after 4 years as Temporary Resident or via qualifying criteria',
    ],
    tax_notes: [
      'Mexican tax residency triggers at 183+ days in Mexico in a calendar year',
      'Once tax resident, Mexico taxes worldwide income under ISR: rates 1.92%–35%',
      'Mexico has tax treaties with approximately 60 countries',
      'Remote workers employed by foreign companies may have complex dual tax obligations — consult a Mexican fiscal advisor',
    ],
    cost_context: 'Mexico City 2026 rental: 2BR in expat neighbourhoods (Condesa, Roma Norte, Polanco) MXN 22,000–50,000/month ($1,300–3,000).',
  },
  usa: {
    immigration_body: 'USCIS (U.S. Citizenship and Immigration Services) for petitions; DOS (Department of State) for visas',
    visas: [
      'B-1/B-2 Tourist/Business Visitor Visa: up to 6 months, work not permitted',
      'O-1 Extraordinary Ability Visa: for individuals with demonstrated exceptional achievement in their field',
      'E-2 Treaty Investor Visa: available to nationals of treaty countries; investment amount varies but must be "substantial"',
      'EB-5 Investor Green Card: minimum $800,000–$1,050,000 investment in job-creating enterprise',
      'Note: US immigration is highly complex — an experienced immigration attorney is strongly recommended',
    ],
    tax_notes: [
      'US taxes its citizens and green card holders on worldwide income regardless of where they live',
      'Foreign Earned Income Exclusion (FEIE): qualifying expats may exclude approximately $126,500 (2024, indexed annually)',
      'FBAR (FinCEN 114): required if foreign financial accounts exceed $10,000 aggregate at any point in the year',
      'State income tax varies: Florida, Texas, Nevada, Washington have no state income tax',
    ],
    cost_context: 'US costs vary enormously by city. Sun Belt cities (Miami, Austin, Tampa) mid-range; Midwest significantly more affordable. Florida has no state income tax.',
  },
};

function getDestinationNotes(userData) {
  const to = (userData.to || '').toLowerCase();
  let matched = null;

  if (to.includes('portugal') || to.includes('lisbon') || to.includes('porto') || to.includes('algarve')) matched = DESTINATION_KB.portugal;
  else if (to.includes('uae') || to.includes('dubai') || to.includes('abu dhabi') || to.includes('sharjah')) matched = DESTINATION_KB.uae;
  else if (to.includes('spain') || to.includes('madrid') || to.includes('barcelona') || to.includes('valencia') || to.includes('seville') || to.includes('malaga')) matched = DESTINATION_KB.spain;
  else if (to.includes('mexico') || to.includes('cdmx') || to.includes('playa del carmen') || to.includes('puerto vallarta') || to.includes('oaxaca') || to.includes('guadalajara')) matched = DESTINATION_KB.mexico;
  else if (to.includes('usa') || to.includes('united states') || to.includes('florida') || to.includes('miami') || to.includes('new york') || to.includes('california') || to.includes('texas') || to.includes('austin')) matched = DESTINATION_KB.usa;

  if (!matched) return '';

  return `\n\nVERIFIED DESTINATION REFERENCE DATA (use this to inform your report — cite as "commonly reported" or "as of 2026"):
Immigration body: ${matched.immigration_body}
Visa options:\n- ${matched.visas.join('\n- ')}
Tax planning notes:\n- ${matched.tax_notes.join('\n- ')}
Cost context: ${matched.cost_context}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VALIDATION — check 10 sections, banned terms, minimum length
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_SECTION_KEYS = [
  { key: 'executive summary',  label: 'Section 1 — Executive Summary' },
  { key: 'monthly cost',       label: 'Section 2 — Monthly Cost Breakdown' },
  { key: 'housing',            label: 'Section 3 — Housing Market' },
  { key: 'visa',               label: 'Section 4 — Visa & Immigration' },
  { key: 'tax',                label: 'Section 5 — Tax & Financial Planning' },
  { key: 'moving cost',        label: 'Section 6 — One-Time Moving Costs' },
  { key: 'checklist',          label: 'Section 7 — Pre-Departure Checklist' },
  { key: 'hidden cost',        label: 'Section 8 — Hidden Costs & Risks' },
  { key: 'action plan',        label: 'Section 9 — 90-Day Action Plan' },
  { key: 'final',              label: 'Section 10 — Final Recommendations' },
];

const BANNED_TERMS = [
  { term: 'SEF ',             reason: 'Outdated agency — use AIMA' },
  { term: '€4,320',          reason: 'Incorrect D7 income figure' },
  { term: '100% guaranteed', reason: 'Guarantee claims not allowed' },
  { term: 'perfectly aligns',reason: 'Overconfident language' },
  { term: 'is guaranteed',   reason: 'Guarantee claims not allowed' },
  { term: 'guaranteed to',   reason: 'Guarantee claims not allowed' },
];

const MIN_LENGTH = 5000;

function validateReport(content) {
  const issues = [];
  if (!content || !content.trim()) {
    issues.push('Report empty');
    return issues;
  }
  const lower = content.toLowerCase();
  REQUIRED_SECTION_KEYS.forEach(s => {
    if (!lower.includes(s.key)) issues.push('Missing: ' + s.label);
  });
  BANNED_TERMS.forEach(b => {
    if (content.includes(b.term)) issues.push('Banned term "' + b.term + '" — ' + b.reason);
  });
  if (content.length < MIN_LENGTH) {
    issues.push('Report shorter than target: ' + content.length + ' chars (soft minimum ' + MIN_LENGTH + ')');
  }
  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('send-report start');

    const { email, name, userData, previewReport } = req.body;
    if (!email || !userData) return res.status(400).json({ error: 'Missing email or userData' });
    console.log('after parse request');

    console.log('before buildReportPromptPart1');
    const prompt1 = buildReportPromptPart1(userData, previewReport);
    console.log('after buildReportPromptPart1');

    console.log('before callClaude part1');
    const raw1 = await callClaude(prompt1, 10000);
    console.log('after callClaude part1, length:', raw1 ? raw1.length : 0);

    if (!raw1 || !raw1.trim()) {
      return res.status(500).json({ error: 'Report generation (part 1) returned empty content. Please try again or contact support.' });
    }

    console.log('before buildReportPromptPart2');
    const prompt2 = buildReportPromptPart2(userData, raw1);
    console.log('after buildReportPromptPart2');

    console.log('before callClaude part2');
    const raw2 = await callClaude(prompt2, 10000);
    console.log('after callClaude part2, length:', raw2 ? raw2.length : 0);

    if (!raw2 || !raw2.trim()) {
      return res.status(500).json({ error: 'Report generation (part 2) returned empty content. Please try again or contact support.' });
    }

    const raw = raw1 + '\n' + raw2;

    console.log('before validateReport');
    const validationIssues = validateReport(raw);
    console.log('after validateReport, issues:', validationIssues.length);
    if (validationIssues.length > 0) {
      console.warn('Validation notes (single pass, no retry):', validationIssues.join('; '));
    }

    const reportContent = raw;
    const firstName = (name || 'there').split(' ')[0];

    // [v2.1] 先生成 token，再传入 buildEmailHTML 生成含按钮的 HTML
    const resendToken   = sr_generateToken();
    const resendExpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    console.log('before buildEmailHTML');
    const emailHTML = buildEmailHTML(firstName, userData, reportContent, resendToken);
    console.log('after buildEmailHTML, html length:', emailHTML ? emailHTML.length : 0);

    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log('before resend.emails.send');
    const { data, error } = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: email,
      replyTo: 'support@movingcost.ai',
      subject: 'Your MovingCOST.ai Report — ' + getSubjectLine(userData),
      html: emailHTML,
    });
    console.log('after resend.emails.send');

    if (error) {
      console.error('Resend send error:', error);
      throw new Error('Failed to send report email: ' + (error.message || JSON.stringify(error)));
    }

    console.log('Report sent to:', email, '| resend id:', data?.id || 'n/a', '| Validation notes:', validationIssues.length);

    // ── [新增 v2.1] 更新 report_orders（非阻断）──────────────────────────
    try {
      await sr_supabasePatch(
        `email=eq.${encodeURIComponent(email)}&status=eq.pending&order=created_at.desc&limit=1`,
        {
          status:           'sent',
          report_html:      emailHTML,
          report_version:   1,
          report_sent_at:   new Date().toISOString(),
          resend_token:     resendToken,
          resend_token_exp: resendExpDate.toISOString(),
        }
      );
      console.log('[send-report] report_orders updated, resend_token issued');
    } catch (dbErr) {
      console.error('[send-report] report_orders update error (non-fatal):', dbErr.message);
    }

    console.log('before res.status(200).json');
    return res.status(200).json({ sent: true, validation_notes: validationIssues.length });

  } catch (err) {
    console.error('send-report error:', err.message);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. CLAUDE API CALL
// ─────────────────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_RULES,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Claude API error: ' + errText.slice(0, 200));
  }

  const data = await resp.json();
  return data.content?.[0]?.text || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROMPT BUILDERS (split into Part 1: Sections 0–5, Part 2: Sections 6–10)
// ─────────────────────────────────────────────────────────────────────────────
// ── 城市名标准化 ──────────────────────────────────────────────────────────
function toTitleCase(str) {
  if (!str) return '';
  const abbr = { nyc:'NYC', la:'LA', sf:'SF', dc:'DC', uae:'UAE', uk:'UK', us:'US' };
  return str.trim().replace(/\w\S*/g, w => {
    const low = w.toLowerCase();
    return abbr[low] || (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  });
}

// ── 城市→渐变色映射 ───────────────────────────────────────────────────────
function getCityColors(cityName) {
  const city = (cityName || '').toLowerCase().trim();
  const map = {
    'new york':['#0f1f3d','#1a3460','#1e4080'],'nyc':['#0f1f3d','#1a3460','#1e4080'],
    'boston':['#0d1f3c','#163258','#1c4070'],'philadelphia':['#101e38','#172f56','#1d3d6e'],
    'washington':['#0e1e3a','#162e54','#1b3c6c'],'chicago':['#0f2040','#17305e','#1c3e76'],
    'miami':['#064e6e','#0d7fa5','#2bafd4'],'orlando':['#065a6e','#0d8aaa','#24b8d8'],
    'tampa':['#065570','#0c86ab','#22b5d6'],'austin':['#1a4a2e','#22683f','#2a8850'],
    'dallas':['#2a3a1a','#3d5524','#507030'],'houston':['#1e3820','#2a5030','#356840'],
    'atlanta':['#1a2e3a','#264456','#306070'],'nashville':['#2a2018','#40301e','#584026'],
    'los angeles':['#6e3a06','#a55c0d','#d47e28'],'la':['#6e3a06','#a55c0d','#d47e28'],
    'san francisco':['#1a2e50','#254468','#305880'],'sf':['#1a2e50','#254468','#305880'],
    'seattle':['#1a2a40','#26405e','#305678'],'portland':['#1e2e1a','#2c4426','#386032'],
    'las vegas':['#4a2010','#703018','#984020'],'phoenix':['#6e2a06','#a8420e','#d46020'],
    'denver':['#1a3040','#264a5e','#306276'],'san diego':['#065870','#0d8aaa','#20b8d8'],
    'london':['#1a1e2a','#28303e','#364454'],'paris':['#1e1a2e','#2e2844','#3e365c'],
    'amsterdam':['#0e2230','#163448','#1c4460'],'berlin':['#1a1e24','#28303a','#364250'],
    'barcelona':['#4a1a10','#702818','#983822'],'madrid':['#4e1a0e','#782a16','#a04020'],
    'rome':['#4a2010','#70300e','#984818'],'lisbon':['#2e1a10','#482818','#643820'],
    'zurich':['#1a2030','#283244','#344456'],'vienna':['#1e1a28','#2c2840','#3c3858'],
    'copenhagen':['#0e2434','#163a50','#1c4e6a'],'stockholm':['#0e2030','#163048','#1c4060'],
    'dublin':['#0e2418','#163a28','#1c4e38'],'tokyo':['#1a0e2e','#281644','#36205c'],
    'singapore':['#0e3020','#163e2c','#1c5038'],'hong kong':['#0e1e38','#163054','#1c406e'],
    'shanghai':['#1e0e38','#2c1650','#3a1e68'],'dubai':['#3a2a0a','#584010','#786020'],
    'bangkok':['#2a1a0e','#402818','#583820'],'bali':['#1a3a0e','#286018','#369030'],
    'mexico city':['#2e1a0e','#482818','#643820'],'cancun':['#065a6e','#0d88a8','#24b4d4'],
    'buenos aires':['#0e1e3a','#163254','#1c426e'],'sydney':['#064e70','#0d7aaa','#22a8d4'],
    'melbourne':['#0e2040','#163460','#1c4880'],'auckland':['#065068','#0d7e9e','#22accc'],
  };
  for (const key of Object.keys(map)) {
    if (city.includes(key) || key.includes(city)) return map[key];
  }
  return ['#1a2744','#253a60','#2e4e7a'];
}

// ── 天际线 SVG（按城市类型：热带 / 欧式 / 现代高层）─────────────────────
function getSkylineSVG(cityName, side) {
  const city = (cityName || '').toLowerCase();
  const align = side === 'left' ? 'xMinYMax' : 'xMaxYMax';
  const isTropical = ['miami','orlando','tampa','cancun','bali','singapore','bangkok'].some(c => city.includes(c));
  const isEuropean = ['london','paris','amsterdam','berlin','barcelona','rome','lisbon','dublin','vienna','copenhagen','stockholm','zurich','madrid'].some(c => city.includes(c));

  if (isTropical) {
    return '<svg style="position:absolute;bottom:0;left:0;right:0;width:100%;" viewBox="0 0 320 90"' +
      ' preserveAspectRatio="' + align + ' meet" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="rgba(255,255,255,0.17)">' +
      '<rect x="10" y="55" width="14" height="35"/><rect x="26" y="45" width="16" height="45"/>' +
      '<rect x="44" y="38" width="12" height="52"/><rect x="58" y="52" width="14" height="38"/>' +
      '<rect x="74" y="34" width="20" height="56"/><rect x="96" y="50" width="10" height="40"/>' +
      '<rect x="108" y="36" width="18" height="54"/><rect x="128" y="54" width="8" height="36"/>' +
      '<rect x="138" y="38" width="16" height="52"/><rect x="156" y="30" width="22" height="60"/>' +
      '<rect x="180" y="52" width="8" height="38"/><rect x="190" y="36" width="16" height="54"/>' +
      '<rect x="208" y="52" width="10" height="38"/><rect x="220" y="38" width="14" height="52"/>' +
      '<rect x="236" y="28" width="24" height="62"/><rect x="262" y="50" width="10" height="40"/>' +
      '<rect x="274" y="36" width="18" height="54"/><rect x="294" y="52" width="10" height="38"/>' +
      '</g>' +
      '<g fill="rgba(255,255,255,0.28)">' +
      '<rect x="20" y="48" width="3" height="42"/><ellipse cx="21.5" cy="48" rx="12" ry="6"/>' +
      '<rect x="285" y="44" width="3" height="46"/><ellipse cx="286.5" cy="44" rx="14" ry="7"/>' +
      '</g></svg>';
  }
  if (isEuropean) {
    return '<svg style="position:absolute;bottom:0;left:0;right:0;width:100%;" viewBox="0 0 320 90"' +
      ' preserveAspectRatio="' + align + ' meet" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="rgba(255,255,255,0.16)">' +
      '<rect x="0" y="46" width="20" height="44"/><polygon points="0,46 10,32 20,46"/>' +
      '<rect x="22" y="38" width="16" height="52"/><polygon points="22,38 30,22 38,38"/>' +
      '<rect x="40" y="50" width="14" height="40"/><rect x="56" y="40" width="18" height="50"/>' +
      '<polygon points="56,40 65,26 74,40"/><rect x="76" y="52" width="12" height="38"/>' +
      '<rect x="90" y="36" width="20" height="54"/><polygon points="90,36 100,20 110,36"/>' +
      '<rect x="112" y="48" width="14" height="42"/><rect x="128" y="38" width="18" height="52"/>' +
      '<rect x="162" y="36" width="22" height="54"/><polygon points="162,36 173,20 184,36"/>' +
      '<rect x="186" y="48" width="14" height="42"/><rect x="202" y="38" width="18" height="52"/>' +
      '<rect x="236" y="34" width="22" height="56"/><polygon points="236,34 247,18 258,34"/>' +
      '<rect x="260" y="46" width="16" height="44"/><rect x="278" y="38" width="20" height="52"/>' +
      '</g></svg>';
  }
  return '<svg style="position:absolute;bottom:0;left:0;right:0;width:100%;" viewBox="0 0 320 90"' +
    ' preserveAspectRatio="' + align + ' meet" xmlns="http://www.w3.org/2000/svg">' +
    '<g fill="rgba(255,255,255,0.16)">' +
    '<rect x="0" y="50" width="16" height="40"/><rect x="18" y="32" width="14" height="58"/>' +
    '<rect x="34" y="14" width="20" height="76"/><rect x="36" y="4" width="4" height="10"/>' +
    '<rect x="56" y="36" width="12" height="54"/><rect x="70" y="20" width="18" height="70"/>' +
    '<rect x="90" y="40" width="10" height="50"/><rect x="102" y="6" width="24" height="84"/>' +
    '<rect x="111" y="0" width="3" height="6"/><rect x="128" y="26" width="16" height="64"/>' +
    '<rect x="146" y="42" width="10" height="48"/><rect x="158" y="18" width="20" height="72"/>' +
    '<rect x="180" y="44" width="10" height="46"/><rect x="192" y="30" width="14" height="60"/>' +
    '<rect x="218" y="34" width="14" height="56"/><rect x="246" y="28" width="18" height="62"/>' +
    '<rect x="276" y="38" width="14" height="52"/><rect x="292" y="50" width="28" height="40"/>' +
    '</g></svg>';
}

// ── 报告日期 ──────────────────────────────────────────────────────────────
function getReportDate() {
  return new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

function getSubjectLine(d) {
  const from = toTitleCase(d.from);
  const to   = toTitleCase(d.to);
  if (d.type === 'relocation') return from + ' → ' + to + ' Relocation Report';
  if (d.type === 'nomad') return 'Your Digital Nomad Life Plan';
  return 'Your City Comparison Report';
}

function buildReportPromptPart1(d, preview) {
  const type      = d.type || 'relocation';
  const from      = d.from || 'current city';
  const to        = d.to   || 'destination';
  const who       = d.who  || 'individual';
  const income    = d.income    || 'not specified';
  const lifestyle = d.lifestyle || 'not specified';
  const notes     = d.notes     || 'none';
  const destNotes = getDestinationNotes(d);
  const previewCtx = preview
    ? '\nPreview report shown to user — headline: "' + preview.headline + '" / summary: "' + preview.summary + '"'
    : '';

  return `Generate PART 1 of a comprehensive AI-powered relocation planning report for a paying customer. Follow all system rules strictly.

USER PROFILE:
- Move type: ${type}
- From: ${from} → To: ${to}
- Household: ${who}
- Monthly income: ${income}
- Lifestyle: ${lifestyle}
- Additional notes: ${notes}
- Full data: ${JSON.stringify(d)}
${previewCtx}${destNotes}

OUTPUT REQUIREMENTS FOR PART 1:
- Write Sections 0 through 5 ONLY
- Do NOT write Sections 6–10 (they will be generated separately)
- Write approximately 2,000–2,500 words of substantive content
- Use RANGES for all cost estimates
- Use cautious, hedged language for visa, tax, and immigration sections
- Format in email-safe HTML with inline styles only

---

SECTION 0 — DISCLAIMER (output this HTML block exactly, before anything else):
<div style="background:#FFF7ED;border:1.5px solid #FCD34D;border-radius:12px;padding:18px 22px;margin-bottom:28px;font-family:Arial,sans-serif;">
<p style="font-size:13px;color:#92400E;margin:0 0 8px;line-height:1.75;"><strong style="color:#78350F;">⚠️ Planning Report — Important Notice</strong></p>
<p style="font-size:13px;color:#92400E;margin:0 0 6px;line-height:1.75;">This is an AI-generated planning report for informational purposes only. All cost figures are estimated ranges based on publicly available data as of 2026. Visa rules, tax regulations, immigration procedures, and housing costs change frequently and vary by individual circumstance.</p>
<p style="font-size:13px;color:#92400E;margin:0;line-height:1.75;"><strong style="color:#78350F;">Please verify all legal, tax, immigration, and financial decisions with qualified professionals before acting.</strong> MovingCOST.ai does not provide legal, tax, immigration, or financial advice. This report does not constitute professional advice of any kind.</p>
<p style="font-size:11px;color:#B45309;margin:10px 0 0;"><em>Generated: May 2026 · Based on user-submitted inputs · Data confidence: Medium · For planning purposes only</em></p>
</div>

SECTION 1 — EXECUTIVE SUMMARY
Write 3–4 paragraphs: the key financial opportunity or challenge of this move from ${from} to ${to}, the single most important strategic recommendation, the 3 biggest success factors, and an honest feasibility assessment for this household. Use cost ranges throughout.

SECTION 2 — MONTHLY COST BREAKDOWN
Side-by-side HTML table comparing ${from} vs ${to} with estimated ranges for:
- Housing (1BR/2BR/3BR in different tiers)
- Utilities (electricity, water, internet, gas)
- Groceries and food at home
- Dining out (budget / mid-range / upscale frequency)
- Transportation (transit pass, car ownership estimate, rideshare)
- Healthcare (insurance, GP, specialist, dental)
- Gym and fitness
- Entertainment and leisure
- Phone plan
- Personal care and clothing
- TOTAL monthly range (low / mid / high scenario)
Include estimated annual saving or cost increase as a range.

SECTION 3 — HOUSING MARKET GUIDE
Cover: 4–5 best neighbourhoods for this profile with rent ranges and pros/cons; current market conditions; rental process and typical deposits; furnished vs unfurnished options; short-term accommodation for first 1–3 months; red flags and common expat mistakes; top platforms for remote house hunting; estimated move-in total cost range.

SECTION 4 — VISA & IMMIGRATION NOTES
Planning notes (not legal advice) on: 2–3 visa options for this person with cautious eligibility notes; step-by-step application process with estimated timeline; approximate fee ranges; document checklist; common reasons for delays or issues; path to longer-term status; recommendation on immigration lawyer. Reference AIMA for Portugal. Use hedged language throughout.

SECTION 5 — TAX & FINANCIAL PLANNING NOTES
Planning notes (not tax advice) on: when tax residency may shift; double taxation treaty context; approximate tax rate ranges in ${to}; banking setup strategy; currency management; pension and investment account implications; what to set up before vs after departure; type of advisor to engage. Use cautious language — never guarantee outcomes.

---
HTML FORMAT:
- Section h2: <h2 style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#0F172A;margin:32px 0 12px;padding-top:24px;border-top:2px solid #E2E8F0;">Title</h2>
- Sub-headers: <h3 style="font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#0284C7;margin:20px 0 8px;">Sub-header</h3>
- Body text: <p style="font-size:14px;color:#334155;line-height:1.8;margin:0 0 12px;">text</p>
- Lists: <ul style="padding-left:20px;margin:0 0 16px;"><li style="font-size:14px;color:#334155;line-height:1.8;margin-bottom:6px;">item</li></ul>
- Key ranges: <strong style="color:#0F172A;">$X,XXX–$Y,YYY</strong>
- Cost tables: simple HTML table with border-collapse:collapse, alternating #F8FAFC / #fff rows

Write Sections 0–5 now. Stop after Section 5. Do not write Section 6 or beyond.`;
}

function buildReportPromptPart2(d, part1Content) {
  const from = d.from || 'current city';
  const to   = d.to   || 'destination';

  return `You are continuing a relocation planning report. Part 1 (Sections 0–5) has already been written. Now write PART 2: Sections 6–10 only.

USER PROFILE SUMMARY:
- From: ${from} → To: ${to}
- Household: ${d.who || 'individual'}
- Income: ${d.income || 'not specified'}
- Lifestyle: ${d.lifestyle || 'not specified'}

OUTPUT REQUIREMENTS FOR PART 2:
- Write Sections 6 through 10 ONLY
- Do NOT repeat or summarise Part 1 content
- Write approximately 1,800–2,200 words of substantive content
- Use RANGES for all cost estimates
- Format in email-safe HTML with inline styles only

---

SECTION 6 — ONE-TIME MOVING COSTS
Estimated ranges for: shipping options (air / sea / container); what to ship vs sell; pet relocation if applicable; vehicle decisions; transit insurance; storage if needed; flights and temporary accommodation; total moving budget: budget / mid / premium scenario.

SECTION 7 — PRE-DEPARTURE FINANCIAL CHECKLIST
Itemised tasks with timeline:
- 6 months before
- 3 months before
- 1 month before
- 1 week before
- First week in ${to}
- First month in ${to}
Cover banking, insurance, subscriptions, mail forwarding, tax filings, investment accounts.

SECTION 8 — HIDDEN COSTS & RISK ALERTS
Identify 6 specific hidden costs or risks for ${to} that catch people off guard. For each: what it is, why it's surprising, estimated cost range, how to mitigate.

SECTION 9 — 90-DAY ACTION PLAN
Week-by-week plan for first 90 days with 4–6 specific actionable tasks per week:
- Week 1 / Week 2 / Weeks 3–4 / Month 2 / Month 3

SECTION 10 — FINAL RECOMMENDATIONS & NEXT STEPS
2–3 paragraph conclusion with honest readiness assessment and single most important first step. Close with:
<div style="background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:12px;padding:16px 20px;margin-top:20px;font-family:Arial,sans-serif;">
<p style="font-size:13px;color:#0C4A6E;margin:0;line-height:1.75;"><strong>Not satisfied with this report?</strong> Contact us within 7 days at <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a> and we will regenerate your report with updated preferences at no extra charge.</p>
</div>

---
HTML FORMAT:
- Section h2: <h2 style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#0F172A;margin:32px 0 12px;padding-top:24px;border-top:2px solid #E2E8F0;">Title</h2>
- Sub-headers: <h3 style="font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#0284C7;margin:20px 0 8px;">Sub-header</h3>
- Body text: <p style="font-size:14px;color:#334155;line-height:1.8;margin:0 0 12px;">text</p>
- Lists: <ul style="padding-left:20px;margin:0 0 16px;"><li style="font-size:14px;color:#334155;line-height:1.8;margin-bottom:6px;">item</li></ul>
- Key ranges: <strong style="color:#0F172A;">$X,XXX–$Y,YYY</strong>

Write Sections 6–10 now. Do not stop early. Complete through Section 10.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EMAIL HTML BUILDER — upgraded footer with regeneration guarantee
// ─────────────────────────────────────────────────────────────────────────────
function buildEmailHTML(firstName, userData, reportContent, resendToken) {
  resendToken = resendToken || '';
  const fromCity   = toTitleCase(userData.from || 'Your City');
  const toCity     = toTitleCase(userData.to   || 'Destination');
  const reportType = userData.type || 'relocation';
  const reportDate = getReportDate();

  let routeHTML = '';
  if (reportType === 'relocation') {
    routeHTML =
      '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:28px;font-weight:normal;' +
      'color:#0F172A;letter-spacing:-0.3px;line-height:1.12;margin:0 0 4px;">' +
      fromCity + '<span style="color:#0EA5E9;margin:0 6px;">&#8594;</span>' + toCity +
      '</div>';
  } else if (reportType === 'nomad') {
    routeHTML =
      '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:26px;font-weight:normal;' +
      'color:#0F172A;line-height:1.12;margin:0 0 4px;">Digital Nomad Life Plan</div>';
  } else {
    const cities = [userData.city1, userData.city2, userData.city3]
      .filter(Boolean).map(toTitleCase);
    routeHTML =
      '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:24px;font-weight:normal;' +
      'color:#0F172A;line-height:1.15;margin:0 0 4px;">' + cities.join(' vs ') + '</div>';
  }

  const subLabel = reportType === 'relocation'
    ? 'AI Relocation Intelligence Report'
    : reportType === 'nomad' ? 'AI Nomad Planning Report' : 'AI City Comparison Report';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>MovingCOST.ai Report</title></head>' +
    '<body style="margin:0;padding:0;background:#EEF4FB;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">' +
    '<div style="max-width:640px;margin:0 auto;padding:24px 12px 48px;">' +

    // ── FLOATING BAR（独立色条，四边圆角，与卡片分离）──
    '<div style="background:linear-gradient(135deg,rgba(8,38,72,0.93) 0%,rgba(10,58,96,0.88) 50%,rgba(12,90,135,0.82) 100%);border-radius:13px;padding:11px 20px 10px;margin-bottom:8px;">' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:7px;"><tr>' +
    '<td style="vertical-align:middle;">' +
    '<span style="font-family:Georgia,\'Times New Roman\',serif;font-size:19.5px;font-weight:400;color:#7DD3FC;letter-spacing:-0.2px;">Moving</span>' +
    '<span style="font-family:Georgia,\'Times New Roman\',serif;font-size:19.5px;font-weight:500;color:#ffffff;letter-spacing:-0.2px;">COST</span>' +
    '<span style="font-family:Arial,sans-serif;font-size:11.5px;font-weight:300;color:rgba(255,255,255,0.4);margin-left:1px;">.ai</span>' +
    '</td>' +
    '<td style="text-align:right;vertical-align:middle;white-space:nowrap;">' +
    '<span style="font-size:8.5px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#7DD3FC;border:1px solid rgba(125,211,252,0.22);padding:3px 8px;border-radius:99px;">Full Access</span>' +
    '</td>' +
    '</tr></table>' +
    '<div style="height:1px;background:rgba(255,255,255,0.09);margin-bottom:7px;"></div>' +
    '<div style="text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;font-weight:400;color:rgba(255,255,255,0.90);letter-spacing:0.03em;">Move Smarter. Live Lighter.</div>' +
    '</div>' +

    // ── COVER CARD（主内容卡片）──
    '<div style="background:#ffffff;border-radius:18px;border:1px solid #DDE6F0;overflow:hidden;margin-bottom:10px;">' +

    // Route + meta
    '<div style="padding:18px 24px 20px;">' +
    '<div style="font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;' +
      'color:#0EA5E9;margin:0 0 7px;">Your next chapter</div>' +
    routeHTML +
    '<div style="font-size:11px;color:#64748B;margin:0 0 15px;letter-spacing:0.04em;' +
      'text-transform:uppercase;">' + subLabel + '</div>' +
    '<div style="height:1px;background:#F0F5FA;margin:0 0 14px;"></div>' +
    '<table style="width:100%;border-collapse:collapse;"><tr>' +
    '<td style="padding:0 18px 0 0;border-right:1px solid #E8EFF7;vertical-align:top;">' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#94A3B8;margin-bottom:2px;">Report Date</div>' +
    '<div style="font-size:12px;font-weight:500;color:#334155;">' + reportDate + '</div></td>' +
    '<td style="padding:0 18px;border-right:1px solid #E8EFF7;vertical-align:top;">' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#94A3B8;margin-bottom:2px;">Prepared For</div>' +
    '<div style="font-size:12px;font-weight:500;color:#334155;">' + firstName + '</div></td>' +
    '<td style="padding:0 0 0 18px;vertical-align:top;">' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#94A3B8;margin-bottom:2px;">Powered By</div>' +
    '<div style="font-size:12px;font-weight:500;color:#334155;">MovingCOST.ai</div></td>' +
    '</tr></table></div>' +

    // Stats bar
    '<table style="width:100%;border-collapse:collapse;border-top:1px solid #F0F5FA;"><tr>' +
    '<td style="text-align:center;padding:11px 0;border-right:1px solid #F0F5FA;">' +
    '<div style="font-size:17px;font-weight:600;color:#0EA5E9;">10</div>' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.09em;color:#94A3B8;margin-top:2px;">Sections</div></td>' +
    '<td style="text-align:center;padding:11px 0;border-right:1px solid #F0F5FA;">' +
    '<div style="font-size:17px;font-weight:600;color:#0EA5E9;">3,000+</div>' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.09em;color:#94A3B8;margin-top:2px;">Words</div></td>' +
    '<td style="text-align:center;padding:11px 0;">' +
    '<div style="font-size:17px;font-weight:600;color:#0EA5E9;">AI</div>' +
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:0.09em;color:#94A3B8;margin-top:2px;">Powered</div></td>' +
    '</tr></table></div>' +

    // ── Greeting ──
    '<div style="background:#ffffff;border-radius:14px;border:1px solid #DDE6F0;' +
      'padding:20px 24px;margin-bottom:14px;">' +
    '<h2 style="margin:0 0 10px;font-size:18px;font-weight:600;color:#0F172A;' +
      'font-family:Georgia,serif;">Hi ' + firstName + '! &#128075;</h2>' +
    '<p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:1.75;">Thank you for your purchase. Below is your ' +
      '<strong style="color:#0F172A;">AI-generated relocation planning report</strong>' +
      ' &#8212; built using your specific inputs to help you plan smarter.</p>' +
    '<p style="margin:0;color:#475569;font-size:14px;line-height:1.75;">This report covers 10 planning sections: ' +
      'cost estimates, housing guide, visa notes, tax planning, moving costs, checklists, and a 90-day action plan. ' +
      '<strong style="color:#0F172A;">Bookmark this email</strong> as your moving reference.</p>' +
    '</div>' +

    // ── Report content ──
    '<div style="background:#ffffff;border-radius:16px;padding:44px 44px;border:1px solid #E2E8F0;margin-bottom:20px;">' +
    reportContent +
    '</div>' +

    // ── Regeneration banner（Commit 3 将升级为带 token 的按钮）──
    '<div style="background:#FFF7ED;border:2px solid #FCD34D;border-radius:16px;' +
      'padding:28px 32px;margin-bottom:16px;text-align:center;">' +
    '<p style="margin:0 0 6px;font-size:18px;">&#128203;</p>' +
    '<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#92400E;">Not happy with your report?</p>' +
    '<p style="margin:0 0 16px;font-size:14px;color:#B45309;line-height:1.75;">' +
      'If your report looks incomplete or misses key details, reply to this email within ' +
      '<strong>7 days</strong> and we\'ll regenerate one updated version for you &#8212; completely free.</p>' +
    (resendToken
      ? '<a href="https://movingcost.ai/api/resend-report?token=' + resendToken + '" ' +
          'style="display:inline-block;background:#F59E0B;color:#fff;padding:12px 28px;' +
          'border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;">' +
          'Resend My Report &#8594;</a>' +
          '<p style="margin:10px 0 0;font-size:11px;color:#B45309;">' +
          'Valid for 7 days &nbsp;&#183;&nbsp; One-click resend to your inbox</p>'
      : '<a href="mailto:support@movingcost.ai" ' +
          'style="display:inline-block;background:#F59E0B;color:#fff;padding:12px 28px;' +
          'border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;">' +
          'Contact Support &#8594;</a>'
    ) +
    '</div>' +

    // ── New plan CTA ──
    '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;' +
      'padding:32px 40px;text-align:center;margin-bottom:20px;">' +
    '<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;">Need a new plan?</p>' +
    '<p style="margin:0 0 20px;font-size:14px;color:#64748B;">Run another analysis &#8212; new city, new scenario, updated numbers.</p>' +
    '<a href="https://movingcost.ai/planner" style="display:inline-block;background:#0EA5E9;color:#fff;' +
      'padding:14px 36px;border-radius:99px;text-decoration:none;font-weight:700;font-size:15px;">' +
      'Start Another Plan &#8594;</a>' +
    '</div>' +

    // ── Footer ──
    '<div style="text-align:center;padding:20px 0;">' +
    '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0F172A;">MovingCOST.ai</p>' +
    '<p style="margin:0 0 8px;font-size:12px;color:#94A3B8;line-height:1.8;">' +
    'Questions or issues? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;font-weight:600;">support@movingcost.ai</a>' +
    ' &nbsp;&#183;&nbsp; <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a></p>' +
    '<p style="margin:6px 0 0;font-size:11px;color:#CBD5E1;line-height:1.7;">' +
    'This report is AI-generated for planning purposes only and does not constitute legal, tax, immigration, or financial advice.<br>' +
    'Verify all important decisions with qualified professionals before acting. &#169; 2026 CLASSIC SPREAD INC</p>' +
    '</div>' +

    '</div></body></html>';
}

// Vercel: extended duration for full AI report generation + email send
module.exports.config = { maxDuration: 800 };
