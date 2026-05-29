// api/verify-token.js
// 功能：验证token → 标记已使用 → 返回用户信息给前端

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // 1. 查找token
    const { data: tokenRow, error: tokenError } = await supabase
      .from('magic_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'This login link is invalid or has already been used.'
      });
    }

    // 2. 检查是否已使用
    if (tokenRow.used) {
      return res.status(401).json({
        error: 'token_used',
        message: 'This login link has already been used. Please request a new one.'
      });
    }

    // 3. 检查是否过期
    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'token_expired',
        message: 'This login link has expired. Please request a new one.'
      });
    }

    // 4. 标记token已使用（防止重复登录）
    await supabase
      .from('magic_tokens')
      .update({ used: true })
      .eq('token', token);

    // 5. 查询用户完整信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, points_balance, status, referral_code, membership_tier, membership_status')
      .eq('email', tokenRow.email)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Account not found.'
      });
    }

    // 6. 更新 last_seen_at
    await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    // 7. 返回用户信息（前端写入localStorage）
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
    console.error('Verify token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
