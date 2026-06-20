// api/wx-signature.js
// 微信 JSSDK 签名接口
// 用于生成 wx.config() 所需的签名，让网页可以调用微信分享接口

const crypto = require('crypto');

// ── 内存缓存 access_token 和 jsapi_ticket（有效期7200秒）──────────────────
let cache = {
  accessToken: null,
  accessTokenExpiry: 0,
  jsapiTicket: null,
  jsapiTicketExpiry: 0,
};

async function getAccessToken() {
  const now = Date.now();
  if (cache.accessToken && now < cache.accessTokenExpiry) {
    return cache.accessToken;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}`;
  const resp = await fetch(url);
  const data = await resp.json();

  if (!data.access_token) {
    throw new Error('Failed to get access_token: ' + JSON.stringify(data));
  }

  cache.accessToken = data.access_token;
  cache.accessTokenExpiry = now + (data.expires_in - 300) * 1000; // 提前5分钟刷新
  return cache.accessToken;
}

async function getJsapiTicket() {
  const now = Date.now();
  if (cache.jsapiTicket && now < cache.jsapiTicketExpiry) {
    return cache.jsapiTicket;
  }

  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`;
  const resp = await fetch(url);
  const data = await resp.json();

  if (data.errcode !== 0) {
    throw new Error('Failed to get jsapi_ticket: ' + JSON.stringify(data));
  }

  cache.jsapiTicket = data.ticket;
  cache.jsapiTicketExpiry = now + (data.expires_in - 300) * 1000;
  return cache.jsapiTicket;
}

function generateSignature(ticket, nonceStr, timestamp, url) {
  // 微信签名算法：按字典序排列后 SHA1
  const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  return crypto.createHash('sha1').update(str).digest('hex');
}

module.exports = async function handler(req, res) {
  // 允许跨域（同域调用不需要，但保险起见加上）
  res.setHeader('Access-Control-Allow-Origin', 'https://www.movingcost.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const pageUrl = req.query.url;
  if (!pageUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  if (!process.env.WX_APP_ID || !process.env.WX_APP_SECRET) {
    console.warn('wx-signature: WX_APP_ID/WX_APP_SECRET not configured (share disabled)');
    return res.status(503).json({ error: 'wechat_share_unavailable', shareDisabled: true });
  }

  try {
    const ticket     = await getJsapiTicket();
    const nonceStr   = Math.random().toString(36).slice(2, 18);
    const timestamp  = Math.floor(Date.now() / 1000);
    const signature  = generateSignature(ticket, nonceStr, timestamp, pageUrl);

    // 缓存签名结果5分钟（不缓存url，每个url不同）
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      appId:     process.env.WX_APP_ID,
      timestamp,
      nonceStr,
      signature,
    });
  } catch (err) {
    const msg = err.message || String(err);
    const isIpWhitelist =
      msg.includes('40164') ||
      msg.includes('not in whitelist') ||
      msg.includes('invalid ip');

    if (isIpWhitelist) {
      console.warn('wx-signature: WeChat share unavailable (IP whitelist):', msg.slice(0, 160));
    } else {
      console.error('wx-signature error:', msg);
    }

    return res.status(503).json({
      error: isIpWhitelist ? 'wechat_share_unavailable' : 'wechat_signature_failed',
      shareDisabled: true,
    });
  }
};
