// ================================================================
// api/referral.js — MovingCOST Rewards System v1
// 推荐系统 API：验证推荐码 / 记录归因 / 朋友完成测试触发奖励
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
      'Prefer':        options.prefer ?? 'return=representation',
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

// ── 重新计算 points_balance ───────────────────────────────────
async function recalculate(user_id) {
  await supabase('/rpc/recalculate_points_balance', {
    method: 'POST',
    body:   JSON.stringify({ target_user_id: user_id }),
  });
}

// ── 今天的 UTC 日期 ───────────────────────────────────────────
function todayUTC() {
  return new Date().toISOString().split('T')[0];
}

// ── 判断是否为 unique constraint 冲突 ────────────────────────
function isDuplicateError(err) {
  const msg = err.message || '';
  return (
    msg.includes('duplicate key') ||
    msg.includes('unique constraint') ||
    msg.includes('23505')
  );
}

// ================================================================
// 主处理函数
// ================================================================
export default async function handler(req, res) {
  // CORS
  const _origin = req.headers.origin || "";
  const _allowedOrigins = ["https://www.movingcost.ai","https://movingcost.ai"];
  res.setHeader("Access-Control-Allow-Origin", _allowedOrigins.includes(_origin) ? _origin : _allowedOrigins[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    switch (action) {

      // ── 1. 验证推荐码 ────────────────────────────────────────
      // GET /api/referral?action=validate&ref=ABCD1234
      // 用于页面加载时验证 ?ref= 参数是否有效
      // 返回推荐人的公开信息（不暴露敏感字段）
      case 'validate': {
        if (req.method !== 'GET') return res.status(405).end();

        const { ref } = req.query;
        if (!ref) return res.status(400).json({ error: 'ref required' });

        // 查找推荐人
        const referrers = await supabase(
          `/users?referral_code=eq.${ref}&select=id,referral_code,status`,
          { method: 'GET', prefer: '' }
        );

        if (!referrers || referrers.length === 0) {
          return res.status(200).json({ valid: false, message: 'Invalid referral code' });
        }

        const referrer = referrers[0];

        // 推荐人账号必须是 active 状态
        if (referrer.status !== 'active') {
          return res.status(200).json({ valid: false, message: 'Referral code inactive' });
        }

        return res.status(200).json({
          valid:         true,
          referral_code: referrer.referral_code,
          message:       "You're invited by a friend — start with bonus points!",
        });
      }

      // ── 2. 记录推荐归因 ──────────────────────────────────────
      // POST /api/referral?action=track
      // Body: { user_id, ref }
      // 调用时机：用户带 ?ref= 进入页面，创建用户后立即调用
      // Last-click-wins：未完成测试前可更新推荐人
      case 'track': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, ref } = req.body;
        if (!user_id || !ref) return res.status(400).json({ error: 'user_id and ref required' });

        // 查找被推荐人
        const referred = await supabase(
          `/users?id=eq.${user_id}&select=id,referral_code,referred_by,status`,
          { method: 'GET', prefer: '' }
        );
        if (!referred || referred.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        const referredUser = referred[0];

        // 防自推荐：推荐码不能是自己的
        if (referredUser.referral_code === ref) {
          return res.status(200).json({ tracked: false, message: 'Self-referral not allowed' });
        }

        // 检查用户是否已完成测试（完成后归因锁定，不再更改）
        const completedQuiz = await supabase(
          `/reward_events?user_id=eq.${user_id}&event_type=eq.quiz_completed&status=eq.approved&select=id&limit=1`,
          { method: 'GET', prefer: '' }
        );
        if (completedQuiz && completedQuiz.length > 0) {
          return res.status(200).json({
            tracked: false,
            message: 'Referral attribution locked after quiz completion',
          });
        }

        // 查找推荐人
        const referrers = await supabase(
          `/users?referral_code=eq.${ref}&select=id,referral_code,status`,
          { method: 'GET', prefer: '' }
        );
        if (!referrers || referrers.length === 0) {
          return res.status(200).json({ tracked: false, message: 'Invalid referral code' });
        }
        const referrer = referrers[0];

        if (referrer.status !== 'active') {
          return res.status(200).json({ tracked: false, message: 'Referrer account inactive' });
        }

        // 更新被推荐人的 referred_by（last-click-wins）
        await supabase(`/users?id=eq.${user_id}`, {
          method:  'PATCH',
          prefer:  'return=minimal',
          body:    JSON.stringify({ referred_by: ref }),
        });

        // UPSERT referrals 表（ON CONFLICT: referred_user_id unique index）
        // 如果已有记录则更新推荐人（last-click-wins）
        await supabase('/referrals', {
          method:  'POST',
          prefer:  'resolution=merge-duplicates,return=minimal',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            referrer_user_id: referrer.id,
            referred_user_id: user_id,
            referral_code:    ref,
            status:           'clicked',
          }),
        });

        return res.status(200).json({
          tracked: true,
          message: "Referral tracked successfully",
        });
      }

      // ── 3. 朋友完成测试 → 推荐人 +100 pending ───────────────
      // POST /api/referral?action=friend-completed
      // Body: { user_id, source? }
      // 调用时机：用户完成测试（quiz_completed 事件之后）
      case 'friend-completed': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, source = 'earthsoul' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        // 获取被推荐人信息
        const referred = await supabase(
          `/users?id=eq.${user_id}&select=id,referred_by,referral_code`,
          { method: 'GET', prefer: '' }
        );
        if (!referred || referred.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        const referredUser = referred[0];

        // 没有推荐人，跳过
        if (!referredUser.referred_by) {
          return res.status(200).json({ rewarded: false, message: 'No referrer found' });
        }

        // 防自推荐（双重检查）
        if (referredUser.referred_by === referredUser.referral_code) {
          return res.status(200).json({ rewarded: false, message: 'Self-referral blocked' });
        }

        // 查找推荐人
        const referrers = await supabase(
          `/users?referral_code=eq.${referredUser.referred_by}&select=id,status`,
          { method: 'GET', prefer: '' }
        );
        if (!referrers || referrers.length === 0) {
          return res.status(200).json({ rewarded: false, message: 'Referrer not found' });
        }
        const referrer = referrers[0];

        if (referrer.status !== 'active') {
          return res.status(200).json({ rewarded: false, message: 'Referrer inactive' });
        }

        // 防自推荐（ID 层面）
        if (referrer.id === user_id) {
          return res.status(200).json({ rewarded: false, message: 'Self-referral blocked' });
        }

        // 更新 referrals 表状态
        await supabase(
          `/referrals?referred_user_id=eq.${user_id}&status=neq.rejected`,
          {
            method:  'PATCH',
            prefer:  'return=minimal',
            body:    JSON.stringify({
              status:           'completed_quiz',
              completed_quiz_at: new Date().toISOString(),
            }),
          }
        );

        // 给推荐人写入 pending +100
        // unique index uq_friend_completed_quiz 全局去重保护
        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id:    referrer.id,
              source,
              event_type: 'friend_completed_quiz',
              points:     100,
              status:     'pending',
              event_date: todayUTC(),
              metadata:   { referred_user_id: user_id },
            }),
          });

          // pending 不计入 points_balance，无需 recalculate

          return res.status(200).json({
            rewarded: true,
            message:  'Referrer awarded +100 pending points. Will approve when friend saves email.',
          });

        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({
              rewarded: false,
              message:  'Referral reward already recorded',
            });
          }
          throw e;
        }
      }

      // ── 4. 获取推荐统计 ──────────────────────────────────────
      // GET /api/referral?action=stats&user_id=xxx
      // 返回推荐人的推荐统计和推荐链接
      case 'stats': {
        if (req.method !== 'GET') return res.status(405).end();

        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        // 获取用户推荐码
        const users = await supabase(
          `/users?id=eq.${user_id}&select=id,referral_code,points_balance`,
          { method: 'GET', prefer: '' }
        );
        if (!users || users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        const user = users[0];

        // 查询推荐记录
        const referrals = await supabase(
          `/referrals?referrer_user_id=eq.${user_id}&select=*&order=created_at.desc`,
          { method: 'GET', prefer: '' }
        );

        // 统计各阶段数量
        const stats = {
          total_clicks:         0,
          completed_quiz:       0,
          submitted_email:      0,
          purchased:            0,
          pending_points:       0,
          approved_points:      0,
        };

        (referrals || []).forEach(r => {
          stats.total_clicks++;
          if (['completed_quiz','submitted_email','purchased'].includes(r.status)) stats.completed_quiz++;
          if (['submitted_email','purchased'].includes(r.status)) stats.submitted_email++;
          if (r.status === 'purchased') stats.purchased++;
        });

        // 查询推荐相关积分
        const rewardEvents = await supabase(
          `/reward_events?user_id=eq.${user_id}&event_type=like.*friend*&select=points,status`,
          { method: 'GET', prefer: '' }
        );
        (rewardEvents || []).forEach(e => {
          if (e.status === 'pending')  stats.pending_points  += e.points;
          if (e.status === 'approved') stats.approved_points += e.points;
        });

        return res.status(200).json({
          referral_code: user.referral_code,
          referral_link: `https://www.movingcost.ai/earthsoul?ref=${user.referral_code}`,
          stats,
          referrals:     referrals || [],
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error('[api/referral] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
