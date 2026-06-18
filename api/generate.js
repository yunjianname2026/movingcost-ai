// ================================================================
// api/generate.js — 加入 IP 速率限制，防止恶意刷接口导致账单暴涨
// 规则：每个 IP 每小时最多调用 10 次
// ================================================================

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// 内存速率表（Vercel 单实例内有效，足够防止普通滥用）
const rateMap = new Map();
const LIMIT  = 10;               // 每小时最多 10 次
const WINDOW = 60 * 60 * 1000;  // 1 小时（毫秒）

function isAllowed(ip) {
  const now    = Date.now();
  const record = rateMap.get(ip);

  // 首次访问，或时间窗口已过期 → 重置计数
  if (!record || now - record.start > WINDOW) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }

  // 超过限制
  if (record.count >= LIMIT) {
    return false;
  }

  // 正常计数 +1
  record.count++;
  return true;
}

export default async function handler(req, res) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── 速率限制检查 ──
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
          || req.socket?.remoteAddress
          || 'unknown';

  if (!isAllowed(ip)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a while before trying again.'
    });
  }

  // ── 原有逻辑不变 ──
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `Claude API error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
