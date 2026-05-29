// api/magic-link.js
// 功能：接收邮箱 → 生成token → 存Supabase → 发Magic Link邮件

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  // 基础验证
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. 检查用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, points_balance, status')
      .eq('email', normalizedEmail)
      .single();

    if (userError || !user) {
      // 用户不存在 — 温和提示，不暴露系统信息
      return res.status(200).json({
        success: false,
        message: 'No account found with this email. Please complete the quiz first.'
      });
    }

    // 2. 生成安全token（32字节 = 64字符hex）
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟有效

    // 3. 清除该邮箱旧token（防止堆积）
    await supabase
      .from('magic_tokens')
      .delete()
      .eq('email', normalizedEmail);

    // 4. 存新token到Supabase
    const { error: insertError } = await supabase
      .from('magic_tokens')
      .insert({
        email: normalizedEmail,
        token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error('Token insert error:', insertError);
      return res.status(500).json({ error: 'Failed to generate login link' });
    }

    // 5. 构建Magic Link URL
    const baseUrl = process.env.BASE_URL || 'https://www.movingcost.ai';
    const magicLink = `${baseUrl}/verify?token=${token}`;

    // 6. 发送邮件
    const { error: emailError } = await resend.emails.send({
      from: 'MovingCOST.ai <reports@movingcost.ai>',
      to: normalizedEmail,
      subject: 'Your login link for MovingCOST — valid 30 minutes',
      html: buildEmailHtml(magicLink, user.points_balance || 0)
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({
      success: true,
      message: 'Magic link sent! Check your inbox.'
    });

  } catch (err) {
    console.error('Magic link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 邮件HTML模板（简洁版，后期可升级视觉）
function buildEmailHtml(magicLink, points) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F0F6FF;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6FF;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0F172A;border-radius:12px 12px 0 0;padding:28px 40px;">
              <span style="font-family:Outfit,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">
                Moving<span style="color:#0EA5E9;">COST</span><sup style="font-size:12px;color:#0EA5E9;">ai</sup>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:48px 40px;">
              <h1 style="margin:0 0 12px;font-family:Outfit,Arial,sans-serif;font-size:26px;font-weight:700;color:#0F172A;">
                Your login link is ready ✨
              </h1>
              <p style="margin:0 0 8px;font-size:16px;color:#475569;line-height:1.6;">
                Click the button below to instantly access your dashboard.
              </p>
              <p style="margin:0 0 32px;font-size:14px;color:#94A3B8;">
                This link expires in <strong>30 minutes</strong> and can only be used once.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#0EA5E9;border-radius:8px;">
                    <a href="${magicLink}"
                       style="display:inline-block;padding:14px 36px;font-family:Outfit,Arial,sans-serif;
                              font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Log In to My Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Points reminder -->
              <div style="background:#F0F6FF;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
                <p style="margin:0;font-size:14px;color:#0284C7;">
                  💎 You have <strong>${points} MovingCOST Points</strong> waiting in your account.
                </p>
              </div>

              <!-- Fallback link -->
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
                Button not working? Copy this link into your browser:<br>
                <a href="${magicLink}" style="color:#0EA5E9;word-break:break-all;">${magicLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FBFF;border-radius:0 0 12px 12px;padding:24px 40px;border-top:1px solid #E2E8F0;">
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
                If you didn't request this link, you can safely ignore this email.<br>
                Questions? <a href="mailto:support@movingcost.ai" style="color:#0EA5E9;">support@movingcost.ai</a><br>
                © 2025 CLASSIC SPREAD INC — <a href="https://movingcost.ai" style="color:#0EA5E9;">movingcost.ai</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
