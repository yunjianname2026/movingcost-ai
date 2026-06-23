// api/resend-report.js
// Report Recovery v2.1 — Resend My Report
//
// 系统归属：Report Engine（System A）
// 模块类型：CommonJS（require）
//
// 职责：验证 resend_token → 重发已存 report_html → 轮换 token
// ✅ 不调用 Claude API
// ✅ 不调用 /api/send-report（无循环依赖）

'use strict';

const { Resend } = require('resend');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;

// ── Supabase GET ──────────────────────────────────────────────────────────
async function dbGet(filter) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase env missing');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/report_orders?${filter}&limit=1`,
    {
      method:  'GET',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
      },
    }
  );
  if (!res.ok) throw new Error('DB GET failed: ' + res.status);
  return res.json();
}

// ── Supabase PATCH ────────────────────────────────────────────────────────
async function dbPatch(id, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/report_orders?id=eq.${encodeURIComponent(id)}`,
    {
      method:  'PATCH',
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    console.warn('[resend-report] PATCH failed:', res.status, txt.slice(0, 200));
  }
}

// ── 生成新 token（单次使用后轮换，旧链接立即失效）────────────────────────
function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── 主处理函数 ────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).send(errorPage('Method not allowed.'));
  }

  // ── 1. 获取并基础验证 token ───────────────────────────────────────────
  const token = (req.query.token || '').trim();
  if (!token || token.length < 10) {
    return res.status(400).send(errorPage('Invalid or missing token. Please check your email link.'));
  }

  // ── 2. 查询订单（通过 resend_token）──────────────────────────────────
  let orders;
  try {
    orders = await dbGet(`resend_token=eq.${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[resend-report] DB lookup error:', err.message);
    return res.status(500).send(errorPage(
      'System error. Please contact <a href="mailto:support@movingcost.ai">support@movingcost.ai</a>.'
    ));
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(404).send(errorPage(
      'This link is invalid or has already been used. ' +
      'Please contact <a href="mailto:support@movingcost.ai">support@movingcost.ai</a> for help.'
    ));
  }

  const order = orders[0];

  // ── 3. Token 过期检查 ─────────────────────────────────────────────────
  if (!order.resend_token_exp || new Date(order.resend_token_exp) < new Date()) {
    return res.status(410).send(errorPage(
      'This resend link has expired (valid for 7 days from report delivery). ' +
      'Please contact <a href="mailto:support@movingcost.ai">support@movingcost.ai</a>.'
    ));
  }

  // ── 4. 次数限制检查（7天内最多1次）────────────────────────────────────
  if ((order.resend_count || 0) >= 1) {
    return res.status(429).send(errorPage(
      'You have already used your free resend for this order. ' +
      'If you still need help, please contact ' +
      '<a href="mailto:support@movingcost.ai">support@movingcost.ai</a>.'
    ));
  }

  // ── 4. 检查 report_html 是否存在 ─────────────────────────────────────
  if (!order.report_html || order.report_html.length < 100) {
    console.warn('[resend-report] No report_html found for order:', order.id);
    return res.status(404).send(errorPage(
      'Your report is not yet available for resend. ' +
      'If you just paid, please wait a few minutes and try again, or contact ' +
      '<a href="mailto:support@movingcost.ai">support@movingcost.ai</a>.'
    ));
  }

  // ── 5. 直接重发已存的 report_html ────────────────────────────────────
  //    ✅ 不调用 Claude
  //    ✅ 不调用 /api/send-report
  try {
    const resend = new Resend(RESEND_KEY);
    await resend.emails.send({
      from:    'MovingCOST.ai <reports@movingcost.ai>',
      to:      order.email,
      replyTo: 'support@movingcost.ai',
      subject: 'Your MovingCOST.ai Report — Resent',
      html:    order.report_html,
    });
    console.log('[resend-report] Resent to:', order.email, '| order id:', order.id);
  } catch (sendErr) {
    console.error('[resend-report] Resend email failed:', sendErr.message);
    await dbPatch(order.id, {
      last_error: sendErr.message,
      updated_at: new Date().toISOString(),
    }).catch(() => {});
    return res.status(500).send(errorPage(
      'Failed to resend your report. Please try again in a few minutes, or contact ' +
      '<a href="mailto:support@movingcost.ai">support@movingcost.ai</a>.'
    ));
  }

  // ── 6. 更新计数 + 轮换 token（旧链接立即失效，防重复点击）─────────────
  const newToken   = generateToken();
  const newExpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await dbPatch(order.id, {
    resend_count:     (order.resend_count || 0) + 1,
    resend_token:     newToken,
    resend_token_exp: newExpDate.toISOString(),
    last_error:       null,
    updated_at:       new Date().toISOString(),
  }).catch(err => {
    console.warn('[resend-report] token rotation failed (non-fatal):', err.message);
  });

  // ── 7. 返回成功页 ─────────────────────────────────────────────────────
  return res.status(200).send(successPage(order.email));
};

module.exports.config = { maxDuration: 30 };

// ── 成功页 ────────────────────────────────────────────────────────────────
function successPage(email) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Report Resent — MovingCOST.ai</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#EEF4FB;font-family:Arial,Helvetica,sans-serif;
      display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .card{background:#fff;border-radius:18px;border:1px solid #DDE6F0;
      padding:40px 32px;max-width:480px;width:100%;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{font-size:22px;color:#0F172A;margin-bottom:12px;font-weight:600;}
    p{font-size:14px;color:#475569;line-height:1.7;margin-bottom:8px;}
    .em{font-weight:600;color:#0F172A;}
    .note{font-size:12px;color:#94A3B8;margin-top:20px;}
    a{color:#0EA5E9;text-decoration:none;}
    .btn{display:inline-block;margin-top:24px;background:#0EA5E9;color:#fff;
      padding:12px 28px;border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9989;</div>
    <h1>Report resent!</h1>
    <p>Your report has been sent to</p>
    <p><span class="em">${email}</span></p>
    <p style="margin-top:12px;">Please check your inbox and spam folder.<br>
      It may take 1&#8211;2 minutes to arrive.</p>
    <a href="https://movingcost.ai" class="btn">Back to MovingCOST.ai</a>
    <p class="note">Still not received?
      <a href="mailto:support@movingcost.ai">support@movingcost.ai</a></p>
  </div>
</body>
</html>`;
}

// ── 错误页 ────────────────────────────────────────────────────────────────
function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Error — MovingCOST.ai</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#EEF4FB;font-family:Arial,Helvetica,sans-serif;
      display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
    .card{background:#fff;border-radius:18px;border:1px solid #DDE6F0;
      padding:40px 32px;max-width:480px;width:100%;text-align:center;}
    .icon{font-size:48px;margin-bottom:16px;}
    h1{font-size:20px;color:#0F172A;margin-bottom:12px;font-weight:600;}
    p{font-size:14px;color:#475569;line-height:1.7;}
    a{color:#0EA5E9;text-decoration:none;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9888;&#65039;</div>
    <h1>Something went wrong</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
