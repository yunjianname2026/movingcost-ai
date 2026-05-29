import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data: user, error: userError } = await supabase.from('users').select('id, email, points_balance').eq('email', normalizedEmail).single();
    if (userError || !user) return res.status(200).json({ success: false, message: 'No account found with this email. Please complete the quiz first.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await supabase.from('magic_tokens').delete().eq('email', normalizedEmail);
    const { error: insertError } = await supabase.from('magic_tokens').insert({ email: normalizedEmail, token, expires_at: expiresAt.toISOString(), used: false });
    if (insertError) return res.status(500).json({ error: 'Failed to generate login link' });
    const baseUrl = process.env.BASE_URL || 'https://www.movingcost.ai';
    const magicLink = `${baseUrl}/verify?token=${token}`;
    const { error: emailError } = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: normalizedEmail,
      subject: 'Your login link for MovingCOST — valid 30 minutes',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F6FF;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0"><tr><td style="background:#0F172A;border-radius:12px 12px 0 0;padding:28px 40px;"><span style="font-size:22px;font-weight:700;color:#fff;">Moving<span style="color:#0EA5E9;">COST</span><sup style="font-size:11px;">ai</sup></span></td></tr><tr><td style="background:#fff;padding:48px 40px;"><h1 style="margin:0 0 16px;font-size:24px;color:#0F172A;">Your login link is ready ✨</h1><p style="margin:0 0 32px;color:#475569;">Click below to access your dashboard. Expires in 30 minutes.</p><a href="${magicLink}" style="display:inline-block;padding:14px 36px;background:#0EA5E9;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Log In to My Dashboard →</a><br><br><p style="color:#94A3B8;font-size:12px;">Or copy: <a href="${magicLink}" style="color:#0EA5E9;">${magicLink}</a></p></td></tr><tr><td style="background:#F8FBFF;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid #E2E8F0;"><p style="margin:0;font-size:12px;color:#94A3B8;">© 2025 CLASSIC SPREAD INC — <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a></p></td></tr></table></td></tr></table></body></html>`
    });
    if (emailError) return res.status(500).json({ error: 'Failed to send email', detail: emailError.message });
    return res.status(200).json({ success: true, message: 'Magic link sent! Check your inbox.' });
  } catch (err) {
    console.error('Magic link error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
