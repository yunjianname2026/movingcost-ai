// ================================================================
// api/rewards.js — MovingCOST Rewards System v1
// 积分事件 API：记录积分 / 防重复 / pending→approved
// 所有判断逻辑在后端，前端只发送行为请求
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

// ── 重新计算并更新 points_balance 缓存 ───────────────────────
async function recalculate(user_id) {
  await supabase('/rpc/recalculate_points_balance', {
    method: 'POST',
    body:   JSON.stringify({ target_user_id: user_id }),
  });
}

// ── 今天的 UTC 日期字符串（YYYY-MM-DD）───────────────────────
function todayUTC() {
  return new Date().toISOString().split('T')[0];
}

// ================================================================
// 积分规则配置（集中管理，方便调整）
// ================================================================
const REWARD_CONFIG = {
  quiz_completed:   { points: 20,  status: 'approved' },
  shared_result:    { points: 50,  status: 'approved' },
  downloaded_card:  { points: 10,  status: 'approved' },
  email_submitted:  { points: 30,  status: 'approved' },
  friend_completed_quiz:     { points: 100, status: 'pending'  },
  friend_submitted_email:    { points: 50,  status: 'approved' },
  purchase_completed:        { points: 200, status: 'approved' },
  friend_purchase_completed: { points: 300, status: 'pending'  },
};

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

      // ── 1. 完成测试 +20 ──────────────────────────────────────
      // POST /api/rewards?action=quiz-completed
      // Body: { user_id, source?, quiz_type? }
      case 'quiz-completed': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, source = 'earthsoul', quiz_type = 'earthsoul_city_quiz' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        // 验证用户存在
        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 防重复：每用户每来源只能一次（unique index 保护）
        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id,
              source,
              event_type: 'quiz_completed',
              points:     REWARD_CONFIG.quiz_completed.points,
              status:     'approved',
              event_date: todayUTC(),
              metadata:   { quiz_type },
            }),
          });

          await recalculate(user_id);

          return res.status(200).json({
            success:      true,
            points_earned: REWARD_CONFIG.quiz_completed.points,
            message:      '+20 EarthSoul Points — Your city soul journey has started.',
          });

        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({
              success:      false,
              points_earned: 0,
              message:      'Quiz already completed — points already awarded.',
            });
          }
          throw e;
        }
      }

      // ── 2. 分享结果 +50（每天一次）──────────────────────────
      // POST /api/rewards?action=shared-result
      // Body: { user_id, platform, source? }
      case 'shared-result': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, platform = 'unknown', source = 'earthsoul' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 防重复：每用户每天一次（unique index: user_id + source + event_type + event_date）
        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id,
              source,
              event_type: 'shared_result',
              points:     REWARD_CONFIG.shared_result.points,
              status:     'approved',
              event_date: todayUTC(),
              metadata:   { platform },
            }),
          });

          await recalculate(user_id);

          return res.status(200).json({
            success:      true,
            points_earned: REWARD_CONFIG.shared_result.points,
            message:      '+50 EarthSoul Points — Your result is ready to travel.',
          });

        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({
              success:      false,
              points_earned: 0,
              message:      "You already earned today's sharing points.",
            });
          }
          throw e;
        }
      }

      // ── 3. 下载分享卡片 +10（每天一次）──────────────────────
      // POST /api/rewards?action=downloaded-card
      // Body: { user_id, source? }
      case 'downloaded-card': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, source = 'earthsoul' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id,
              source,
              event_type: 'downloaded_card',
              points:     REWARD_CONFIG.downloaded_card.points,
              status:     'approved',
              event_date: todayUTC(),
              metadata:   {},
            }),
          });

          await recalculate(user_id);

          return res.status(200).json({
            success:      true,
            points_earned: REWARD_CONFIG.downloaded_card.points,
            message:      '+10 EarthSoul Points — Card downloaded!',
          });

        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({
              success:      false,
              points_earned: 0,
              message:      "You already earned today's download points.",
            });
          }
          throw e;
        }
      }

      // ── 4. 获取积分历史 ──────────────────────────────────────
      // GET /api/rewards?action=history&user_id=xxx&limit=20
      case 'history': {
        if (req.method !== 'GET') return res.status(405).end();

        const { user_id, limit = '20' } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        const events = await supabase(
          `/reward_events?user_id=eq.${user_id}&order=created_at.desc&limit=${parseInt(limit)}&select=*`,
          { method: 'GET', prefer: '' }
        );

        // 聚合统计
        let approved = 0, pending = 0;
        (events || []).forEach(e => {
          if (e.status === 'approved') approved += e.points;
          if (e.status === 'pending')  pending  += e.points;
        });

        return res.status(200).json({
          events:          events || [],
          total_approved:  approved,
          total_pending:   pending,
        });
      }

      // ── 5. 人工/系统补积分（admin only）─────────────────────
      // POST /api/rewards?action=admin-adjust
      // Body: { user_id, points, reason, support_case_id?, admin_id }
      // 必须通过此接口，禁止直接改 points_balance
      case 'admin-adjust': {
        if (req.method !== 'POST') return res.status(405).end();

        // 简单的 admin 验证（v1 用固定 secret，未来换 JWT）
        const adminSecret = req.headers['x-admin-secret'];
        if (adminSecret !== process.env.ADMIN_SECRET) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { user_id, points, reason, support_case_id, admin_id = 'admin' } = req.body;
        if (!user_id || points === undefined || !reason) {
          return res.status(400).json({ error: 'user_id, points, reason required' });
        }

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 写入 reward_events
        const event = await supabase('/reward_events', {
          method: 'POST',
          body: JSON.stringify({
            user_id,
            source:     'admin',
            event_type: 'admin_adjustment',
            points:     parseInt(points),
            status:     'approved',
            event_date: todayUTC(),
            metadata:   { reason, support_case_id, admin_id },
          }),
        });

        // 重新计算余额（不允许直接改 points_balance）
        const newBalance = await recalculate(user_id);

        // 写入 audit_logs
        await supabase('/audit_logs', {
          method: 'POST',
          body: JSON.stringify({
            actor_type:  'human_admin',
            actor_id:    admin_id,
            actor_level: 'human',
            action_type: 'adjust_points',
            target_type: 'reward_events',
            target_id:   event[0]?.id,
            before_data: { points_balance: user.points_balance },
            after_data:  { points_balance: newBalance, points_added: points },
            reason,
            support_case_id: support_case_id || null,
          }),
        }).catch(e => console.warn('audit_log write failed:', e.message));

        return res.status(200).json({
          success:     true,
          points_added: parseInt(points),
          new_balance: newBalance,
          message:     `Admin adjustment: ${points > 0 ? '+' : ''}${points} points. Reason: ${reason}`,
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error('[api/rewards] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}

// ================================================================
// 辅助函数
// ================================================================

// 获取用户（带缓存查询）
async function getUser(user_id) {
  const users = await supabase(
    `/users?id=eq.${user_id}&select=id,email,referral_code,referred_by,points_balance,status`,
    { method: 'GET', prefer: '' }
  );
  return users && users.length > 0 ? users[0] : null;
}

// 判断是否为 unique constraint 冲突错误
function isDuplicateError(err) {
  const msg = err.message || '';
  return (
    msg.includes('duplicate key') ||
    msg.includes('unique constraint') ||
    msg.includes('23505')  // PostgreSQL unique violation code
  );
}
