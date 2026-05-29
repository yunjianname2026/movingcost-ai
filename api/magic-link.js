import { Resend } from 'resend';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function db(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
  const normalizedEmail = email.toLowerCase().trim();
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const users = await db('GET', `/users?email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`);
    if (!users || users.length === 0) {
      return res.status(200).json({ success: false, message: 'No account found with this email. Please complete the quiz first.' });
    }
    const user = users[0];
    const points = user.points_balance || 0;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db('DELETE', `/magic_tokens?email=eq.${encodeURIComponent(normalizedEmail)}`);
    await db('POST', '/magic_tokens', { email: normalizedEmail, token, expires_at: expiresAt, used: false });

    const baseUrl = process.env.BASE_URL || 'https://www.movingcost.ai';
    const magicLink = `${baseUrl}/verify?token=${token}`;

    const { error: emailError } = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: normalizedEmail,
      subject: 'Your secure login link — MovingCOST.ai',
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F6FF;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6FF;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#0F172A;border-radius:12px 12px 0 0;padding:28px 40px;">
        <span style="font-size:22px;font-weight:700;color:#fff;">Moving<span style="color:#0EA5E9;">COST</span><sup style="font-size:11px;color:#0EA5E9;">ai</sup></span>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:48px 40px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#0F172A;">Your login link is ready ✨</h1>
        <p style="margin:0 0 6px;font-size:15px;color:#475569;line-height:1.6;">
          We received a request to log in to your <strong>MovingCOST.ai</strong> account.<br>
          Click the button below — no password needed.
        </p>
        <p style="margin:0 0 32px;font-size:13px;color:#94A3B8;">
          ⏱ This link expires in <strong>30 minutes</strong> and can only be used once.<br>
          If you didn't request this, you can safely ignore this email.
        </p>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td style="background:#0EA5E9;border-radius:8px;">
            <a href="${magicLink}" style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.3px;">
              Log In to My Dashboard →
            </a>
          </td></tr>
        </table>

        <!-- Points reminder -->
        <div style="background:#F0F6FF;border-radius:8px;padding:16px 20px;margin-bottom:32px;border-left:3px solid #0EA5E9;">
          <p style="margin:0;font-size:14px;color:#0284C7;">
            💎 You have <strong>${points} MovingCOST Points</strong> in your account — keep earning!
          </p>
        </div>

        <!-- Security note -->
        <div style="background:#FFF8F0;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
          <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">
            🔒 <strong>Security tip:</strong> MovingCOST.ai will never ask for your password by email.
            This link was requested from our login page.
          </p>
        </div>

        <!-- Fallback -->
        <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.7;">
          Button not working? Paste this link in your browser:<br>
          <a href="${magicLink}" style="color:#0EA5E9;word-break:break-all;font-size:11px;">${magicLink}</a>
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#F8FBFF;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid #E2E8F0;">
        <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
          You're receiving this because a login was requested for <strong>${normalizedEmail}</strong>.<br>
          Questions? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a> &nbsp;|&nbsp;
          © 2025 CLASSIC SPREAD INC — <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a>
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
