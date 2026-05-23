// api/webhook.js
// Stripe Webhook → receives payment → sends confirmation email via Resend

const { Resend } = require('resend');
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
    // Return 400 only for signature errors (Stripe should not retry bad sigs)
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

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:600px;margin:0 auto;padding:40px 20px;">' +

    // Header
    '<div style="background:linear-gradient(135deg,#0F172A 0%,#0C2340 60%,#0E3D5C 100%);border-radius:16px;padding:48px 40px;text-align:center;margin-bottom:24px;">' +
    '<div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#BAE6FD;margin-bottom:16px;">Payment Confirmed</div>' +
    '<h1 style="margin:0;font-size:34px;font-weight:800;color:#fff;letter-spacing:-1px;">Moving<span style="color:#0EA5E9;">COST</span>.ai</h1>' +
    '<p style="margin:14px 0 0;color:rgba(255,255,255,0.65);font-size:16px;">Your AI planning report is ready</p>' +
    '</div>' +

    // Card
    '<div style="background:#fff;border-radius:16px;padding:36px 40px;border:1px solid #E2E8F0;margin-bottom:16px;">' +
    '<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0F172A;">Hi ' + firstName + '! 👋</h2>' +
    '<p style="margin:0 0 22px;color:#64748B;font-size:15px;line-height:1.7;">Thank you for your purchase. Enter your email on the thank-you page to generate and receive your complete AI planning report.</p>' +

    // Payment badge
    '<div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:14px 18px;margin-bottom:24px;">' +
    '<div style="font-size:13px;font-weight:700;color:#0F172A;">✅ Payment Successful — $' + amount + '</div>' +
    '<div style="font-size:11px;color:#94A3B8;margin-top:4px;">Ref: ' + sessionId.slice(0, 28) + '...</div>' +
    '</div>' +

    // CTA
    '<div style="text-align:center;">' +
    '<a href="' + reportUrl + '" style="display:inline-block;background:#0EA5E9;color:#fff;padding:14px 36px;border-radius:99px;text-decoration:none;font-weight:700;font-size:15px;">Go to My Report →</a>' +
    '<p style="margin:10px 0 0;font-size:12px;color:#94A3B8;">Or open: <a href="' + reportUrl + '" style="color:#0EA5E9;">' + reportUrl + '</a></p>' +
    '</div></div>' +

    // Regeneration guarantee
    '<div style="background:#FFF7ED;border:1.5px solid #FCD34D;border-radius:12px;padding:20px 24px;margin-bottom:16px;text-align:center;">' +
    '<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#92400E;">📋 Not satisfied with your report?</p>' +
    '<p style="margin:0;font-size:13px;color:#B45309;line-height:1.7;">Reply to this email within <strong>7 days</strong> and we\'ll regenerate it once for free.</p>' +
    '</div>' +

    // Footer
    '<div style="text-align:center;padding:20px 0;">' +
    '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0F172A;">MovingCOST.ai</p>' +
    '<p style="margin:0;font-size:12px;color:#94A3B8;">Questions? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a></p>' +
    '<p style="margin:8px 0 0;font-size:11px;color:#CBD5E1;">AI-generated planning estimates only · Not legal, tax, or immigration advice</p>' +
    '</div>' +

    '</div></body></html>';
}
