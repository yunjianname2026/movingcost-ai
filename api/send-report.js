// api/send-report.js
const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, name, userData, previewReport } = req.body;
    if (!email || !userData) return res.status(400).json({ error: 'Missing email or userData' });

    const prompt = buildFullReportPrompt(userData, previewReport);

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      throw new Error('Claude API error: ' + errText.slice(0, 200));
    }

    const anthropicData = await anthropicResp.json();
    const reportContent = anthropicData.content?.[0]?.text || 'Report generation failed.';

    const firstName = (name || 'there').split(' ')[0];
    const emailHTML = buildEmailHTML(firstName, userData, previewReport, reportContent);

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: email,
      subject: 'Your MovingCOST.ai Full Report — ' + getSubjectLine(userData),
      html: emailHTML,
    });

    console.log('Full report sent to: ' + email);
    return res.status(200).json({ sent: true });

  } catch (err) {
    console.error('send-report error:', err.message);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

function getSubjectLine(d) {
  if (d.type === 'relocation') return (d.from || 'Your City') + ' to ' + (d.to || 'Destination') + ' Relocation Report';
  if (d.type === 'nomad') return 'Digital Nomad Life Plan';
  return 'City Comparison Report';
}

function buildFullReportPrompt(d, preview) {
  const type = d.type || 'relocation';
  const from = d.from || 'current city';
  const to = d.to || 'destination';
  const who = d.who || 'individual';
  const income = d.income || 'not specified';
  const lifestyle = d.lifestyle || 'not specified';
  const notes = d.notes || 'none';
  const previewCtx = preview ? '\nPreview already shown to user:\n- Headline: ' + preview.headline + '\n- Summary: ' + preview.summary : '';

  return `You are MovingCOST.ai's senior relocation analyst. A customer has paid $9.90 for a comprehensive, professional relocation report. This must be a DETAILED, HIGH-VALUE document — approximately 3,000–4,500 words of substantive, specific, actionable content. Write like a professional consultant who deeply knows both the origin and destination cities.

USER PROFILE:
- Move type: ${type}
- From: ${from} | To: ${to}
- Household: ${who}
- Monthly income: ${income}
- Lifestyle: ${lifestyle}
- Additional notes: ${notes}
- Full data: ${JSON.stringify(d)}
${previewCtx}

CRITICAL REQUIREMENTS:
- Use REAL, SPECIFIC numbers (actual rent prices, visa fees, tax rates, costs)
- Every section must have substantial detail — no padding, no vague advice
- Write in a warm, expert consultant tone
- Format in clean HTML with inline styles only (email-safe, no CSS classes)
- Each major section should be 200–400 words minimum

Generate ALL of the following sections in full detail:

---

SECTION 1 — EXECUTIVE SUMMARY
Write 3-4 substantial paragraphs covering: the key financial opportunity or challenge of this move, the single most important strategic recommendation, the 3 biggest factors that will determine success, and an honest assessment of the move's feasibility for this household profile. Be direct, data-driven, and specific.

SECTION 2 — COMPLETE MONTHLY COST BREAKDOWN
Create a detailed side-by-side comparison table of ${from} vs ${to}. Include SPECIFIC numbers for:
- Housing (1BR, 2BR, 3BR apartments in different neighborhoods)
- Utilities (electricity, water, internet, gas)
- Groceries and food at home
- Dining out (budget, mid-range, upscale)
- Transportation (public transit pass, car ownership costs, rideshare estimate)
- Healthcare (health insurance, GP visit, specialist, dental)
- Childcare / schools (if applicable)
- Entertainment and leisure
- Clothing and personal care
- Phone plan
- TOTAL estimated monthly burn rate
Include a savings/cost increase calculation with annual projection.

SECTION 3 — HOUSING MARKET DEEP DIVE
Cover in detail:
- Best 4-5 neighborhoods in ${to} for someone with this profile, with specific pros/cons and rent ranges
- Current market conditions: renter's vs landlord's market?
- What to expect in the rental process (deposits, references, lease terms)
- Furnished vs unfurnished: what's available and price difference
- Short-term options for the first 1-3 months (serviced apartments, Airbnb alternatives)
- Red flags to watch for and common expat mistakes
- Top platforms and resources to find housing remotely
- Typical move-in costs (first month, deposit, agent fees)

SECTION 4 — VISA & IMMIGRATION PATHWAY
Provide a thorough analysis of:
- The 2-3 best visa options for this specific person's situation with pros/cons of each
- Exact eligibility requirements for the recommended visa(s)
- Step-by-step application process with realistic timeline (weeks/months per step)
- All associated fees (application, biometrics, legal, translation, etc.)
- Documents required: complete checklist
- Common reasons for rejection and how to avoid them
- Path to permanent residency or long-term status if applicable
- Whether a local immigration lawyer is recommended and approximate cost
- Dependent visa options if traveling with family

SECTION 5 — TAX STRATEGY & FINANCIAL PLANNING
Detailed guidance on:
- Tax residency rules: when do you become a tax resident of ${to}?
- How long until you lose tax residency in ${from}?
- Double taxation treaty status between the two countries
- Specific tax rates in ${to} (income tax brackets, social contributions, capital gains)
- Tax optimization strategies legal for this person's income type
- Foreign earned income exclusion or equivalent if applicable
- Banking strategy: which accounts to keep, which to open, recommended banks in ${to}
- Currency risk and how to manage it
- Pension/retirement account implications
- What to set up BEFORE departure vs after arrival
- Recommended type of accountant/tax advisor to hire

SECTION 6 — COST OF MOVING: WHAT IT ACTUALLY COSTS
Break down the one-time moving costs:
- International shipping options (air freight, sea freight, moving container) with price ranges
- What's worth shipping vs. selling and replacing
- Pet relocation costs and process if applicable
- Vehicle import or sale — what makes financial sense
- Insurance for goods in transit
- Storage costs if needed
- Travel costs for the move (flights, temporary accommodation)
- Total estimated one-time moving budget range (low / mid / high)

SECTION 7 — FINANCIAL SETUP CHECKLIST — BEFORE YOU LEAVE
Itemized list of financial tasks with deadlines:
- 6 months before: what to do
- 3 months before: what to do
- 1 month before: what to do
- 1 week before: what to do
- First week in ${to}: what to do
- First month in ${to}: what to do
Include: banking, tax filings, insurance cancellations, mail forwarding, investment accounts, credit cards, etc.

SECTION 8 — TOP 7 MONEY-SAVING OPPORTUNITIES
For each of 7 specific savings opportunities, write 2-3 sentences explaining exactly how to capture it and the estimated monthly or annual saving in dollars. Make these highly specific to this person's profile and destination.

SECTION 9 — HIDDEN COSTS & RISK ALERTS
Identify 6 specific hidden costs or risks that most people moving to ${to} don't anticipate. For each: what it is, why it catches people off guard, how much it typically costs, and how to mitigate it.

SECTION 10 — 90-DAY ACTION PLAN
A detailed week-by-week plan for the first 90 days:
- Week 1: Settling in, immediate priorities
- Week 2: Administrative setup
- Week 3-4: Building routines and systems
- Month 2: Integration and optimization
- Month 3: Review and adjust
Each week should have 4-6 specific, actionable tasks.

SECTION 11 — RECOMMENDED RESOURCES & SERVICE PROVIDERS
List specific types of resources for:
- Finding housing (specific websites and communities for ${to})
- Expat communities and networks
- Banking recommendations
- Healthcare registration
- Tax and legal professionals (what to look for)
- Language learning if needed
- Emergency contacts and embassies

SECTION 12 — FINAL RECOMMENDATION & NEXT STEPS
A strong 2-3 paragraph conclusion with: your honest assessment of the move's timing and readiness, the single most important first step to take this week, and an encouraging, expert sign-off.

---

FORMAT REQUIREMENTS:
Use this HTML structure for each section:
- Section headers: <h2 style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#0F172A;margin:32px 0 12px;padding-top:24px;border-top:2px solid #E2E8F0;">Section Title</h2>
- Sub-headers: <h3 style="font-family:Arial,sans-serif;font-size:16px;font-weight:600;color:#0284C7;margin:20px 0 8px;">Sub-header</h3>
- Paragraphs: <p style="font-size:14px;color:#334155;line-height:1.8;margin:0 0 12px;">text</p>
- Lists: <ul style="padding-left:20px;margin:0 0 16px;"><li style="font-size:14px;color:#334155;line-height:1.8;margin-bottom:6px;">item</li></ul>
- Important callouts: <div style="background:#F0F9FF;border-left:4px solid #0EA5E9;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="font-size:14px;color:#0C4A6E;margin:0;line-height:1.7;">callout text</p></div>
- Warning callouts: <div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:14px 18px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="font-size:14px;color:#92400E;margin:0;line-height:1.7;">warning text</p></div>
- Cost tables: use simple HTML table with inline styles
- Numbers/amounts: wrap in <strong style="color:#0F172A;">$X,XXX</strong>

Write all 12 sections now. Do not skip or abbreviate any section. This is a paid professional report.`;
}

function buildEmailHTML(firstName, userData, preview, reportContent) {
  var subject = getSubjectLine(userData);
  var from = userData.from || 'Your City';
  var to = userData.to || 'Your Destination';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MovingCOST.ai Report</title></head>' +
    '<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">' +

    // Wrapper
    '<div style="max-width:680px;margin:0 auto;padding:32px 16px 60px;">' +

    // Header
    '<div style="background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#0E3D5C 100%);border-radius:20px;padding:48px 44px;text-align:center;margin-bottom:20px;">' +
    '<div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#BAE6FD;margin-bottom:14px;">Paid Report · Full Access</div>' +
    '<h1 style="margin:0 0 8px;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;">Moving<span style="color:#0EA5E9;">COST</span>.ai</h1>' +
    '<p style="margin:14px 0 0;color:rgba(255,255,255,0.7);font-size:16px;line-height:1.5;">' + subject + '</p>' +
    '</div>' +

    // Greeting card
    '<div style="background:#ffffff;border-radius:16px;padding:36px 40px;border:1px solid #E2E8F0;margin-bottom:16px;">' +
    '<h2 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#0F172A;">Hi ' + firstName + '! 👋</h2>' +
    '<p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.75;">Thank you for your purchase. Below is your <strong style="color:#0F172A;">complete, professional-grade relocation report</strong> — built specifically for your situation by our AI analyst.</p>' +
    '<p style="margin:0;color:#475569;font-size:15px;line-height:1.75;">This report covers 12 sections including cost breakdowns, visa pathways, tax strategy, housing analysis, and a 90-day action plan. <strong style="color:#0F172A;">Bookmark this email</strong> — it\'s your moving command center.</p>' +
    '</div>' +

    // Stats bar
    '<div style="background:#0EA5E9;border-radius:12px;padding:20px 28px;margin-bottom:20px;display:flex;justify-content:space-around;text-align:center;">' +
    '<div><div style="font-size:22px;font-weight:800;color:#fff;">12</div><div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px;">Sections</div></div>' +
    '<div style="border-left:1px solid rgba(255,255,255,0.3);margin:0 8px"></div>' +
    '<div><div style="font-size:22px;font-weight:800;color:#fff;">4,000+</div><div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px;">Words</div></div>' +
    '<div style="border-left:1px solid rgba(255,255,255,0.3);margin:0 8px"></div>' +
    '<div><div style="font-size:22px;font-weight:800;color:#fff;">100%</div><div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:2px;">Personalized</div></div>' +
    '</div>' +

    // Report content
    '<div style="background:#ffffff;border-radius:16px;padding:44px 44px;border:1px solid #E2E8F0;margin-bottom:20px;">' +
    reportContent +
    '</div>' +

    // Footer CTA
    '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:32px 40px;text-align:center;margin-bottom:20px;">' +
    '<p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;">Need a new plan?</p>' +
    '<p style="margin:0 0 20px;font-size:14px;color:#64748B;">Run another analysis — new city, new scenario, updated numbers.</p>' +
    '<a href="https://movingcost.ai/planner" style="display:inline-block;background:#0EA5E9;color:#fff;padding:14px 36px;border-radius:99px;text-decoration:none;font-weight:700;font-size:15px;">Start Another Plan →</a>' +
    '</div>' +

    // Footer
    '<div style="text-align:center;padding:20px 0;">' +
    '<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0F172A;">MovingCOST.ai</p>' +
    '<p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.8;">' +
    'Questions? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a> &nbsp;·&nbsp; ' +
    '<a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a>' +
    '</p></div>' +

    '</div></body></html>';
}
