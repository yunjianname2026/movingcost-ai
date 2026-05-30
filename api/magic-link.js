import { Resend } from 'resend';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
  const normalizedEmail = email.toLowerCase().trim();
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // 查用户
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email,points_balance`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const users = await userRes.json();
    console.log('USERS:', JSON.stringify(users));
    if (!users || users.length === 0) return res.status(200).json({ success: false, message: 'No account found with this email.' });
    const user = users[0];

    // 生成token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 删除旧token
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/magic_tokens?email=eq.${encodeURIComponent(normalizedEmail)}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    console.log('DELETE STATUS:', delRes.status);

    // 插入新token
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/magic_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: normalizedEmail, token, expires_at: expiresAt, used: false })
    });
    const insText = await insRes.text();
    console.log('INSERT STATUS:', insRes.status, 'BODY:', insText);

    if (insRes.status !== 201) {
      return res.status(500).json({ error: 'Failed to store token', detail: insText });
    }

    // 发邮件
    const baseUrl = process.env.BASE_URL || 'https://www.movingcost.ai';
    const magicLink = `${baseUrl}/verify?token=${token}`;
    const points = user.points_balance || 0;

    const { error: emailError } = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: normalizedEmail,
      subject: 'Your secure login link — MovingCOST.ai',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#EFF6FF;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:48px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#0F172A 0%,#0B2545 100%);border-radius:16px 16px 0 0;padding:36px 44px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-family:Outfit,Arial,sans-serif;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
          Moving<span style="color:#0EA5E9;">COST</span><span style="font-size:13px;color:#7DD3FC;font-weight:500;vertical-align:super;margin-left:1px;">.ai</span>
        </div>
        <div style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">Secure Login</div>
      </td>
      <td align="right">
        <div style="width:40px;height:40px;background:rgba(14,165,233,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;display:inline-block;">✨</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:44px 44px 36px;">
    <h1 style="margin:0 0 10px;font-family:Outfit,Arial,sans-serif;font-size:28px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;line-height:1.2;">
      Your login link<br>is ready
    </h1>
    <p style="margin:0 0 6px;font-size:15px;color:#475569;line-height:1.65;">
      We received a request to log in to your <strong style="color:#0F172A;">MovingCOST.ai</strong> account. Click below — no password needed.
    </p>
    <p style="margin:0 0 36px;font-size:13px;color:#94A3B8;">
      ⏱ Expires in <strong style="color:#475569;">30 minutes</strong> · one-time use only
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr><td style="background:#0EA5E9;border-radius:10px;box-shadow:0 4px 14px rgba(14,165,233,0.30);">
        <a href="${magicLink}" style="display:inline-block;padding:16px 44px;font-family:Outfit,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
          Log In to My Dashboard →
        </a>
      </td></tr>
    </table>

    <!-- Points badge -->
    <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:18px 22px;margin-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:22px;width:36px;vertical-align:top;">💎</td>
        <td style="padding-left:12px;vertical-align:top;">
          <div style="font-size:13px;font-weight:700;color:#0F172A;">You have <span style="color:#0EA5E9;">${points} MovingCOST Points</span></div>
          <div style="font-size:12px;color:#64748B;margin-top:3px;">Keep earning — share, complete EarthSoul Quiz, and more</div>
        </td>
      </tr></table>
    </div>

    <!-- Security tip -->
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:14px 20px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:18px;width:28px;vertical-align:top;">🔒</td>
        <td style="padding-left:10px;font-size:13px;color:#92400E;line-height:1.5;vertical-align:top;">
          <strong>Security tip:</strong> MovingCOST.ai will never ask for your password by email.
        </td>
      </tr></table>
    </div>

    <!-- Fallback link -->
    <div style="border-top:1px solid #F1F5F9;padding-top:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#94A3B8;">Button not working? Copy this link:</p>
      <a href="${magicLink}" style="font-size:11px;color:#0EA5E9;word-break:break-all;line-height:1.6;">${magicLink}</a>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F8FBFF;border-radius:0 0 16px 16px;padding:22px 44px;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.7;">
      You're receiving this because a login was requested for <strong style="color:#64748B;">${normalizedEmail}</strong>.<br>
      Questions? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;text-decoration:none;">support@movingcost.ai</a>
      &nbsp;·&nbsp; © 2025 CLASSIC SPREAD INC &nbsp;·&nbsp;
      <a href="https://movingcost.ai" style="color:#0EA5E9;text-decoration:none;">movingcost.ai</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
    });

    if (emailError) return res.status(500).json({ error: 'Failed to send email', detail: emailError.message });
    return res.status(200).json({ success: true, message: 'Magic link sent! Check your inbox.' });

  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
