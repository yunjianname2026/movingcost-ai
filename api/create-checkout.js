// api/create-checkout.js
// Creates a Stripe Checkout Session and encodes user data in the success URL.
// This is the reliable replacement for the fixed Payment Link approach.

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userData } = req.body;
    if (!userData) return res.status(400).json({ error: 'Missing userData' });

    // Encode ONLY essential fields into the success URL (keeps URL short & safe)
    const essential = {
      type: userData.type || 'relocation',
      from: userData.from || '',
      to:   userData.to   || '',
      who:  userData.who  || '',
      income:    userData.income    || '',
      lifestyle: userData.lifestyle || '',
      employment:userData.employment|| '',
      notes:     userData.notes     || ''
    };

    // URL-safe base64 encoding
    const encoded = Buffer.from(JSON.stringify(essential)).toString('base64url');
    const successUrl = `https://www.movingcost.ai/thank-you?d=${encoded}`;

    // Dynamically require stripe (already in package.json)
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 990, // $9.90
          product_data: {
            name: 'MovingCOST.ai — Full Relocation Planning Report',
            description: `AI Planning Report: ${userData.from || 'Origin'} → ${userData.to || 'Destination'}`,
          },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url:  'https://www.movingcost.ai/planner',
    });

    console.log('Checkout session created:', session.id, '| to:', userData.to);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('create-checkout error:', err.message);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
