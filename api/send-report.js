// api/send-report.js
// 用 fetch 直接调用 Anthropic API（不需要 SDK）→ Resend 发送邮件

const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, userData, previewReport } = req.body;

    if (!email || !userData) {
      return res.status(400).json({ error: 'Missing email or userData' });
    }

    // ── Step 1: Call Claude API directly via fetch ──
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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      throw new Error('Claude API error: ' + errText.slice(0, 200));
    }

    const anthropicData = await anthropicResp.json();
    const reportContent = anthropicData.content?.[0]?.text || 'Report content unavailable.';

    // ── Step 2: Build email HTML ──
    const firstName = (name || 'there').split(' ')[0];
    const emailHTML = buildEmailHTML(firstName, userData, previewReport, reportContent);

    // ── Step 3: Send via Resend ──
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
  if (d.type === 'relocation') return (d.from || 'Your City') + ' to ' + (d.to || 'Destination');
  if (d.type === 'nomad') return 'Digital Nomad Life Plan';
  return 'City Comparison Report';
}

function buildFullReportPrompt(d, preview) {
  const previewCtx = preview ? 'Preview shown: ' + preview.headline + '. ' + preview.summary : '';
  return 'You are MovingCOST.ai senior analyst. Generate a comprehensive paid relocation report in clean HTML with inline styles (email-safe). User paid $9.90 for this.\n\nUser: ' + JSON.stringify(d) + '\n' + previewCtx + '\n\nWrite 8 detailed sections covering: 1) Executive Summary, 2) Monthly Cost Breakdown with real numbers, 3) Housing Market Analysis with neighborhoods and rent ranges, 4) Visa & Immigration step-by-step, 5) Tax Strategy, 6) Top 5 Savings Opportunities, 7) Hidden Costs & Risks, 8) 90-Day Action Checklist week by week. Use <h3> for section titles, <p> for text, <ul> for lists. Be specific, use real numbers. No CSS classes, only inline styles for email compatibility.';
}

function buildEmailHTML(firstName, userData, preview, reportContent) {
  var subject = getSubjectLine(userData);
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;color:#0F172A;">' +
    '<div style="max-width:640px;margin:0 auto;padding:32px 16px 60px;">' +
    '<div style="background:linear-gradient(135deg,#0F172A,#0E3D5C);border-radius:16px;padding:44px 40px;text-align:center;margin-bottom:24px;">' +
    '<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#BAE6FD;margin-bottom:12px;">Full Report — Paid</div>' +
    '<h1 style="margin:0;font-size:32px;font-weight:800;color:#fff;">Moving<span style="color:#0EA5E9;">COST</span>.ai</h1>' +
    '<p style="margin:12px 0 0;color:rgba(255,255,255,0.65);font-size:15px;">' + subject + '</p></div>' +
    '<div style="background:#fff;border-radius:14px;padding:32px 36px;border:1px solid #E2E8F0;margin-bottom:16px;">' +
    '<h2 style="margin:0 0 12px;font-size:20px;color:#0F172A;">Hi ' + firstName + '! 👋</h2>' +
    '<p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">Your complete AI-powered relocation report is below. Bookmark this email — it\'s your moving command center.</p></div>' +
    '<div style="background:#fff;border-radius:14px;padding:36px;border:1px solid #E2E8F0;margin-bottom:16px;line-height:1.75;font-size:14px;color:#334155;">' +
    reportContent + '</div>' +
    '<div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:14px;padding:28px 36px;text-align:center;margin-bottom:16px;">' +
    '<p style="margin:0 0 16px;font-size:15px;color:#0F172A;font-weight:600;">Need help with your move?</p>' +
    '<a href="https://movingcost.ai/planner" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 32px;border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;">Run Another Plan</a>' +
    '<p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">Questions? Write to <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a></p></div>' +
    '<div style="text-align:center;padding:20px 0;"><p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.8;"><strong style="color:#0F172A;">MovingCOST.ai</strong><br><a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a></p></div>' +
    '</div></body></html>';
}
