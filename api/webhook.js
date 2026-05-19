// api/webhook.js
// Stripe Webhook → 收到付款成功通知 → 通过 Resend 发送报告邮件

const { Resend } = require('resend');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 关键：关闭默认 bodyParser，Stripe 签名验证需要原始 body
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// 读取原始请求体（用于 Stripe 签名验证）
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook 签名验证失败:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // 只处理：付款成功事件
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name || 'there';
    const sessionId = session.id;
    const amountPaid = (session.amount_total / 100).toFixed(2);

    console.log(`✅ 付款成功: ${customerEmail}, $${amountPaid}`);

    if (customerEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'MovingCOST.ai <reports@movingcost.ai>',
          to: customerEmail,
          subject: '✅ Your MovingCOST.ai Report is Ready!',
          html: generateEmailHTML(customerName, sessionId, amountPaid),
        });

        console.log(`📧 邮件已发送至: ${customerEmail}`);
      } catch (emailError) {
        console.error('❌ 邮件发送失败:', emailError);
        // 注意：即使邮件失败，也要返回 200，否则 Stripe 会重试 webhook
      }
    }
  }

  // 必须返回 200，告诉 Stripe 我们收到了
  return res.status(200).json({ received: true });
};

// ── 邮件 HTML 模板 ──────────────────────────────────────────────
function generateEmailHTML(name, sessionId, amount) {
  const reportUrl = `https://movingcost.ai/thank-you.html?session=${sessionId}`;
  const firstName = name.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;">

  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0F172A 0%,#0C2340 60%,#0E3D5C 100%);border-radius:16px;padding:48px 40px;text-align:center;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#BAE6FD;margin-bottom:16px;">
        Payment Confirmed
      </div>
      <h1 style="margin:0;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-1px;">
        Moving<span style="color:#0EA5E9;">COST</span>.ai
      </h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.65);font-size:16px;">
        Your personalized relocation report is ready
      </p>
    </div>

    <!-- Main Card -->
    <div style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #E2E8F0;margin-bottom:16px;">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0F172A;">
        Hi ${firstName}! 👋
      </h2>
      <p style="margin:0 0 24px;color:#64748B;font-size:15px;line-height:1.7;">
        Thank you for your purchase. Your AI-powered relocation cost analysis is ready to view. 
        Click the button below to access your full report.
      </p>

      <!-- Payment badge -->
      <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:16px 20px;margin-bottom:28px;display:flex;align-items:center;">
        <span style="font-size:20px;">✅</span>
        <div style="margin-left:12px;">
          <div style="font-size:13px;font-weight:700;color:#0F172A;">Payment Successful — $${amount}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:2px;">Ref: ${sessionId.slice(0, 24)}...</div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;">
        <a href="${reportUrl}" 
           style="display:inline-block;background:#0EA5E9;color:#ffffff;padding:16px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:-0.3px;">
          View My Full Report →
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">
          Or copy this link: <a href="${reportUrl}" style="color:#0EA5E9;">${reportUrl}</a>
        </p>
      </div>
    </div>

    <!-- What's included -->
    <div style="background:#ffffff;border-radius:16px;padding:32px 40px;border:1px solid #E2E8F0;margin-bottom:16px;">
      <h3 style="margin:0 0 20px;font-size:15px;font-weight:700;color:#0F172A;text-transform:uppercase;letter-spacing:0.06em;">
        Your Report Includes
      </h3>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${[
          ['💰', 'Complete cost breakdown — housing, food, transport, healthcare'],
          ['📊', 'Side-by-side city comparison with savings analysis'],
          ['🏠', 'Neighborhood recommendations for your budget'],
          ['📋', 'Moving checklist tailored to your timeline'],
          ['🤝', 'Curated partner services for your relocation'],
        ].map(([icon, text]) => `
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <span style="font-size:18px;flex-shrink:0;">${icon}</span>
          <span style="font-size:14px;color:#475569;line-height:1.5;">${text}</span>
        </div>`).join('')}
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;">
      <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.8;">
        <strong style="color:#0F172A;">MovingCOST.ai</strong><br>
        Helping people move smarter, worldwide<br>
        <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a>
      </p>
    </div>

  </div>
</body>
</html>
  `;
}
