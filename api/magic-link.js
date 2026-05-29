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
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F6FF;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0F172A;border-radius:12px 12px 0 0;padding:28px 40px;">
<span style="font-size:22px;font-weight:700;color:#fff;">Moving<span style="color:#0EA5E9;">COST</span><sup style="font-size:11px;color:#0EA5E9;">ai</sup></span>
</td></tr>
<tr><td style="background:#fff;padding:48px 40px;">
<h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#0F172A;">Your login link is ready ✨</h1>
<p style="margin:0 0 6px;font-size:15px;color:#475569;line-height:1.6;">We received a request to log in to your <strong>MovingCOST.ai</strong> account. Click the button below — no password needed.</p>
<p style="margin:0 0 32px;font-size:13px;color:#94A3B8;">⏱ This link expires in <strong>30 minutes</strong> and can only be used once.</p>
<table cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr><td style="background:#0EA5E9;border-radius:8px;">
<a href="${magicLink}" style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;">Log In to My Dashboard →</a>
</td></tr></table>
<div style="background:#F0F6FF;border-radius:8px;padding:16px 20px;margin-bottom:32px;border-left:3px solid #0EA5E9;">
<p style="margin:0;font-size:14px;color:#0284C7;">💎 You have <strong>${points} MovingCOST Points</strong> — keep earning!</p>
</div>
<div style="background:#FFF8F0;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
<p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">🔒 <strong>Security tip:</strong> MovingCOST.ai will never ask for your password by email.</p>
</div>
<p style="margin:0;font-size:12px;color:#94A3B8;">Button not working? Copy this link:<br><a href="${magicLink}" style="color:#0EA5E9;word-break:break-all;font-size:11px;">${magicLink}</a></p>
</td></tr>
<tr><td style="background:#F8FBFF;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid #E2E8F0;">
<p style="margin:0;font-size:12px;color:#94A3B8;">You're receiving this because a login was requested for <strong>${normalizedEmail}</strong>.<br>
© 2025 CLASSIC SPREAD INC — <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a></p>
</td></tr>
</table></td></tr></table></body></html>`
    });

    if (emailError) return res.status(500).json({ error: 'Failed to send email', detail: emailError.message });
    return res.status(200).json({ success: true, message: 'Magic link sent! Check your inbox.' });

  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
