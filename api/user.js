// ================================================================
// api/user.js — MovingCOST Rewards System v1
// 修改记录：
// 1. case 'get'：返回 membership_tier / membership_status /
//               member_since / is_member 字段
// 2. case 'bind-email'：绑定邮箱后自动写入 Free Member 状态
//    规则：只有 tier 为 NULL 时才写 free（不覆盖 plus/pro/annual）
//          member_since 只在首次绑定时写入
// ================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGINS = [
  'https://www.movingcost.ai',
  'https://movingcost.ai',
];

function setCORS(req, res) {
  const origin  = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin',  allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

async function supabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('环境变量缺失：SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置');
  }
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
    const msg = data?.message || data?.error || data?.hint || `Supabase HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function generateUniqueReferralCode() {
  for (let i = 0; i < 10; i++) {
    const code     = generateReferralCode();
    const existing = await supabase(`/users?referral_code=eq.${code}&select=id`, { method: 'GET', prefer: '' });
    if (!existing || existing.length === 0) return code;
  }
  throw new Error('无法生成唯一推荐码，请重试');
}

async function recalculate(user_id) {
  try {
    await supabase('/rpc/recalculate_points_balance', {
      method: 'POST',
      body:   JSON.stringify({ target_user_id: user_id }),
    });
  } catch (rpcErr) {
    console.warn('[recalculate] RPC不可用，使用fallback直接计算:', rpcErr.message);
    const events = await supabase(
      `/reward_events?user_id=eq.${user_id}&status=eq.approved&select=points`,
      { method: 'GET', prefer: '' }
    );
    const total = (events || []).reduce((sum, e) => sum + (e.points || 0), 0);
    await supabase(`/users?id=eq.${user_id}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ points_balance: total, updated_at: new Date().toISOString() }),
    });
  }
}

// ================================================================
// 主处理函数
// ================================================================
export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    switch (action) {

      // ── 1. 创建匿名用户 ─────────────────────────────────────
      case 'create': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { user_id, referred_by } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        const existing = await supabase(`/users?id=eq.${user_id}&select=*`, { method: 'GET', prefer: '' });
        if (existing && existing.length > 0) {
          await supabase(`/users?id=eq.${user_id}`, {
            method: 'PATCH', prefer: 'return=minimal',
            body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
          });
          return res.status(200).json({ user: existing[0], created: false });
        }

        const referral_code = await generateUniqueReferralCode();

        let validReferredBy = null;
        if (referred_by && referred_by !== referral_code) {
          const referrer = await supabase(`/users?referral_code=eq.${referred_by}&select=id`, { method: 'GET', prefer: '' });
          if (referrer && referrer.length > 0) validReferredBy = referred_by;
        }

        const newUser = await supabase('/users', {
          method: 'POST',
          body: JSON.stringify({
            id:             user_id,
            referral_code,
            referred_by:    validReferredBy,
            points_balance: 0,
            status:         'active',
            // membership 字段保持 NULL，直到绑定邮箱才写入
          }),
        });

        return res.status(201).json({ user: newUser[0], created: true });
      }

      // ── 2. 获取用户信息 + 积分 ──────────────────────────────
      // ★ 修改：新增返回 membership_tier / membership_status /
      //         member_since / is_member 字段
      case 'get': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        const users = await supabase(`/users?id=eq.${user_id}&select=*`, { method: 'GET', prefer: '' });
        if (!users || users.length === 0) return res.status(404).json({ error: '用户不存在' });
        const user = users[0];

        const events = await supabase(
          `/reward_events?user_id=eq.${user_id}&select=points,status,event_type,source,created_at,metadata&order=created_at.desc&limit=20`,
          { method: 'GET', prefer: '' }
        );

        let approvedPoints = 0, pendingPoints = 0;
        (events || []).forEach(e => {
          if (e.status === 'approved') approvedPoints += e.points;
          if (e.status === 'pending')  pendingPoints  += e.points;
        });

        await supabase(`/users?id=eq.${user_id}`, {
          method: 'PATCH', prefer: 'return=minimal',
          body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
        });

        return res.status(200).json({
          user: {
            id:                user.id,
            email:             user.email             || null,
            referral_code:     user.referral_code,
            referred_by:       user.referred_by       || null,
            status:            user.status,
            // ★ 新增会员字段
            membership_tier:   user.membership_tier   || null,
            membership_status: user.membership_status || null,
            member_since:      user.member_since       || null,
            is_member:         !!user.email,           // 有邮箱 = Free Member
          },
          points: {
            available:      approvedPoints,
            pending:        pendingPoints,
            level:          getPointsLevel(approvedPoints).name,
            level_num:      getPointsLevel(approvedPoints).num,
            next_level_pts: getPointsLevel(approvedPoints).next,
          },
          recent_events: (events || []).slice(0, 10),
        });
      }

      // ── 3. 绑定邮箱 ─────────────────────────────────────────
      // ★ 修改：绑定成功后自动写入 Free Member 状态
      //   安全规则：
      //   - 只有 membership_tier 为 NULL 时才写 free
      //   - 不覆盖 plus / pro / annual
      //   - member_since 只在首次绑定时写入
      //   - 邮箱已属于其他账号时返回 409（不做无验证合并）
      case 'bind-email': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        let { user_id, email } = req.body;
        if (!user_id || !email) return res.status(400).json({ error: 'user_id 和 email 不能为空' });

        email = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return res.status(400).json({ error: '邮箱格式不正确' });
        }

        const users = await supabase(`/users?id=eq.${user_id}&select=*`, { method: 'GET', prefer: '' });
        if (!users || users.length === 0) return res.status(404).json({ error: '用户不存在' });
        const user = users[0];

        // 已绑定相同邮箱，直接返回
        if (user.email === email) return res.status(200).json({ message: '邮箱已绑定', points_earned: 0 });

        // ★ 安全检查：邮箱是否已属于其他账号
        const emailExists = await supabase(
          `/users?email=eq.${encodeURIComponent(email)}&select=id`,
          { method: 'GET', prefer: '' }
        );
        if (emailExists && emailExists.length > 0 && emailExists[0].id !== user_id) {
          // 不做无验证合并，返回 409
          return res.status(409).json({
            error: '该邮箱已被其他账号绑定',
            message: 'Account recovery by email is coming soon. For now, please use the same device or contact support.',
          });
        }

        // 绑定邮箱
        await supabase(`/users?id=eq.${user_id}`, {
          method: 'PATCH', prefer: 'return=minimal',
          body: JSON.stringify({ email }),
        });

        // ★ 会员状态安全写入
        // 只有 tier 为 NULL 时才写 free（不覆盖 plus/pro/annual）
        // member_since 只在首次成为会员时写入
        const membershipUpdate = {};
        if (!user.membership_tier) {
          membershipUpdate.membership_tier   = 'free';
          membershipUpdate.membership_status = 'active';
        }
        if (!user.member_since) {
          membershipUpdate.member_since = new Date().toISOString();
        }
        if (Object.keys(membershipUpdate).length > 0) {
          await supabase(`/users?id=eq.${user_id}`, {
            method: 'PATCH', prefer: 'return=minimal',
            body: JSON.stringify(membershipUpdate),
          });
        }

        // 检查是否已领过 email_submitted 奖励
        const emailRewarded = await supabase(
          `/reward_events?event_type=eq.email_submitted&status=neq.rejected&metadata->>email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
          { method: 'GET', prefer: '' }
        );

        let pointsEarned = 0;
        if (!emailRewarded || emailRewarded.length === 0) {
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
            await recalculate(user_id);
          } catch (e) {
            console.warn('email_submitted 积分已发，跳过:', e.message);
          }
        }

        // 推荐奖励：被推荐人绑定邮箱后，推荐人 pending→approved
        if (user.referred_by) {
          await approvePendingReferralReward(user_id, user.referred_by).catch(e =>
            console.warn('[bind-email] 推荐奖励处理失败:', e.message)
          );
        }

        return res.status(200).json({
          message:           '邮箱绑定成功',
          points_earned:     pointsEarned,
          email,
          membership_tier:   membershipUpdate.membership_tier || user.membership_tier,
          is_member:         true,
        });
      }

      // ── 4. 保存测试结果 ──────────────────────────────────────
      case 'save-quiz-result': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { user_id, source = 'earthsoul', quiz_type = 'earthsoul_city_quiz',
                primary_type, secondary_type, result_data } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        try {
          const existing = await supabase(
            `/quiz_results?user_id=eq.${user_id}&source=eq.${source}&select=id`,
            { method: 'GET', prefer: '' }
          );

          if (existing && existing.length > 0) {
            await supabase(`/quiz_results?user_id=eq.${user_id}&source=eq.${source}`, {
              method: 'PATCH', prefer: 'return=minimal',
              body: JSON.stringify({
                quiz_type, primary_type, secondary_type,
                result_data: result_data || {},
                updated_at: new Date().toISOString(),
              }),
            });
          } else {
            await supabase('/quiz_results', {
              method: 'POST',
              body: JSON.stringify({
                user_id, source, quiz_type,
                primary_type, secondary_type,
                result_data: result_data || {},
              }),
            });
          }
          return res.status(200).json({ success: true });
        } catch (e) {
          console.warn('[save-quiz-result] 写入失败:', e.message);
          return res.status(500).json({ error: '写入失败', detail: e.message });
        }
      }

      // ── 5. 客服工单 ──────────────────────────────────────────
      case 'save-support-case': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { user_id, issue_type = 'missing_points', description, email, metadata } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        try {
          const newCase = await supabase('/support_cases', {
            method: 'POST',
            body: JSON.stringify({
              user_id,
              issue_type,
              description:   description || '',
              contact_email: email || null,
              status:        'open',
              metadata:      metadata || {},
            }),
          });
          return res.status(201).json({ success: true, case_id: newCase?.[0]?.id });
        } catch (e) {
          console.warn('[save-support-case] 写入失败:', e.message);
          return res.status(500).json({ error: '工单创建失败', detail: e.message });
        }
      }

      default:
        return res.status(400).json({ error: `未知操作: ${action}` });
    }

  } catch (err) {
    console.error('[api/user] 错误:', err.message);
    return res.status(500).json({ error: '服务器内部错误', detail: err.message });
  }
}

// ================================================================
// 辅助函数
// ================================================================

function getPointsLevel(points) {
  if (points >= 800) return { num: 4, name: 'Global Pathfinder', next: null };
  if (points >= 300) return { num: 3, name: 'EarthSoul Guide',   next: 800 - points };
  if (points >= 100) return { num: 2, name: 'City Seeker',       next: 300 - points };
  return               { num: 1, name: 'New Explorer',          next: 100 - points };
}

async function approvePendingReferralReward(referredUserId, referrerCode) {
  try {
    const referrers = await supabase(
      `/users?referral_code=eq.${referrerCode}&select=id`,
      { method: 'GET', prefer: '' }
    );
    if (!referrers || referrers.length === 0) return;
    const referrerId = referrers[0].id;

    await supabase(
      `/referrals?referred_user_id=eq.${referredUserId}&status=neq.rejected`,
      {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ status: 'submitted_email', submitted_email_at: new Date().toISOString() }),
      }
    );

    await supabase(
      `/reward_events?user_id=eq.${referrerId}&event_type=eq.friend_completed_quiz&status=eq.pending&metadata->>referred_user_id=eq.${referredUserId}`,
      {
        method: 'PATCH', prefer: 'return=minimal',
        body: JSON.stringify({ status: 'approved' }),
      }
    );

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
      console.warn('friend_submitted_email 积分已存在，跳过:', e.message);
    }

    await recalculate(referrerId);
  } catch (err) {
    console.error('[approvePendingReferralReward] 错误:', err.message);
  }
}
