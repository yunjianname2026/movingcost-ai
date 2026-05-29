import { Resend } from 'resend';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabase(method, path, body) {
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
    // 1. 查用户
    const users = await supabase('GET', `/users?email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`);
    if (!users || users.length === 0) {
      return res.status(200).json({ success: false, message: 'No account found with this email. Please complete the quiz first.' });
    }
    const user = users[0];

    // 2. 生成token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // 3. 删除旧token
    await supabase('DELETE', `/magic_tokens?email=eq.${encodeURIComponent(normalizedEmail)}`);

    // 4. 插入新token
    const inserted = await supabase('POST', '/magic_tokens', { email: normalizedEmail, token, expires_at: expiresAt, used: false });
    console.log('INSERT RESULT:', JSON.stringify(inserted));

    // 5. 发邮件
    const baseUrl = process.env.BASE_URL || 'https://www.movingcost.ai';
    const magicLink = `${baseUrl}/verify?token=${token}`;
    const sendResult = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: normalizedEmail,
      subject: 'Your login link for MovingCOST — valid 30 minutes',
      html: `<p>Click to login: <a href="${magicLink}">${magicLink}</a></p>`
    });
    console.log('RESEND:', JSON.stringify(sendResult));
    if (sendResult.error) return res.status(500).json({ error: 'Failed to send email', detail: sendResult.error.message });

    return res.status(200).json({ success: true, message: 'Magic link sent! Check your inbox.' });
  } catch (err) {
    console.error('ERROR:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
