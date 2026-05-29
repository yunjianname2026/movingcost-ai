const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function db(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const rows = await db('GET', `/magic_tokens?token=eq.${encodeURIComponent(token)}&limit=1`);

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: 'invalid_token', message: 'This login link is invalid.' });
    }

    const tokenRow = rows[0];

    if (tokenRow.used === true) {
      return res.status(401).json({ error: 'token_used', message: 'This login link has already been used.' });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(401).json({ error: 'token_expired', message: 'This login link has expired.' });
    }

    // 标记已使用
    await db('PATCH', `/magic_tokens?token=eq.${encodeURIComponent(token)}`, { used: true });

    // 查用户
    const users = await db('GET', `/users?email=eq.${encodeURIComponent(tokenRow.email)}&limit=1`);

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'user_not_found', message: 'Account not found.' });
    }

    const user = users[0];

    // 更新last_seen_at
    await db('PATCH', `/users?id=eq.${user.id}`, { last_seen_at: new Date().toISOString() });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        points: user.points_balance || 0,
        referralCode: user.referral_code,
        membershipTier: user.membership_tier,
        membershipStatus: user.membership_status,
        status: user.status
      }
    });

  } catch (err) {
    console.error('Verify error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
