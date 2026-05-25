// ================================================================
// api/rewards.js — MovingCOST Rewards System v1
// 积分事件 API：记录积分 / 防重复 / pending→approved
// 所有判断逻辑在后端，前端只发送行为请求
// ================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── 允许的跨域来源（同时支持 www 和非 www）───────────────────
const ALLOWED_ORIGINS = [
  'https://www.movingcost.ai',
  'https://movingcost.ai',
];

function setCORS(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// ── Supabase REST 请求封装 ────────────────────────────────────
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
      'Prefer':        options.prefer ?? 'return=representation',
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || data?.error || data?.hint || `Supabase HTTP ${res.status}`);
  }
  return data;
}

// ── 积分重新计算（优先RPC，失败则直接聚合）──────────────────
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

// ── 工具函数 ─────────────────────────────────────────────────
function todayUTC() {
  return new Date().toISOString().split('T')[0];
}

async function getUser(user_id) {
  const users = await supabase(
    `/users?id=eq.${user_id}&select=id,email,referral_code,referred_by,points_balance,status`,
    { method: 'GET', prefer: '' }
  );
  return users && users.length > 0 ? users[0] : null;
}

function isDuplicateError(err) {
  const msg = err.message || '';
  return msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('23505');
}

// ── 积分规则配置（集中管理）──────────────────────────────────
const REWARD_CONFIG = {
  quiz_completed:            { points: 20,  status: 'approved' },
  shared_result:             { points: 50,  status: 'approved' },
  downloaded_card:           { points: 10,  status: 'approved' },
  email_submitted:           { points: 30,  status: 'approved' },
  friend_completed_quiz:     { points: 100, status: 'pending'  },
  friend_submitted_email:    { points: 50,  status: 'approved' },
  purchase_completed:        { points: 200, status: 'approved' },
  friend_purchase_completed: { points: 300, status: 'pending'  },
};

// ================================================================
// 主处理函数
// ================================================================
export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  try {
    switch (action) {

      // ── 完成测试 +20 ─────────────────────────────────────────
      // POST /api/rewards?action=quiz-completed
      // Body: { user_id, source?, quiz_type? }
      case 'quiz-completed': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, source = 'earthsoul', quiz_type = 'earthsoul_city_quiz' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: '用户不存在' });

        // 防重复：每用户每来源只能一次（unique index 保护）
        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id, source,
              event_type: 'quiz_completed',
              points:     REWARD_CONFIG.quiz_completed.points,
              status:     'approved',
              event_date: todayUTC(),
              metadata:   { quiz_type },
            }),
          });
          await recalculate(user_id);
          return res.status(200).json({
            success:       true,
            points_earned: REWARD_CONFIG.quiz_completed.points,
            message:       '+20 EarthSoul Points — Your city soul journey has started.',
          });
        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({ success: false, points_earned: 0, message: '测试已完成，积分已发放。' });
          }
          throw e;
        }
      }

      // ── 分享结果 +50（每天一次）──────────────────────────────
      // POST /api/rewards?action=shared-result
      // Body: { user_id, platform, source? }
      case 'shared-result': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, platform = 'unknown', source = 'earthsoul' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: '用户不存在' });

        // 防重复：每用户每天一次（unique index: user_id + source + event_type + event_date）
        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id, source,
              event_type: 'shared_result',
              points:     REWARD_CONFIG.shared_result.points,
              status:     'approved',
              event_date: todayUTC(),
              metadata:   { platform },
            }),
          });
          await recalculate(user_id);
          return res.status(200).json({
            success:       true,
            points_earned: REWARD_CONFIG.shared_result.points,
            message:       '+50 EarthSoul Points — Your result is ready to travel.',
          });
        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({ success: false, points_earned: 0, message: "今天的分享积分已领取。" });
          }
          throw e;
        }
      }

      // ── 下载分享卡片 +10（每天一次）─────────────────────────
      // POST /api/rewards?action=downloaded-card
      // Body: { user_id, source? }
      case 'downloaded-card': {
        if (req.method !== 'POST') return res.status(405).end();

        const { user_id, source = 'earthsoul' } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: '用户不存在' });

        try {
          await supabase('/reward_events', {
            method: 'POST',
            body: JSON.stringify({
              user_id, source,
              event_type: 'downloaded_card',
              points:     REWARD_CONFIG.downloaded_card.points,
              status:     'approved',
              event_date: todayUTC(),
              metadata:   {},
            }),
          });
          await recalculate(user_id);
          return res.status(200).json({
            success:       true,
            points_earned: REWARD_CONFIG.downloaded_card.points,
            message:       '+10 EarthSoul Points — Card downloaded!',
          });
        } catch (e) {
          if (isDuplicateError(e)) {
            return res.status(200).json({ success: false, points_earned: 0, message: "今天的下载积分已领取。" });
          }
          throw e;
        }
      }

      // ── 获取积分历史 ─────────────────────────────────────────
      // GET /api/rewards?action=history&user_id=xxx&limit=20
      case 'history': {
        if (req.method !== 'GET') return res.status(405).end();

        const { user_id, limit = '20' } = req.query;
        if (!user_id) return res.status(400).json({ error: 'user_id 不能为空' });

        const events = await supabase(
          `/reward_events?user_id=eq.${user_id}&order=created_at.desc&limit=${parseInt(limit)}&select=*`,
          { method: 'GET', prefer: '' }
        );

        let approved = 0, pending = 0;
        (events || []).forEach(e => {
          if (e.status === 'approved') approved += e.points;
          if (e.status === 'pending')  pending  += e.points;
        });

        return res.status(200).json({ events: events || [], total_approved: approved, total_pending: pending });
      }

      // ── 管理员手动调整积分（需要 x-admin-secret 请求头）────
      // POST /api/rewards?action=admin-adjust
      // Body: { user_id, points, reason, support_case_id?, admin_id }
      case 'admin-adjust': {
        if (req.method !== 'POST') return res.status(405).end();

        const adminSecret = req.headers['x-admin-secret'];
        if (adminSecret !== process.env.ADMIN_SECRET) {
          return res.status(401).json({ error: '未授权' });
        }

        const { user_id, points, reason, support_case_id, admin_id = 'admin' } = req.body;
        if (!user_id || points === undefined || !reason) {
          return res.status(400).json({ error: 'user_id、points、reason 不能为空' });
        }

        const user = await getUser(user_id);
        if (!user) return res.status(404).json({ error: '用户不存在' });

        await supabase('/reward_events', {
          method: 'POST',
          body: JSON.stringify({
            user_id, source: 'admin',
            event_type: 'admin_adjustment',
            points:     parseInt(points),
            status:     'approved',
            event_date: todayUTC(),
            metadata:   { reason, support_case_id, admin_id },
          }),
        });
        await recalculate(user_id);

        return res.status(200).json({
          success:      true,
          points_added: parseInt(points),
          message:      `管理员调整：${points > 0 ? '+' : ''}${points} 积分。原因：${reason}`,
        });
      }

      default:
        return res.status(400).json({ error: `未知操作: ${action}` });
    }

  } catch (err) {
    console.error('[api/rewards] 错误:', err.message);
    return res.status(500).json({ error: '服务器内部错误', detail: err.message });
  }
}
