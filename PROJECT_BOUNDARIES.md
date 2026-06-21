# PROJECT_BOUNDARIES.md
# MovingCOST.ai — 系统边界与操作铁律
# 最后更新：2026-06-20
# 维护人：Da Vinci / CLASSIC SPREAD INC

---

## 一、平台架构总览

MovingCOST.ai 由三个完全封闭、互不干涉的独立系统构成。
任何修改必须严格限定在对应系统边界内，禁止跨系统顺手修改。

---

## 二、三大封闭系统

### 系统 A — Report Engine（AI 报告生成）

**业务职责**：接收用户搬迁数据 → Stripe 收款 → Claude 两段式生成完整报告 → Resend 发送邮件

**核心文件**：
```
planner.html          # 三步表单（relocation / nomad / comparing）
thank-you.html        # 付款成功页（显示预览 + 邮件发送入口）
api/generate.js       # Claude 生成预览报告（免费，JSON格式）
api/send-report.js    # 两段式完整报告生成 + Resend 邮件发送
api/create-checkout.js  # Stripe Checkout Session 创建
api/webhook.js        # Stripe Webhook（checkout.session.completed）
```

**当前架构状态（已封版，commit 9fa9609）**：
- 两段式 Claude 调用：Part1（Section 0–5，10000 tokens）+ Part2（Section 6–10，10000 tokens）
- 完整 10 section 稳定输出 ✅
- maxDuration：800秒（vercel.json functions 块保留，仅限 send-report.js）
- Stripe Payment Link：https://buy.stripe.com/aFa6oG51x1KUgXT0C2cfK00
- 发件地址：reports@movingcost.ai（Resend，movingcost.ai 域名已验证）

**数据流**：
```
planner.html → localStorage(movingData) → Stripe付款
→ thank-you.html → /api/send-report → Claude(2次) → Resend邮件
同时：Stripe Webhook → /api/webhook → 付款确认邮件
```

**禁止动作**：
- 禁止修改 Claude 调用架构（已两段式稳定，不得合并或拆分）
- 禁止提高单次 max_tokens 超过 10000（Vercel 内存上限 ~255MB）
- 禁止在 vercel.json 中为此系统外的文件添加 maxDuration

---

### 系统 B — EarthSoul Engine（城市个性测验）

**业务职责**：城市性格测验 → 匹配城市类型 → 积分奖励触发

**核心文件**：
```
earthsoul.html        # 测验主页（文件名固定，禁止改回 quiz.html）
api/rewards.js        # 测验完成积分发放（quiz actions）
```

**当前状态**：
- Magic Link 登录回调已修复方向确认：`bind-email` API 返回 `user_id` + `earthsoul.html` 写入 `mc_user_id`
- test10 分支验证中（待 Cursor 执行后 Da Vinci 验收）

**禁止动作**：
- 禁止将 earthsoul.html 重命名为 quiz.html 或任何其他名称
- 禁止在 earthsoul.html 内修改与 Report Engine 相关的任何逻辑

---

### 系统 C — Member & Rewards Engine（会员与积分）

**业务职责**：Magic Link 登录 → 用户认证 → 积分体系 → 会员等级

**核心文件**：
```
login.html            # 邮箱登录入口（发送 Magic Link）
verify.html           # Magic Link 验证页
welcome.html          # 登录后欢迎页
member.html           # 会员中心（积分、等级、记录）
api/user.js           # 用户信息 + bind-email（需返回 user_id）
api/magic-link.js     # 生成并发送 Magic Link
api/verify-token.js   # Token 验证 + 用户创建/更新
api/referral.js       # 推荐码逻辑
```

**数据库（Supabase: movingcost-rewards）**：

| 表名 | 说明 |
|------|------|
| users | 用户主表（user_id UUID 主键，email，referral_code） |
| magic_tokens | Magic Link token（一次性，有效期15分钟） |
| reward_events | 积分事件（event_type 下划线格式，如 email_submitted） |

**已完成修复（Phase 1）**：
- `reward_events` 唯一约束 `uq_email_submitted` 已从 `metadata->>'email'` 修正为 `user_id`
- 重复积分记录已清理
- `api/user.js` 代码层去重逻辑已更新

**Magic Link 登录 bug 根因与修复**：
- 根因：`vercel.json` 的 `redirects` 块导致 `movingcost.ai` 与 `www.movingcost.ai` 的 localStorage 域名分裂
- 已修复：redirects 块已删除（commit 1b569a2）
- 待完成：`bind-email` API 返回 `user_id` + `earthsoul.html` 回调写入 `mc_user_id`（test10 验证中）

**localStorage 键名规范**：
```
mc_user_id   # 用户 UUID 主键（认证后由匿名 UUID 替换为真实 user_id）
mc_email     # 用户邮箱
movingData   # Report Engine 表单数据（属于系统 A，禁止此系统读写）
movingReport # Report Engine 预览报告（属于系统 A，禁止此系统读写）
```

**禁止动作**：
- 禁止触碰 API / 支付 / 认证逻辑，除非任务明确指定该系统
- 禁止将 mc_user_id 的写入逻辑挪入系统 A 文件

---

## 三、全局铁律（绝对不可违反）

| # | 铁律 | 违反后果 |
|---|------|----------|
| 1 | `package.json` 不含 `"type":"module"` | 所有 CommonJS API 模块崩溃 |
| 2 | `vercel.json` 不含 `redirects` 块 | localStorage 跨域分裂（已是根因！） |
| 3 | `vercel.json` 的 `functions` 块只保留 send-report.js（maxDuration: 800） | 其他函数超时配置异常 |
| 4 | `global.css` 只控制字体排版，不控制布局/display/汉堡菜单 | 全站样式级联污染 |
| 5 | `earthsoul.html` 文件名不得改回 quiz.html | URL 失效，积分触发断链 |
| 6 | 单次 Claude max_tokens 不超过 10000 | Vercel Fluid 内存溢出（254/255MB） |
| 7 | zsh 下含 `!` 字符禁止用 sed，改用 Python str.replace() | "event not found" 报错 |
| 8 | 批量 HTML 替换禁止用 re.sub() + re.DOTALL | 灾难性过度匹配 |
| 9 | 三系统严格隔离，禁止跨系统顺手修改 | 副作用扩散，回滚困难 |
| 10 | 所有变更：分析 → 方案 → Da Vinci 审批 → 执行 | 不可跳过任何环节 |

---

## 四、分支与部署规范

```
main         → Vercel 生产环境自动部署（movingcost.ai）
dev          → 日常开发分支
test / test* → 单项 bug 修复验证分支（如 test10）
```

**操作规范**：
1. 所有修改先在 dev 或 test 分支完成
2. Vercel Preview 验收通过后，Da Vinci 手动合并到 main
3. Cursor 执行多文件编辑，Claude 审查 PR diff 后再合并
4. 每次修改前备份，若无匹配则立即停止脚本

---

## 五、设计规范

**品牌色**：
```css
--blue: #0EA5E9
--blue-dark: #0284C7
--blue-light: #E0F2FE
--text: #0F172A
--text-mid: #475569
--text-muted: #94A3B8
--bg: #F0F6FF / #F8FBFF
--border: #E2E8F0
--success: #10B981
```

**字体**：Outfit（标题/数字） + DM Sans（正文）

**导航类型**：
- `nav-full`：首页、博客 index
- `nav-article`：博客文章页
- `nav-minimal`：功能页（planner / thank-you 等）

**Logo 规则**：
- 浅色背景导航：`logo-light-transparent.png`
- 深色背景 / 页脚 / EarthSoul：`logo-dark-transparent.png`

**博客基准文件**：`city-personality-vs-your-personality.html`（所有新文章导航/CSS/页脚以此为准）

**版权文本**：
```
© 2026 MovingCOST.ai. All rights reserved.
MovingCOST.ai™, City Soul™, EarthSoul™, and MovingCOST Points™ are brand assets of Classic Spread Inc.
```

---

## 六、Sign In 导航样式规范（已全站统一，2026-06-06）

- 标准样式：灰色细体，悬停变蓝，无背景色、无边框
- 修复方法：`:not(.is-member)` 透明样式 + `mobile-signin-link` 内联样式
- 博客全部 7 个文件已统一完成

---

## 七、当前待办（2026-06-20）

| 优先级 | 任务 | 状态 |
|--------|------|------|
| P0 | Magic Link 登录流程 test10 验收 | 待 Cursor 执行后验证 |
| P1 | 报告视觉效果优化 | 待开始 |
| P2 | 重发机制设计（7天内 1-2 次） | 待设计 |
| P3 | 付款后自动绑定会员 + 积分方案 | 待设计 |
| P4 | 博客内容持续发布（City Soul Journal） | 进行中 |
| P5 | 会员订阅（Plus/Pro/Annual）| Coming Soon |

---

## 八、技术栈速查

| 层 | 技术 |
|----|------|
| 前端 | 纯 HTML/CSS/JS（无框架） |
| 部署 | GitHub main → Vercel 自动部署 |
| 数据库 | Supabase（movingcost-rewards） |
| AI | Anthropic Claude claude-sonnet-4-6（两段式生成） |
| 支付 | Stripe Checkout Sessions（$9.90/报告） |
| 邮件 | Resend（reports@movingcost.ai / support@movingcost.ai） |
| 编码辅助 | Cursor（多文件编辑） |

**API 模块类型**：
- CommonJS（require）：`send-report.js`、`webhook.js`、`create-checkout.js`、`wx-signature.js`
- ESM（import/export）：`generate.js`、`magic-link.js`、`verify-token.js`、`user.js`、`rewards.js`、`referral.js`

---

*本文档为 MovingCOST.ai 项目唯一权威边界文件。每次重大变更后需同步更新。*
