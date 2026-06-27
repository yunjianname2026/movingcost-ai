// api/webhook.js
// Stripe Webhook → receives payment → sends confirmation email via Resend

const { Resend } = require('resend');

// ── Supabase 写入工具（Report Recovery v2.1）─────────────────────────────
const SUPABASE_URL_WH = process.env.SUPABASE_URL;
const SUPABASE_KEY_WH = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function wh_supabaseInsert(body) {
  if (!SUPABASE_URL_WH || !SUPABASE_KEY_WH) {
    console.warn('[webhook] Supabase env missing — skipping report_orders insert');
    return;
  }
  const res = await fetch(`${SUPABASE_URL_WH}/rest/v1/report_orders`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY_WH,
      'Authorization': `Bearer ${SUPABASE_KEY_WH}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn('[webhook] report_orders insert failed:', res.status, txt.slice(0, 200));
  }
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Read raw body stream (required for Stripe signature verification)
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig           = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // ── 1. Verify Stripe signature ─────────────────────────────────────────
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: 'Webhook signature error: ' + err.message });
  }

  // ── 2. IMPORTANT: Return 200 immediately so Stripe doesn't timeout ─────
  // We process the event synchronously before responding
  // (Vercel terminates function after res is sent)

  // ── 3. Handle checkout.session.completed ──────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session       = event.data.object;
    const customerEmail = session.customer_details?.email;
    const customerName  = session.customer_details?.name || 'there';
    const sessionId     = session.id;
    const amountPaid    = ((session.amount_total || 0) / 100).toFixed(2);

    console.log('Payment success:', customerEmail, '$' + amountPaid, sessionId);

    if (customerEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from:    'MovingCOST.ai <reports@movingcost.ai>',
          to:      customerEmail,
          replyTo: 'support@movingcost.ai',
          subject: '✅ Payment confirmed — your MovingCOST.ai report is ready',
          html:    buildEmailHTML(customerName, sessionId, amountPaid),
        });
        console.log('Email sent:', result?.id || 'ok');
      } catch (emailErr) {
        // Log but DO NOT fail — Stripe must get 200
        console.error('Email send error (non-fatal):', emailErr.message);
      }
    }

    // ── [新增 v2.1] 创建 report_orders pending 记录（非阻断）────────────
    try {
      await wh_supabaseInsert({
        stripe_session_id: sessionId,
        email:             customerEmail || '',
        customer_name:     customerName  || '',
        payment_amount:    parseFloat(amountPaid),
        currency:          (session.currency || 'usd').toLowerCase(),
        status:            'pending',
      });
      console.log('[webhook] report_orders pending created:', sessionId);
    } catch (dbErr) {
      console.error('[webhook] report_orders insert error (non-fatal):', dbErr.message);
    }
  } else {
    // Log other event types but ignore them
    console.log('Webhook event received (ignored):', event.type);
  }

  // ── 4. Always return 200 to Stripe ────────────────────────────────────
  return res.status(200).json({ received: true });
}

// Attach config for Vercel/Next.js body parser disable
handler.config = {
  api: { bodyParser: false },
};

module.exports = handler;

// ── Email HTML ────────────────────────────────────────────────────────────
function buildEmailHTML(name, sessionId, amount) {
  const firstName = (name || 'there').split(' ')[0];
  const reportUrl = 'https://movingcost.ai/thank-you?session=' + sessionId;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#EFF6FF;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:48px 20px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#0F172A 0%,#0B2545 100%);border-radius:16px 16px 0 0;padding:36px 44px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-family:Outfit,Arial,sans-serif;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
          Moving<span style="color:#0EA5E9;">COST</span><span style="font-size:13px;color:#7DD3FC;font-weight:500;vertical-align:super;margin-left:1px;">.ai</span>
        </div>
        <div style="margin-top:6px;font-size:12px;color:rgba(255,255,255,0.45);letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">Payment Confirmed</div>
      </td>
      <td align="right">
        <div style="background:rgba(16,185,129,0.20);border:1px solid rgba(16,185,129,0.40);border-radius:20px;padding:6px 14px;display:inline-block;">
          <span style="font-size:13px;font-weight:700;color:#34D399;">✓ $${amount} paid</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:44px 44px 36px;">
    <h1 style="margin:0 0 10px;font-family:Outfit,Arial,sans-serif;font-size:28px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;line-height:1.2;">
      Hi ${firstName}! 👋<br>Your report is ready
    </h1>
    <p style="margin:0 0 36px;font-size:15px;color:#475569;line-height:1.65;">
      Thank you for your purchase. Head to your report page, enter your email, and your full AI planning report will begin generating. Most reports are ready within 5–10 minutes, depending on route complexity. We'll email it to you as soon as it's complete.
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr><td style="background:#0EA5E9;border-radius:10px;box-shadow:0 4px 14px rgba(14,165,233,0.30);">
        <a href="${reportUrl}" style="display:inline-block;padding:16px 44px;font-family:Outfit,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
          Go to My Report →
        </a>
      </td></tr>
    </table>

    <!-- What's included -->
    <div style="background:#F8FBFF;border:1px solid #E2E8F0;border-radius:12px;padding:22px 24px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px;">Your report includes</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;padding-bottom:10px;font-size:14px;color:#0F172A;">📊 Full cost breakdown</td>
          <td style="width:50%;padding-bottom:10px;font-size:14px;color:#0F172A;">🏠 Housing deep dive</td>
        </tr>
        <tr>
          <td style="padding-bottom:10px;font-size:14px;color:#0F172A;">🛂 Visa pathway</td>
          <td style="padding-bottom:10px;font-size:14px;color:#0F172A;">💰 Tax strategy</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#0F172A;">📅 90-day action plan</td>
          <td style="font-size:14px;color:#0F172A;">⚠️ Hidden cost alerts</td>
        </tr>
      </table>
    </div>

    <!-- Guarantee -->
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 22px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:20px;width:32px;vertical-align:top;">📋</td>
        <td style="padding-left:12px;vertical-align:top;">
          <div style="font-size:13px;font-weight:700;color:#92400E;">Not satisfied with your report?</div>
          <div style="font-size:13px;color:#B45309;margin-top:3px;line-height:1.5;">Reply within <strong>7 days</strong> and we'll regenerate it once for free.</div>
        </td>
      </tr></table>
    </div>

    <!-- Ref -->
    <div style="border-top:1px solid #F1F5F9;padding-top:18px;">
      <p style="margin:0;font-size:12px;color:#94A3B8;">
        Payment ref: <span style="font-family:monospace;color:#64748B;">${sessionId.slice(0,28)}...</span>
      </p>
    </div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F8FBFF;border-radius:0 0 16px 16px;padding:22px 44px;border-top:1px solid #E2E8F0;">
    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.7;">
      Questions? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;text-decoration:none;">support@movingcost.ai</a>
      &nbsp;·&nbsp; © 2025 CLASSIC SPREAD INC &nbsp;·&nbsp;
      <a href="https://movingcost.ai" style="color:#0EA5E9;text-decoration:none;">movingcost.ai</a><br>
      <span style="font-size:11px;color:#CBD5E1;">AI-generated planning estimates only · Not legal, tax, or immigration advice</span>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
