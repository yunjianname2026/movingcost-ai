// ─────────────────────────────────────────────────────────
//  MovingCOST.ai — Vercel Serverless Function
//  File: /api/generate.js
//
//  This file runs on Vercel's servers (NOT in the user's browser).
//  The Claude API key is stored securely in Vercel's environment
//  variables and never exposed to anyone visiting the website.
// ─────────────────────────────────────────────────────────

export default async function handler(req, res) {

  // ── Allow the browser to call this endpoint ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Browser sends a "preflight" OPTIONS request first — just say OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Read the prompt sent from the user's browser ──
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  // ── Call Claude API (key stays safe on the server) ──
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,   // ← stored in Vercel, never visible to users
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    // If Claude returned an error, pass it along
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `Claude API error: ${response.status}`
      });
    }

    // Return Claude's response to the browser
    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    // Network or unexpected error
    console.error('API handler error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
