// api/send-report.js
const { Resend } = require('resend');

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

    console.log('before buildFullReportPrompt');
    const prompt = buildFullReportPrompt(userData, previewReport, []);
    console.log('after buildFullReportPrompt');

    console.log('before callClaude');
    const raw = await callClaude(prompt);
    console.log('after callClaude, raw length:', raw ? raw.length : 0);

    if (!raw || !raw.trim()) {
      return res.status(500).json({ error: 'Report generation returned empty content. Please try again or contact support.' });
    }

    console.log('before validateReport');
    const validationIssues = validateReport(raw);
    console.log('after validateReport, issues:', validationIssues.length);
    if (validationIssues.length > 0) {
      console.warn('Validation notes (single pass, no retry):', validationIssues.join('; '));
    }

    const reportContent = raw;
    const firstName = (name || 'there').split(' ')[0];

    console.log('before buildEmailHTML');
    const emailHTML = buildEmailHTML(firstName, userData, reportContent);
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
async function callClaude(prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 24000,
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
// 6. PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function getSubjectLine(d) {
  if (d.type === 'relocation') return (d.from || 'Your City') + ' → ' + (d.to || 'Destination') + ' Relocation Report';
  if (d.type === 'nomad') return 'Your Digital Nomad Life Plan';
  return 'Your City Comparison Report';
}

function buildFullReportPrompt(d, preview, retryIssues) {
  const type     = d.type || 'relocation';
  const from     = d.from || 'current city';
  const to       = d.to   || 'destination';
  const who      = d.who  || 'individual';
  const income   = d.income   || 'not specified';
  const lifestyle= d.lifestyle|| 'not specified';
  const notes    = d.notes    || 'none';
  const destNotes= getDestinationNotes(d);
  const previewCtx = preview
    ? '\nPreview report shown to user — headline: "' + preview.headline + '" / summary: "' + preview.summary + '"'
    : '';
  const retryCtx = retryIssues && retryIssues.length > 0
    ? '\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Fix these issues in this attempt:\n- ' + retryIssues.join('\n- ')
    : '';

  return `Generate a comprehensive AI-powered relocation planning report for a paying customer. Follow all system rules strictly.

USER PROFILE:
- Move type: ${type}
- From: ${from} → To: ${to}
- Household: ${who}
- Monthly income: ${income}
- Lifestyle: ${lifestyle}
- Additional notes: ${notes}
- Full data: ${JSON.stringify(d)}
${previewCtx}${destNotes}${retryCtx}

OUTPUT REQUIREMENTS:
- Write approximately 3,000–4,500 words of substantive content
- Use RANGES for all cost estimates (e.g. "$1,800–$2,400/month")
- Use cautious, hedged language for visa, tax, and immigration sections
- Format in email-safe HTML with inline styles only
- Include the disclaimer block verbatim as shown in Section 0
- All 10 sections must be present and substantial

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

SECTION 6 — ONE-TIME MOVING COSTS
Estimated ranges for: international shipping options (air / sea / container); what to ship vs sell; pet relocation if applicable; vehicle decisions; transit insurance; storage if needed; flights and temporary accommodation; total moving budget: budget / mid / premium scenario.

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
- Info callout: <div style="background:#F0F9FF;border-left:4px solid #0EA5E9;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="font-size:14px;color:#0C4A6E;margin:0;line-height:1.7;">text</p></div>
- Warning callout: <div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="font-size:14px;color:#92400E;margin:0;line-height:1.7;">text</p></div>
- Key ranges: <strong style="color:#0F172A;">$X,XXX–$Y,YYY</strong>
- Cost tables: simple HTML table with border-collapse:collapse, alternating #F8FAFC / #fff rows

Write all 10 sections now. Do not skip or abbreviate any section. Do not stop early. Complete the entire report including all sections through Section 10.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EMAIL HTML BUILDER — upgraded footer with regeneration guarantee
// ─────────────────────────────────────────────────────────────────────────────
function buildEmailHTML(firstName, userData, reportContent) {
  const subject = getSubjectLine(userData);

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MovingCOST.ai Report</title></head>' +
    '<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">' +
    '<div style="max-width:680px;margin:0 auto;padding:32px 16px 60px;">' +

    // ── Header ──
    '<div style="background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#0E3D5C 100%);border-radius:20px;padding:48px 44px;text-align:center;margin-bottom:20px;">' +
    '<div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#BAE6FD;margin-bottom:14px;">AI Planning Report · Full Access</div>' +
    '<h1 style="margin:0 0 8px;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;">Moving<span style="color:#0EA5E9;">COST</span>.ai</h1>' +
    '<p style="margin:14px 0 0;color:rgba(255,255,255,0.7);font-size:16px;line-height:1.5;">' + subject + '</p>' +
    '</div>' +

    // ── Greeting ──
    '<div style="background:#ffffff;border-radius:16px;padding:36px 40px;border:1px solid #E2E8F0;margin-bottom:16px;">' +
    '<h2 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#0F172A;">Hi ' + firstName + '! 👋</h2>' +
    '<p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.75;">Thank you for your purchase. Below is your <strong style="color:#0F172A;">AI-generated relocation planning report</strong> — built using your specific inputs to help you plan smarter.</p>' +
    '<p style="margin:0;color:#475569;font-size:15px;line-height:1.75;">This report covers 10 planning sections: cost estimates, housing guide, visa notes, tax planning, moving costs, checklists, and a 90-day action plan. <strong style="color:#0F172A;">Bookmark this email</strong> as your moving reference.</p>' +
    '</div>' +

    // ── Stats bar ──
    '<div style="background:#0EA5E9;border-radius:12px;padding:20px 28px;margin-bottom:20px;">' +
    '<table style="width:100%;border-collapse:collapse;"><tr>' +
    '<td style="text-align:center;padding:0 8px;"><div style="font-size:22px;font-weight:800;color:#fff;">10</div><div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;">Sections</div></td>' +
    '<td style="border-left:1px solid rgba(255,255,255,0.3);text-align:center;padding:0 8px;"><div style="font-size:22px;font-weight:800;color:#fff;">3,000+</div><div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;">Words</div></td>' +
    '<td style="border-left:1px solid rgba(255,255,255,0.3);text-align:center;padding:0 8px;"><div style="font-size:22px;font-weight:800;color:#fff;">AI</div><div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;">Powered</div></td>' +
    '</tr></table>' +
    '</div>' +

    // ── Report content ──
    '<div style="background:#ffffff;border-radius:16px;padding:44px 44px;border:1px solid #E2E8F0;margin-bottom:20px;">' +
    reportContent +
    '</div>' +

    // ── NEW: Regeneration Guarantee Banner ──
    '<div style="background:#FFF7ED;border:2px solid #FCD34D;border-radius:16px;padding:28px 32px;margin-bottom:16px;text-align:center;">' +
    '<p style="margin:0 0 6px;font-size:18px;">📋</p>' +
    '<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#92400E;">Not happy with your report?</p>' +
    '<p style="margin:0 0 16px;font-size:14px;color:#B45309;line-height:1.75;">If your report looks incomplete or misses key details, reply to this email within <strong>7 days</strong> and we\'ll regenerate one updated version for you — completely free.</p>' +
    '<a href="mailto:support@movingcost.ai" style="display:inline-block;background:#F59E0B;color:#fff;padding:12px 28px;border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;">Reply to Request Regeneration →</a>' +
    '</div>' +

    // ── New plan CTA ──
    '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:32px 40px;text-align:center;margin-bottom:20px;">' +
    '<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;">Need a new plan?</p>' +
    '<p style="margin:0 0 20px;font-size:14px;color:#64748B;">Run another analysis — new city, new scenario, updated numbers.</p>' +
    '<a href="https://movingcost.ai/planner" style="display:inline-block;background:#0EA5E9;color:#fff;padding:14px 36px;border-radius:99px;text-decoration:none;font-weight:700;font-size:15px;">Start Another Plan →</a>' +
    '</div>' +

    // ── Footer ──
    '<div style="text-align:center;padding:20px 0;">' +
    '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0F172A;">MovingCOST.ai</p>' +
    '<p style="margin:0 0 8px;font-size:12px;color:#94A3B8;line-height:1.8;">' +
    'Questions or issues? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;font-weight:600;">support@movingcost.ai</a>' +
    ' &nbsp;·&nbsp; <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a>' +
    '</p>' +
    '<p style="margin:6px 0 0;font-size:11px;color:#CBD5E1;line-height:1.7;">' +
    'This report is AI-generated for planning purposes only and does not constitute legal, tax, immigration, or financial advice.<br>' +
    'Verify all important decisions with qualified professionals before acting. Generated May 2026 · CLASSIC SPREAD INC' +
    '</p>' +
    '</div>' +

    '</div></body></html>';
}

// Vercel: extended duration for full AI report generation + email send
module.exports.config = { maxDuration: 800 };
