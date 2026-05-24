// ================================================================
// api/user.js — MovingCOST Rewards System v1
// 用户管理 API：创建用户 / 获取用户 / 绑定邮箱
// 所有数据库操作使用 SUPABASE_SERVICE_ROLE_KEY（后端专用）
// 前端永远不直接访问 Supabase
// ================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Supabase REST 请求封装 ────────────────────────────────────
async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer':        options.prefer || 'return=representation',
      ...options.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Supabase error ${res.status}`);
  }
  return data;
}

// ── 生成 referral_code（8位，排除 O/0/I/1）────────────────────
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── 生成唯一 referral_code（碰撞重试）───────────────────────
async function generateUniqueReferralCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    // 检查是否已存在
    const existing = await supabase(
      `/users?referral_code=eq.${code}&select=id`,
      { method: 'GET', prefer: '' }
    );
    if (!existing || existing.length === 0) return code;
  }
  // 极小概率走到这里
  throw new Error('Failed to generate unique referral code');
}

// ================================================================
// 主处理函数
// ================================================================
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://www.movingcost.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    switch (action) {

      // ── 1. 创建匿名用户 ──────────────────────────────────────
      // POST /api/user?action=create
      // Body: { user_id, referred_by? }
      // 如果 user_id 已存在则直接返回（幂等）
      case 'create': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { user_id, referred_by } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        // 检查是否已存在
        const existing = await supabase(
          `/users?id=eq.${user_id}&select=*`,
          { method: 'GET', prefer: '' }
        );

        if (existing && existing.length > 0) {
          // 已存在，更新 last_seen_at 并返回
          await supabase(`/users?id=eq.${user_id}`, {
            method:  'PATCH',
            prefer:  'return=minimal',
            body:    JSON.stringify({ last_seen_at: new Date().toISOString() }),
          });
          return res.status(200).json({ user: existing[0], created: false });
        }

        // 生成唯一推荐码
        const referral_code = await generateUniqueReferralCode();

        // 验证 referred_by 是否有效（不能自推荐）
        let validReferredBy = null;
        if (referred_by && referred_by !== referral_code) {
          const referrer = await supabase(
            `/users?referral_code=eq.${referred_by}&select=id`,
            { method: 'GET', prefer: '' }
          );
          if (referrer && referrer.length > 0) {
            validReferredBy = referred_by;
          }
        }

        // 创建新用户
        const newUser = await supabase('/users', {
          method: 'POST',
          body: JSON.stringify({
            id:            user_id,
            referral_code,
            referred_by:   validReferredBy,
            points_balance: 0,
            status:        'active',
          }),
        });

        return res.status(201).json({ user: newUser[0], created: true });
      }

      // ── 2. 获取用户信息 + 积分 ───────────────────────────────
      // GET /api/user?action=get&user_id=xxx
      case 'get': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        // 获取用户基本信息
        const users = await supabase(
          `/users?id=eq.${user_id}&select=*`,
          { method: 'GET', prefer: '' }
        );

        if (!users || users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // 从 reward_events 聚合积分（真实账本）
        const events = await supabase(
          `/reward_events?user_id=eq.${user_id}&select=points,status,event_type,source,created_at,metadata&order=created_at.desc&limit=20`,
          { method: 'GET', prefer: '' }
        );

        // 计算 available / pending
        let approvedPoints = 0;
        let pendingPoints  = 0;
        (events || []).forEach(e => {
          if (e.status === 'approved') approvedPoints += e.points;
          if (e.status === 'pending')  pendingPoints  += e.points;
        });

        // 积分等级
        const level = getPointsLevel(approvedPoints);

        // 更新 last_seen_at
        await supabase(`/users?id=eq.${user_id}`, {
          method:  'PATCH',
          prefer:  'return=minimal',
          body:    JSON.stringify({ last_seen_at: new Date().toISOString() }),
        });

        return res.status(200).json({
          user: {
            id:            user.id,
            email:         user.email,
            referral_code: user.referral_code,
            referred_by:   user.referred_by,
            status:        user.status,
          },
          points: {
            available: approvedPoints,
            pending:   pendingPoints,
            level:     level.name,
            level_num: level.num,
            next_level_pts: level.next,
          },
          recent_events: (events || []).slice(0, 10),
        });
      }

      // ── 3. 绑定邮箱 ─────────────────────────────────────────
      // POST /api/user?action=bind-email
      // Body: { user_id, email }
      // 绑定成功后触发 email_submitted 积分事件（+30）
      case 'bind-email': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        let { user_id, email } = req.body;
        if (!user_id || !email) return res.status(400).json({ error: 'user_id and email required' });

        // 统一小写 + 去空格
        email = email.trim().toLowerCase();

        // 基本格式验证
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }

        // 检查用户是否存在
        const users = await supabase(
          `/users?id=eq.${user_id}&select=*`,
          { method: 'GET', prefer: '' }
        );
        if (!users || users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // 如果已绑定相同邮箱，直接返回
        if (user.email === email) {
          return res.status(200).json({ message: 'Email already bound', points_earned: 0 });
        }

        // 检查该邮箱是否已被其他用户使用
        const emailExists = await supabase(
          `/users?email=eq.${encodeURIComponent(email)}&select=id`,
          { method: 'GET', prefer: '' }
        );

        if (emailExists && emailExists.length > 0 && emailExists[0].id !== user_id) {
          // 邮箱已存在于另一个账号，仍绑定但不重复发分
          // （简单处理：提示用户，v1 不做账号合并）
          return res.status(409).json({ error: 'Email already associated with another account' });
        }

        // 绑定邮箱
        await supabase(`/users?id=eq.${user_id}`, {
          method:  'PATCH',
          prefer:  'return=minimal',
          body:    JSON.stringify({ email }),
        });

        // 检查该邮箱是否已领过 email_submitted 奖励（全局，跨 user_id）
        const alreadyRewarded = await supabase(
          `/reward_events?event_type=eq.email_submitted&status=neq.rejected&select=id&limit=1`,
          {
            method:  'GET',
            prefer:  '',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        // 用 metadata->>'email' 过滤（Supabase REST 用 ->> 操作符）
        const emailRewarded = await supabase(
          `/reward_events?event_type=eq.email_submitted&status=neq.rejected&metadata->>email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
          { method: 'GET', prefer: '' }
        );

        let pointsEarned = 0;

        if (!emailRewarded || emailRewarded.length === 0) {
          // 发放 +30 积分
          try {
            await supabase('/reward_events', {
              method: 'POST',
              body: JSON.stringify({
                user_id,
                source:     'earthsoul',
                event_type: 'email_submitted',
                points:     30,
                status:     'approved',
                event_date: new Date().toISOString().split('T')[0],
                metadata:   { email },
              }),
            });
            pointsEarned = 30;

            // 重新计算 points_balance（调用 Supabase RPC）
            await supabase('/rpc/recalculate_points_balance', {
              method: 'POST',
              body:   JSON.stringify({ target_user_id: user_id }),
            });
          } catch (e) {
            // unique constraint 触发说明已发过，忽略
            console.warn('email_submitted reward skipped:', e.message);
          }
        }

        // 处理推荐奖励：如果该用户有 referred_by，
        // 将推荐人的 pending friend_completed_quiz (+100) 改为 approved
        if (user.referred_by) {
          await approvePendingReferralReward(user_id, user.referred_by);
        }

        return res.status(200).json({
          message:      'Email bound successfully',
          points_earned: pointsEarned,
          email,
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error('[api/user] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}

// ================================================================
// 辅助函数
// ================================================================

// 积分等级计算
function getPointsLevel(points) {
  if (points >= 800) return { num: 4, name: 'Global Pathfinder', next: null };
  if (points >= 300) return { num: 3, name: 'EarthSoul Guide',   next: 800 - points };
  if (points >= 100) return { num: 2, name: 'City Seeker',       next: 300 - points };
  return               { num: 1, name: 'New Explorer',          next: 100 - points };
}

// 邮箱提交后：把推荐人的 pending friend_completed_quiz 改为 approved
async function approvePendingReferralReward(referredUserId, referrerCode) {
  try {
    // 找到推荐人
    const referrers = await supabase(
      `/users?referral_code=eq.${referrerCode}&select=id`,
      { method: 'GET', prefer: '' }
    );
    if (!referrers || referrers.length === 0) return;
    const referrerId = referrers[0].id;

    // 更新 referrals 表状态
    await supabase(
      `/referrals?referred_user_id=eq.${referredUserId}&status=neq.rejected`,
      {
        method:  'PATCH',
        prefer:  'return=minimal',
        body:    JSON.stringify({
          status:            'submitted_email',
          submitted_email_at: new Date().toISOString(),
        }),
      }
    );

    // 把推荐人的 pending friend_completed_quiz 改为 approved
    await supabase(
      `/reward_events?user_id=eq.${referrerId}&event_type=eq.friend_completed_quiz&status=eq.pending&metadata->>referred_user_id=eq.${referredUserId}`,
      {
        method:  'PATCH',
        prefer:  'return=minimal',
        body:    JSON.stringify({ status: 'approved' }),
      }
    );

    // 给推荐人发 friend_submitted_email +50（全局去重，unique index 保护）
    try {
      await supabase('/reward_events', {
        method: 'POST',
        body: JSON.stringify({
          user_id:    referrerId,
          source:     'earthsoul',
          event_type: 'friend_submitted_email',
          points:     50,
          status:     'approved',
          event_date: new Date().toISOString().split('T')[0],
          metadata:   { referred_user_id: referredUserId },
        }),
      });
    } catch (e) {
      console.warn('friend_submitted_email reward skipped (already exists):', e.message);
    }

    // 重新计算推荐人积分
    await supabase('/rpc/recalculate_points_balance', {
      method: 'POST',
      body:   JSON.stringify({ target_user_id: referrerId }),
    });

  } catch (err) {
    console.error('[approvePendingReferralReward] Error:', err.message);
  }
}
