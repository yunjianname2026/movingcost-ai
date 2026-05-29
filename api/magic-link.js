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
    if (insertError) {
      console.error('INSERT ERROR:', JSON.stringify(insertError));
      return res.status(500).json({ error: 'Failed to generate login link', detail: insertError.message });
    }
    const baseUrl = process.env.BASE_URL || 'https://www.movingcost.ai';
    const magicLink = `${baseUrl}/verify?token=${token}`;
    const sendResult = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: normalizedEmail,
      subject: 'Your login link for MovingCOST — valid 30 minutes',
      html: `<p>Click to login: <a href="${magicLink}">${magicLink}</a></p>`
    });
    console.log('RESEND RESULT:', JSON.stringify(sendResult));
    if (sendResult.error) {
      console.error('RESEND ERROR:', JSON.stringify(sendResult.error));
      return res.status(500).json({ error: 'Failed to send email', detail: sendResult.error.message });
    }
    return res.status(200).json({ success: true, message: 'Magic link sent! Check your inbox.' });
  } catch (err) {
    console.error('CATCH ERROR:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
