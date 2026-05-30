# MovingCOST.ai 改动记录

## 2026-05-29
- rename quiz.html → earthsoul.html（品牌统一，禁止改回）
- login.html: /quiz → /earthsoul
- verify.html: 同时写入 userEmail 和 mc_email 两个键
- magic_tokens 表建好，RLS权限修复
- Magic Link邮件发送成功
- verify.html merge到main部署成功

## 2026-05-30
### 修复（稳定修复模式，单点修复）
- fix: verify.html 新增写入 mc_user_id，解决 member.html 无法识别登录状态问题
- feat: member.html 新增 Sign Out 按钮，点击清空localStorage跳回首页
- fix: index.html 导航栏未登录时显示"Sign In"而非"Start Free Plan"
- fix: member.html Sign Out 按钮加 white-space:nowrap，解决手机端换行问题
- fix: member.html 删除导航栏多余的 FREE MEMBER 绿色徽章
- fix: member.html renderDashboard 加 navTier null 判断，解决积分页面崩溃问题
