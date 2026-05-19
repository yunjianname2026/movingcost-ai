// api/send-report.js
// 接收用户数据 → 调用 Claude 生成完整报告 → Resend 发送邮件

const { Resend } = require('resend');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, userData, previewReport } = req.body;
  if (!email || !userData) return res.status(400).json({ error: 'Missing email or userData' });

  try {
    // ── Step 1: Generate full report with Claude ──
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const prompt = buildFullReportPrompt(userData, previewReport);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const fullReportText = message.content[0]?.text || '';

    // ── Step 2: Build email HTML ──
    const firstName = (name || 'there').split(' ')[0];
    const emailHTML = buildEmailHTML(firstName, userData, previewReport, fullReportText);

    // ── Step 3: Send via Resend ──
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: email,
      subject: `✅ Your MovingCOST.ai Full Report — ${getSubjectLine(userData)}`,
      html: emailHTML,
    });

    console.log(`✅ Full report sent to: ${email}`);
    return res.status(200).json({ sent: true });

  } catch (err) {
    console.error('❌ send-report error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── Build the full report prompt ─────────────────────────────────────────────
function buildFullReportPrompt(d, preview) {
  const previewContext = preview ? `
The user already saw this preview:
- Headline: ${preview.headline}
- Summary: ${preview.summary}
- Key insights: ${JSON.stringify(preview.insights)}
` : '';

  return `You are MovingCOST.ai's senior analyst. The user just purchased a full report for $9.90. Generate a comprehensive, highly detailed relocation report in clean HTML (no CSS, just semantic HTML with inline styles for email compatibility).

User profile:
- Type: ${d.type}
- From: ${d.from} | To: ${d.to || 'various'}
- Timeline: ${d.timeline} | Household: ${d.who}
- Income: ${d.income || 'not specified'}
- Lifestyle: ${d.lifestyle || 'not specified'}
- Notes: ${d.notes || 'none'}
- Additional data: ${JSON.stringify(d)}
${previewContext}

Write the full report as detailed HTML sections covering:

1. **Executive Summary** — 3-4 sentences with the key finding and main recommendation
2. **Cost of Living Breakdown** — Detailed monthly costs (housing, food, transport, healthcare, utilities, entertainment) with specific numbers for their destination
3. **Housing Market Analysis** — Best neighborhoods for their budget, typical rent ranges, what to expect
4. **Visa & Immigration Pathway** — Specific visa options, requirements, costs, timeline, step-by-step process
5. **Tax Strategy & Financial Planning** — Tax implications, optimization strategies, banking recommendations, what to set up before moving
6. **Savings Opportunities** — Top 5 specific ways to save money in their situation
7. **Hidden Costs & Risk Alerts** — 3-4 things most people overlook that cost money
8. **90-Day Action Checklist** — Week-by-week action items for the first 3 months
9. **Recommended Service Partners** — Types of services to engage (movers, lawyers, accountants etc.)

Format each section with a clear heading. Be specific, practical, and personalized to their exact situation. Use real numbers. This is a paid product — make it genuinely valuable.

Return only the HTML content for the sections, no DOCTYPE or full HTML page structure needed.`;
}

// ── Build email HTML wrapper ─────────────────────────────────────────────────
function buildEmailHTML(firstName, userData, preview, reportContent) {
  const subjectLine = getSubjectLine(userData);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;color:#0F172A;">
<div style="max-width:640px;margin:0 auto;padding:32px 16px 60px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0F172A 0%,#0C2340 60%,#0E3D5C 100%);border-radius:16px;padding:44px 40px;text-align:center;margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#BAE6FD;margin-bottom:12px;">Full Report — Paid</div>
    <h1 style="margin:0;font-size:32px;font-weight:800;color:#fff;letter-spacing:-1px;">Moving<span style="color:#0EA5E9;">COST</span>.ai</h1>
    <p style="margin:12px 0 0;color:rgba(255,255,255,0.65);font-size:15px;">${subjectLine}</p>
  </div>

  <!-- Greeting -->
  <div style="background:#fff;border-radius:14px;padding:32px 36px;border:1px solid #E2E8F0;margin-bottom:16px;">
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0F172A;">Hi ${firstName}! 👋</h2>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">Your complete AI-powered relocation report is below. This is a comprehensive, personalized analysis built specifically for your situation. Bookmark this email — it's your moving command center.</p>
  </div>

  <!-- Full Report Content -->
  <div style="background:#fff;border-radius:14px;padding:36px;border:1px solid #E2E8F0;margin-bottom:16px;line-height:1.75;font-size:14px;color:#334155;">
    ${reportContent}
  </div>

  <!-- CTA -->
  <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:14px;padding:28px 36px;text-align:center;margin-bottom:16px;">
    <p style="margin:0 0 16px;font-size:15px;color:#0F172A;font-weight:600;">Need help with your move?</p>
    <a href="https://movingcost.ai/planner" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 32px;border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:12px;">Run Another Plan →</a>
    <p style="margin:0;font-size:12px;color:#94A3B8;">Questions? Reply to this email or write to <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a></p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px 0;">
    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.8;">
      <strong style="color:#0F172A;">MovingCOST.ai</strong> · Helping people move smarter<br>
      <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a>
    </p>
  </div>

</div>
</body>
</html>`;
}

function getSubjectLine(d) {
  if (d.type === 'relocation') return `${d.from} → ${d.to} Relocation Report`;
  if (d.type === 'nomad') return `Digital Nomad Life Plan`;
  return `City Comparison Report`;
}
