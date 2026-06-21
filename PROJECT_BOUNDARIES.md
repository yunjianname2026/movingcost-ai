# MovingCOST.ai Project Constitution
# 系统边界、开发治理与操作铁律
#
# 版本：v2.0
# Status: Effective
# Effective Date: 2026-06-21
# Approved by: Da Vinci / CLASSIC SPREAD INC
# 维护人：Da Vinci / CLASSIC SPREAD INC
# 基于：v1.0（2026-06-19）+ 0621状态快照 + 治理修订指令
#
# 正式批准并 merge main 后，版本更新为 v2.0 Effective，
# 并在 Changelog 记录批准人、生效日期和生效 commit。
#
# 本文档是 MovingCOST.ai 项目的最高级开发行为规范。
# 适用于所有协作者：Da Vinci、以及任何被指定参与的 AI 或人类。
# 规则优先级高于任何 AI 自主建议和未经批准的范围扩大。

---

## 1. 文档地位、适用范围和规则优先级

### 1.1 文档地位

本文档是 MovingCOST.ai 项目的唯一权威治理文件，相当于项目"宪法"。
- 不是普通说明文档，不是备忘录，不是可选参考。
- 所有开发行为、AI 任务、代码修改、数据库操作，均须在本文档框架内进行。
- 本文档存放于仓库根目录：`PROJECT_BOUNDARIES.md`，是唯一正式版本。

### 1.2 适用范围

本文档适用于所有当次参与 MovingCOST.ai 项目的协作者，无论是 AI 工具还是人类。
协作者的具体职责不按品牌永久固定，每次任务开始前必须明确记录当次角色分工（见第2章）。

### 1.3 规则优先级

```
本文档规则
  > Da Vinci 一般性或模糊性临时指令（本文档默认适用）
  > 任何 AI 的自主建议
  > 任何"顺手优化"冲动
  > 任何"代码更优雅"判断
```

**例外机制**：
Da Vinci 可通过以下三种方式批准对特定条款的例外：
1. `Explicit Exception`：在当次对话中明确书面批准
2. `Emergency Override`：紧急情况下的临时覆盖
3. 正式 Amendment：更新本文档并记录 Changelog

每次例外必须记录：
- 原规则
- 例外内容
- 原因
- 文件白名单
- 已知风险
- 回滚点
- 适用期限

**例外仅限当次批准范围，不自动成为永久规则。**

---

## 2. 核心治理原则

### 2.1 五大原则

1. **分析优先**：任何修改前，先只读分析，提出精确方案（含明确 diff），等待 Da Vinci 审批，再执行。
2. **系统隔离**：三个业务域内部实现严格隔离；跨域交互仅允许通过本文明确列出的 API、字段、event_type 和数据契约完成。修改必须明确属于某一业务域。
3. **白名单制**：每次修改前必须明确列出允许修改的文件白名单。实际 diff 出现白名单外文件，立即停止，不得提交。
4. **事实优先**：必须读取真实文件内容，禁止根据截图、记忆或推断编写替换脚本。
5. **可追溯**：每次修改必须留下 commit message、Da Vinci 审批记录和可审查的 diff。Standard Branch / PR Path 与 Authorized Terminal Execution Path 必须走 PR；仅在 Da Vinci 明确批准 Explicit Exception 或 Emergency Override 时，可以采用本文规定的例外流程，并在事后补齐 commit、diff 审查和变更记录。

### 2.2 当次任务角色分工

每次任务开始前，必须明确记录以下五个角色。角色不按 AI 品牌永久绑定，每次任务可指定不同协作者。

| 角色 | 定义 | 权限 |
|------|------|------|
| **Decision Owner** | Da Vinci | 最终决策、审批、发布 |
| **Architect / Analyst** | 当次指定的 AI 或人类 | 只读分析、起草方案、提出 diff |
| **Executor** | 当次明确指定的 AI、工具、人类或 Da Vinci | 执行已批准方案，仅此 |
| **Independent Reviewer** | 与 Executor 相对独立的 AI 或人类 | 审查 diff、验收清单、提出质疑 |
| **Release Approver** | Da Vinci | 批准合并 main，批准生产发布 |

**任何未被明确指定为 Executor 的协作者，不得写入仓库。**

**任务开始前必须记录的信息**：
```
任务描述：_______________
Architect / Analyst：_______________
Executor：_______________
Independent Reviewer：_______________
文件白名单：_______________
Release Approver：Da Vinci
```

### 2.3 Executor 权限边界

Executor 只能实施已获 Da Vinci 批准的方案，执行过程中不得：
- 自行改变技术路线
- 自行扩大文件范围
- 顺手优化
- 顺手重构
- 因个人判断修改已批准方案
- 修改文件白名单之外的文件

**如果 Executor 发现批准方案存在问题**：
1. 立即停止执行
2. 提交冲突描述和替代方案
3. 等待 Da Vinci 重新批准
4. 不得边执行边自行改方案

### 2.4 AI 行为禁令

任何参与的 AI 不得：
- 顺手优化非任务文件
- 顺手重构代码结构
- 修改任务范围之外的文件
- 因"代码更优雅"改变稳定业务逻辑
- 未经批准扩大任务范围
- 根据截图猜测文件结构
- 对高危文件在未获授权时进行任何写操作
- 将已完成的修复标记为"待完成"并重复实施

### 2.5 标准工作流

```
只读分析（Architect / Analyst）
  → 提出精确修复方案（含 diff、影响文件清单）
  → Da Vinci 审批
  → 确认 Pre-Change Checklist（Executor）
  → 在批准分支执行（Executor）
  → Post-Change Checklist 验证（Executor + Independent Reviewer）
  → Vercel Preview 验收
  → Da Vinci 审批合并（Release Approver）
  → merge main
  → 生产验收
```

---

## 3. 平台架构总览与跨系统接口原则

### 3.1 系统总览

```
┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
│   Report Engine     │  │  EarthSoul Engine   │  │ Member & Rewards     │
│   System A          │  │  System B           │  │ Engine  System C     │
│                     │  │                     │  │                      │
│ planner.html        │  │ earthsoul.html      │  │ login.html           │
│ thank-you.html      │  │                     │  │ verify.html          │
│ api/generate.js     │  │ api/rewards.js      │  │ welcome.html         │
│ api/send-report.js  │  │ (quiz actions only) │  │ member.html          │
│ api/create-checkout │  │                     │  │ api/user.js          │
│ api/webhook.js      │  │                     │  │ api/magic-link.js    │
│                     │  │                     │  │ api/verify-token.js  │
│                     │  │                     │  │ api/rewards.js       │
│                     │  │                     │  │ (member actions)     │
│                     │  │                     │  │ api/referral.js      │
└─────────────────────┘  └─────────────────────┘  └──────────────────────┘

共享基础设施（不属于任何单一系统，修改须专项任务 + Da Vinci 授权）：
  global.css / vercel.json / package.json
  api/wx-signature.js
  index.html / about.html / contact.html / privacy.html / terms.html / services.html
  blog/index.html / 全部博客文章页
  Supabase: users 表（Member Engine 拥有主要管理权和完整字段写权；其他系统只能通过本文明确批准的有限字段或接口契约写入）
  Stripe / Resend / GA4 / Google Search Console
```

### 3.2 跨系统数据契约（明确批准的跨系统接口）

以下为经 Da Vinci 批准的跨系统接口，不属于"顺手修改"：

| 接口 | 调用方 | 被调用方 | 契约内容 |
|------|--------|----------|----------|
| `api/user.js?action=create` | EarthSoul (earthsoul.html) | Member Engine | 前端生成 UUID 后调用创建/更新匿名用户记录 |
| `api/user.js?action=bind-email` | EarthSoul (earthsoul.html) | Member Engine | 用户输入邮箱后绑定，返回真实 user_id |
| Stripe Webhook → `purchase_completed` | Report Engine (webhook.js) | 共享数据层 | webhook 写入 reward_events，不直接调用 Member Engine API |

**禁止的跨系统调用**：
- 任何系统直接修改另一系统的前端页面逻辑
- 任何系统直接修改另一系统的 API 文件
- 跨系统共用 localStorage 键（各键归属见第15章）

---

## 4. System A — Report Engine（报告引擎）

### 4.1 业务职责

接收用户搬迁数据 → Stripe 收款 → Claude 两段式生成完整报告 → Resend 发送邮件

### 4.2 所属文件

| 类型 | 文件 |
|------|------|
| 前端 | `planner.html`、`thank-you.html` |
| API | `api/generate.js`、`api/send-report.js`、`api/create-checkout.js`、`api/webhook.js` |
| 外部服务 | Stripe、Resend（reports@movingcost.ai） |

### 4.3 允许修改范围

- AI 报告内容结构、章节、prompt
- 付款成功后的展示逻辑（thank-you.html）
- 邮件模板文案（send-report.js 内）
- Stripe webhook 事件处理逻辑

### 4.4 数据表读写权限

| 表 | 权限 | 限制 |
|----|------|------|
| `users` | 只读 | 仅读 email 用于发送报告（经批准的有限接口） |
| `reward_events` | 写入（经批准的跨系统数据契约） | 仅限 `purchase_completed`，由 webhook.js 触发 |
| `magic_tokens` | 禁止 | — |

### 4.5 当前架构状态

详见 Appendix A。

### 4.6 支付链路说明

**Canonical Production Path（当前主链路）**：
```
planner.html → /api/create-checkout → Stripe Checkout Session → Stripe 付款页
```

**Fallback Path（降级链路）**：
```
当 /api/create-checkout 失败时 → 固定 Payment Link 跳转
```

代码逻辑：planner.html 的 `goToCheckout()` 函数先调用 `/api/create-checkout`，
catch 块中降级到固定 Payment Link。两者不并列，前者为主，后者为容错。

### 4.7 允许调用的跨系统接口

- 无（Report Engine 不主动调用其他系统 API；webhook 写入 reward_events 属于批准的数据契约，见3.2）

### 4.8 禁止在本系统任务中触碰

- `earthsoul.html`、`member.html`、`login.html`、`verify.html`、`welcome.html`
- `api/user.js`、`api/magic-link.js`、`api/verify-token.js`、`api/rewards.js`（quiz actions）、`api/referral.js`
- `vercel.json`（除非专项任务）
- `global.css`
- 禁止修改 Claude 两段式调用架构（已封版，不得合并或拆分）
- 禁止提高单次 max_tokens 超过 10000

### 4.9 独立验收清单

- [ ] planner.html 三步表单正常提交（relocation / nomad / comparing）
- [ ] AI 生成预览报告（generate.js）正常返回 JSON
- [ ] 主链路：/api/create-checkout 正常返回 Stripe Checkout Session URL
- [ ] 降级链路：API 失败时跳转固定 Payment Link（$9.90）
- [ ] 付款成功跳回 thank-you.html，预览报告从 localStorage 正常显示
- [ ] 用户填邮箱后收到完整报告邮件（两段式拼接，Section 0 免责声明 + Section 1-10）
- [ ] Stripe webhook 触发后 `purchase_completed` 写入 reward_events

---

## 5. System B — EarthSoul Engine（城市人格测试引擎）

### 5.1 业务职责

城市性格测验 → 匹配城市类型 → 积分奖励触发

### 5.2 所属文件

| 类型 | 文件 |
|------|------|
| 前端 | `earthsoul.html`（文件名固定，禁止改回 quiz.html 或任何其他名称） |
| API | `api/rewards.js`（仅 quiz-completed、shared-result、downloaded-card actions） |

### 5.3 允许修改范围

- 测试题目内容、城市类型结果文案
- 分享卡片样式
- 积分触发逻辑（quiz_completed +20、shared_result +50、downloaded_card +10）
- Save My Points 表单 UI（非绑定逻辑）

### 5.4 数据表读写权限

| 表 | 权限 | 详细说明 |
|----|------|----------|
| `users` | 读 + 明确批准的有限写 | 见下方说明 |
| `reward_events` | 写入 | 仅限 `quiz_completed`、`shared_result`、`downloaded_card` |
| `magic_tokens` | 禁止 | — |

**EarthSoul 对 users 表的允许操作（经本文明确批准）**：
- 通过 `api/user.js?action=create` 创建或 upsert 匿名用户（前端生成 UUID，后端写入 id、referral_code、referred_by、points_balance、status）
- 通过已批准的奖励重算逻辑（recalculate）更新 `points_balance`

**EarthSoul 不得写入的 users 字段（Member Engine 专属）**：
- `email`、`membership_tier`、`membership_status`、`member_since` 及其他会员管理字段

### 5.5 当前状态

详见 Appendix A。

### 5.6 允许调用的跨系统接口

- `api/user.js?action=create`：初始化匿名用户
- `api/user.js?action=bind-email`：用户在 Save My Points 输入邮箱时调用

### 5.7 禁止在本系统任务中触碰

- `api/user.js` 的任何代码本体（可调用，不可修改）
- `member.html`、`login.html`、`verify.html`、`welcome.html`
- `reward_events` 的 `email_submitted`、`purchase_completed` 事件
- `vercel.json`、`global.css`
- Report Engine 全部文件

### 5.8 独立验收清单

- [ ] EarthSoul 完成测试 → reward_events 写入 `quiz_completed` +20
- [ ] 同一用户重复完成 → 不重复写入（unique index 保护）
- [ ] 分享结果 → `shared_result` +50（每天一次）
- [ ] 下载卡片 → `downloaded_card` +10（每天一次）
- [ ] Save My Points 表单显示正常，输入邮箱后触发 bind-email（转交 Member Engine）
- [ ] bind-email 成功后 earthsoul.html 回调将 localStorage `mc_user_id` 更新为真实 user_id

---

## 6. System C — Member & Rewards Engine（会员与积分引擎）

### 6.1 业务职责

Magic Link 登录 → 用户认证 → 积分体系 → 会员等级

### 6.2 所属文件

| 类型 | 文件 |
|------|------|
| 前端 | `login.html`、`verify.html`、`welcome.html`、`member.html` |
| API | `api/user.js`（全部 actions）、`api/magic-link.js`、`api/verify-token.js`、`api/rewards.js`（email-submitted action）、`api/referral.js` |

### 6.3 允许修改范围

- Magic Link 发送与验证逻辑
- bind-email 绑定流程与返回字段
- member.html Dashboard 展示逻辑
- 积分计算与历史查询
- 推荐系统逻辑

### 6.4 数据表读写权限

| 表 | 权限 | 限制 |
|----|------|------|
| `users` | 主要管理权 + 完整字段读写 | email、membership_tier、membership_status、points_balance、member_since 等所有字段；其他系统只能通过本文批准的有限接口写入 |
| `magic_tokens` | 全字段读写 | 一次性 token，有效期15分钟 |
| `reward_events` | 写入 | `email_submitted`、`friend_completed_quiz`、`friend_submitted_email`、`friend_purchase_completed`、`admin_adjustment` |

### 6.5 当前状态

详见 Appendix A。

### 6.6 允许调用的跨系统接口

- 无（Member Engine 不主动调用其他系统）

### 6.7 禁止在本系统任务中触碰

- `planner.html`、`thank-you.html`
- `api/generate.js`、`api/send-report.js`、`api/create-checkout.js`、`api/webhook.js`
- `earthsoul.html` 的测试题目、城市类型结果逻辑
- Stripe、Resend 配置
- `vercel.json`（除非专项任务）

### 6.8 独立验收清单

- [ ] /login 输入邮箱 → 收到 Magic Link 邮件
- [ ] 点击邮件链接 → /verify 成功 → localStorage 写入 `mc_user_id`（真实用户 id）+ `mc_email`
- [ ] /verify → 自动跳转 /member → 显示完整 Dashboard（非 gate）
- [ ] EarthSoul Save My Points → bind-email → localStorage `mc_user_id` 更新为绑定用户 id
- [ ] bind-email 成功 → 跳转 /welcome → Enter Member Center → 完整 Dashboard
- [ ] 同一用户多次 bind-email → `email_submitted` 积分只发一次
- [ ] /member Dashboard 显示正确积分总额、邮箱、推荐码

---

## 7. Shared Infrastructure（共享基础设施）

### 7.1 原则

共享文件不属于任何单一系统。**任何系统任务不得顺手修改共享文件。** 修改共享文件必须：
1. 作为独立专项任务提出
2. 获得 Da Vinci 明确批准
3. 单独 commit，不与业务系统修改混入

### 7.2 共享文件清单

| 文件 / 服务 | 说明 | 修改限制 |
|-------------|------|----------|
| `global.css` | 全站字体与标题系统（见7.3） | 专项任务 + Da Vinci 授权 |
| `vercel.json` | Vercel 配置（cleanUrls、functions块、不得含redirects） | 专项任务 + Da Vinci 授权 |
| `package.json` | Node依赖（不得加 `"type":"module"`） | 专项任务 + Da Vinci 授权 |
| `api/wx-signature.js` | 微信社交分享签名接口（见7.4） | 专项任务 + Da Vinci 授权 |
| `index.html` | 首页 | 专项任务 + Da Vinci 授权 |
| `about.html` / `contact.html` / `privacy.html` / `terms.html` / `services.html` | 静态公共页 | 专项任务 + Da Vinci 授权 |
| `blog/index.html` + 全部博客文章页 | 博客系统 | 专项任务 + Da Vinci 授权 |
| Supabase `users` 表 | Member Engine 拥有主要管理权和完整字段写权；其他系统只能通过本文明确批准的有限字段或接口契约写入 | 见各系统章节 |
| Stripe | 支付系统（零容错） | Da Vinci 明确授权的专项任务；可由当次指定的 Executor 执行。涉及账户权限、密钥、支付生产配置时，必须由 Da Vinci 最终确认 |
| Resend | 邮件服务 | Da Vinci 明确授权的专项任务；可由当次指定的 Executor 执行。涉及账户权限、密钥、邮件生产配置时，必须由 Da Vinci 最终确认 |
| GA4 / Google Search Console | 分析工具 | Da Vinci 明确授权的专项任务；可由当次指定的 Executor 执行。涉及分析平台管理权限时，必须由 Da Vinci 最终确认 |

### 7.3 global.css 真实边界（基于代码核实，2026-06-21）

当前 global.css 实际控制范围：
- **标题字体**：h1-h3 及大量 class 选择器 → Playfair Display（衬线）
- **导航与按钮**：nav a、.btn、.cta-btn → `white-space: nowrap`
- **按钮 display**：`.btn`、`.cta-btn`、`.cta-box a` → `display: inline-flex`
- **移动端字号**：h1/h2 在 max-width: 640px 下的 clamp 规则
- **EarthSoul 例外**：注释明确不覆盖 earthsoul 的 hero-title（已有 Cormorant Garamond）
- **汉堡菜单**：注释明确"由各页面自身 CSS 控制，global.css 不干预"

修改 global.css 时必须核实当前文件全文再操作，禁止基于以上描述直接编写替换脚本。

### 7.4 api/wx-signature.js（WeChat Share Adapter）

**归属**：Shared Infrastructure

**职责**：为微信社交分享提供签名接口，使分享时带图片和文字摘要（而非纯文字链接）。

**经代码搜索确认的当前调用页面**（截至 2026-06-21，见 Appendix A）：
- `index.html`
- `planner.html`
- `thank-you.html`
- `contact.html`
- `privacy.html`
- `terms.html`

**当前未调用**：`earthsoul.html`、`blog/**`

**背景**：当前主要市场为欧美英文用户，微信分享为辅助功能。三个月后扩展中文/西班牙文版本时，此模块重要性将提升。

**修改规则**：作为共享文件，修改须专项任务 + Da Vinci 授权，不得在任何单一系统任务中顺手修改。

### 7.5 api/rewards.js 按 action 归属

`api/rewards.js` 同时服务两个系统，修改时必须严格限定 action 范围：

| Action (API 参数) | event_type (数据库) | 归属系统 | 积分规则 |
|-------------------|---------------------|----------|----------|
| `quiz-completed` | `quiz_completed` | EarthSoul Engine | +20，每用户一次 |
| `shared-result` | `shared_result` | EarthSoul Engine | +50，每天一次 |
| `downloaded-card` | `downloaded_card` | EarthSoul Engine | +10，每天一次 |
| `email-submitted` | `email_submitted` | Member Engine | +30，每用户一次（uq_email_submitted 保护） |
| — | `purchase_completed` | Report Engine（via webhook） | +200，由 webhook.js 直接写入 |
| `admin-adjust` | `admin_adjustment` | Member Engine（管理员） | 自定义，须 ADMIN_SECRET |
| — | `friend_completed_quiz` | Member Engine（referral） | +100，pending |
| — | `friend_submitted_email` | Member Engine（referral） | +50，approved |
| — | `friend_purchase_completed` | Member Engine（referral） | +300，pending |

**规则**：修改 EarthSoul actions 时不得顺手修改 Member actions，反之亦然。

---

## 8. 全局技术铁律

| # | 铁律 | 违反后果 | 来源事故 |
|---|------|----------|----------|
| 1 | `package.json` 不含 `"type":"module"` | 所有 CommonJS API 模块崩溃 | 架构教训 |
| 2 | `vercel.json` 不含 `redirects` 块 | localStorage 跨域分裂 | Magic Link bug 根因 |
| 3 | `vercel.json` 的 `functions` 块只保留 `send-report.js`（maxDuration: 800） | 其他函数超时配置异常 | 架构规范 |
| 4 | `global.css` 修改前必须读取当前全文，基于真实内容操作 | 描述与代码不符导致错误替换 | 治理规范 |
| 5 | `earthsoul.html` 文件名不得改回 quiz.html 或任何其他名称 | URL 失效，积分触发断链 | 命名规范 |
| 6 | 单次 Claude max_tokens 不超过 10000 | Vercel Fluid 内存溢出（~255MB） | 内存溢出事故 |
| 7 | zsh 下含 `!` 字符的命令禁止用 sed，改用 Python | "event not found" 报错 | zsh 兼容性 |
| 8 | 任何文本替换前必须检查：匹配次数（前）= 预期次数，替换后确认 diff；0次或超预期立即停止 | 替换错位，难以发现 | 替换事故 |
| 9 | 三个业务域内部严格隔离；跨域交互只能通过本文批准的接口和数据契约完成，禁止顺手跨域修改 | 副作用扩散，回滚困难 | 多次事故 |
| 10 | 所有变更：分析 → 方案 → Da Vinci 审批 → 执行 | 不可跳过任何环节 | 核心流程 |
| 11 | 禁止 force push（任何分支） | 不可逆 | Git 规范 |
| 12 | 禁止根据截图猜测文件结构编写替换脚本 | 脚本错乱，覆盖错误内容 | 截图误判事故 |
| 13 | CommonJS 文件用 `node --check` 验证语法；ESM 文件不得用 `node --check`，必须使用与当前项目/Vercel 环境兼容的 parser、构建检查、动态 import 检查或 Preview 实际 API 请求验证；不得为通过检查工具而改变文件模块类型 | 工具误用或模块类型被错误改变 | 模块规范 |
| 14 | 任何 untracked 文件（.tools/ docs/ reports/ 等）不得未经 Da Vinci 授权加入 commit | 污染仓库 | 治理规范 |
| 15 | 已完成的修复不得重复实施，执行前须核实当前代码状态 | 破坏已稳定功能 | 治理规范 |

---

## 9. Pre-Change Checklist（修改前必须逐项确认）

> 每次开始任何代码修改前，Executor 必须逐项确认并回答。

```
## Pre-Change Checklist

任务描述：_______________
Architect / Analyst：_______________
Executor：_______________
Independent Reviewer：_______________
本次允许修改的文件白名单：_______________

1. [ ] 本次任务属于哪个系统？
       □ Report Engine (A)
       □ EarthSoul Engine (B)
       □ Member & Rewards Engine (C)
       □ Shared Infrastructure（需专项任务）

2. [ ] 本次修改涉及的文件是否全部属于该系统白名单？
       涉及文件：_______________
       如有白名单外文件 → 立即停止，拆分任务

3. [ ] 是否会修改以下高危文件？（需要 Da Vinci 明确授权）
       □ vercel.json
       □ package.json
       □ global.css
       □ api/create-checkout.js
       □ api/webhook.js
       □ api/send-report.js
       □ api/magic-link.js
       □ api/verify-token.js
       □ Stripe / Resend 配置

4. [ ] 修改前是否已读取目标文件的真实内容？
       □ 是（基于实际文件内容编写 diff）
       □ 否 → 停止，先读文件

5. [ ] 替换方案是否已确认匹配次数符合预期？
       预期匹配次数：_______________
       □ 已验证（0次或超预期立即停止）

6. [ ] 修改脚本是否有安全机制？
       □ 修改前备份或可回滚
       □ 匹配次数验证
       □ 替换后确认 diff

7. [ ] 是否在批准的非 main 分支操作？
       允许的分支：dev / test/* / feature/* / fix/* / docs/* / Da Vinci 批准的其他专项分支
       □ 是 → 继续
       □ 否，在 main → 停止，切换分支

8. [ ] 修改后验证命令是否准备好？
       验证命令：_______________
       CommonJS 文件（send-report.js、webhook.js、create-checkout.js、wx-signature.js）：node --check <文件>
       ESM 文件（generate.js、magic-link.js、verify-token.js、user.js、rewards.js、referral.js）：
         不得使用 node --check；必须使用以下之一：
         - 与项目兼容的 parser（如 acorn、@babel/parser）
         - 构建检查
         - 动态 import 检查
         - Vercel Preview 实际 API 请求验证
         不得为通过检查工具而改变文件模块类型

9. [ ] 本次修改是否在当前 Phase 范围内？
       □ Phase 1（会员闭环稳定）→ 禁止改 UX、跳转、视觉
       □ Phase 2（UX 优化）→ 需 Da Vinci 明确开启

10. [ ] 以上全部确认 → 可以开始修改
```

---

## 10. Post-Change Checklist（修改后必须逐项验证）

```
## Post-Change Checklist

1. [ ] git status → 确认工作区状态
2. [ ] git diff --name-only → 实际修改文件列表
3. [ ] git diff --stat → 修改规模是否符合预期
4. [ ] 实际修改文件是否与批准白名单完全一致？
       如有额外文件 → 立即 revert，不得提交
5. [ ] 替换次数是否符合预期（非0次，非异常多次）？
6. [ ] 语法验证：
       CommonJS 文件：node --check <文件> 通过？
       ESM 文件：记录实际使用的验证方式和结果（不得跳过，不得为通过工具改变模块类型）
       验证方式：_______________  结果：_______________
7. [ ] 相关系统独立验收清单是否通过？
8. [ ] Vercel Preview 是否正常渲染？
9. [ ] Vercel 是否新增 error logs？
10. [ ] 以上全部通过 → 可以提交 PR，等待 Da Vinci 审批合并
        未通过任意一项 → 不得 merge
```

---

## 11. 跨系统禁止清单

| 禁止操作 | 原因 |
|----------|------|
| 在报告任务中修改 member.html | 两次事故教训 |
| 在 EarthSoul 任务中修改 api/user.js 本体代码 | 曾导致积分系统崩溃 |
| 在会员任务中修改 vercel.json | 曾导致 localStorage 跨域 bug |
| 任何任务中修改 Stripe / Resend 配置 | 支付系统零容错 |
| 任何任务中 force push | 不可逆 |
| 未确认匹配次数就执行文本替换 | 替换错位，难以发现 |
| 根据截图猜测文件结构写替换脚本 | 必须读取真实文件内容 |
| 修改 rewards.js 中一组 action 时顺手改另一组 | 系统边界污染 |
| 未经授权将 untracked 文件加入 commit | 仓库污染 |
| 在非专项任务中修改 global.css / vercel.json / package.json | 共享文件保护 |
| 重复实施已完成的修复 | 破坏已稳定功能 |

---

## 12. 高危文件与明确授权机制

以下文件为高危文件，任何修改必须获得 Da Vinci 在当次对话中的明确授权：

| 高危文件 | 高危原因 |
|----------|----------|
| `vercel.json` | redirects 曾是 Magic Link bug 根因；functions 配置影响所有 API 超时 |
| `package.json` | type:module 曾导致全站 API 崩溃 |
| `global.css` | 全站标题/字体级联，改动影响所有页面 |
| `api/create-checkout.js` | 支付入口，零容错 |
| `api/webhook.js` | Stripe 支付回调，零容错 |
| `api/send-report.js` | 两段式 Claude 架构封版，轻易不动 |
| `api/magic-link.js` | 登录入口，影响所有会员功能 |
| `api/verify-token.js` | Token 验证，影响所有认证流程 |
| Supabase 数据库 schema | 结构变更影响所有系统 |
| Stripe / Resend 账户配置 | 支付/邮件零容错 |

**授权机制**：
1. Architect / Analyst 提出修改需求，明确说明修改内容和原因
2. Da Vinci 在当次对话中明确书面批准
3. Executor 执行前再次确认文件白名单
4. 执行后立即完成 Post-Change Checklist

---

## 13. Git / Branch / Preview / PR / Production 工作流

### 13.1 分支结构

```
main         → Vercel 生产环境自动部署（movingcost.ai）
dev          → 日常开发分支
test/*       → 单项 bug 修复验证分支（如 test/magic-link-fix）
feature/*    → 新功能分支
fix/*        → 专项修复分支
docs/*       → 文档专项分支
```

Da Vinci 可批准其他专项分支名称，批准时明确记录。

### 13.2 三种合法执行路径

未经 Da Vinci 的 `Explicit Exception` 或 `Emergency Override`，禁止直接修改或 push main。
Claude、Cursor、Da Vinci、其他 AI 或人类均可在当次被指定为 Executor，适用以下任意一种合法路径。

---

#### Path 1 — Standard Branch / PR Path（标准路径，优先采用）

```
1. 在批准的非 main 分支操作（dev / test/* / feature/* / fix/* / docs/*）
2. 完成 Pre-Change Checklist
3. 执行修改（Executor）
4. 完成 Post-Change Checklist
5. git add <白名单文件列表>（禁止 git add .）
6. git commit -m "类型: 描述"
7. git push origin <分支名>
8. GitHub 创建 PR → Independent Reviewer 审查 diff
9. Vercel Preview 链接验收
10. Da Vinci 批准后 merge main（Release Approver）
11. Vercel 自动部署，生产验收
```

---

#### Path 2 — Authorized Terminal Execution Path（授权终端直执行路径）

适用条件：Da Vinci 在当次对话中明确授权 Executor 直接在终端执行（含 Da Vinci 自己执行 AI 提供的命令）。

```
前置要求：
  - Da Vinci 明确书面授权，记录文件白名单
  - 完成 Pre-Change Checklist

执行：
  - Executor 执行已批准命令（可以是 Da Vinci 在终端执行 AI 提供的命令）
  - 修改仍限定在批准的非 main 分支

完成后：
  - 完成 Post-Change Checklist
  - 必须走 PR 流程，经 Da Vinci 最终审批合并 main
```

---

#### Path 3 — Emergency Production Override（紧急生产覆盖）

适用条件：生产环境严重故障，等待 PR 流程会造成重大损失，Da Vinci 判断必须立即处理。

```
执行前必须记录（由 Da Vinci 授权时明确）：
  - 文件白名单
  - 紧急原因
  - 已知风险
  - 回滚点（可回滚的 commit 或备份状态）

执行：
  - Da Vinci 发出 Emergency Override 授权
  - Executor 执行最小范围修改

事后必须完成（不得省略）：
  - 补 commit（如直接修改了 main，立即补记录）
  - diff 审查（Independent Reviewer 或 Da Vinci 确认实际修改范围）
  - 在本文档 Changelog 或专项记录中记录此次 Override
```

---

### 13.3 绝对禁止

```
× 未经 Path 1/2/3 之一，直接修改或 push main
× git push --force（任何分支）
× git add .（可能加入非白名单文件）
× 未经 Da Vinci 审批直接 merge main
× 未通过 Post-Change Checklist 提交 PR
× 未经 Da Vinci 确认的 untracked 文件加入 commit
```

### 13.4 Commit Message 规范

```
类型前缀：
  feat:     新功能
  fix:      bug 修复
  docs:     文档更新
  style:    样式调整（无逻辑变化）
  refactor: 重构（无功能变化）
  chore:    构建、依赖、配置

示例：
  fix(member): bind-email API returns user_id for localStorage update
  feat(earthsoul): add downloaded_card reward action
  docs: merge project boundaries into governance v2
```

---

## 14. Phase 与封版管理

| Phase | 状态 | 内容范围 |
|-------|------|----------|
| Phase 1 | 🔄 进行中 | 会员闭环稳定：bind-email → mc_user_id 写入 → Dashboard 正常显示 |
| Phase 2 | ⏸ 待开启 | UX 优化：Save My Points 成功提示、自动跳转 welcome、Welcome Email 文案、无 session 时 member 提示 |

**Phase 规则**：
- Phase 1 期间：禁止改 UX、跳转逻辑、视觉样式（除非是 bug 修复）
- Phase 2 开启条件：Phase 1 全部验收清单通过，Da Vinci 明确宣布开启
- 封版规则：每个 Phase 完成后打 git tag，记录封版 commit

当前封版状态详见 Appendix A。

---

## 15. 数据库、localStorage 和 event_type 权限

### 15.1 数据库表权限总览

| 表 | Report Engine | EarthSoul Engine | Member Engine |
|----|---------------|------------------|---------------|
| `users` | 只读（email） | 读 + 明确批准的有限写（匿名用户创建、points_balance 重算） | 主要管理权 + 完整字段读写 |
| `magic_tokens` | 禁止 | 禁止 | 全字段读写 |
| `reward_events` | 写入（purchase_completed） | 写入（quiz/share/download） | 写入（email/referral/admin） |

### 15.2 API action 与 event_type 映射

| API action 参数（连字符格式） | 数据库 event_type（下划线格式） | 归属系统 |
|-------------------------------|----------------------------------|----------|
| `quiz-completed` | `quiz_completed` | EarthSoul |
| `shared-result` | `shared_result` | EarthSoul |
| `downloaded-card` | `downloaded_card` | EarthSoul |
| `email-submitted` | `email_submitted` | Member |
| `admin-adjust` | `admin_adjustment` | Member |
| （webhook 直接写入） | `purchase_completed` | Report |
| （referral 系统写入） | `friend_completed_quiz` | Member |
| （referral 系统写入） | `friend_submitted_email` | Member |
| （referral 系统写入） | `friend_purchase_completed` | Member |

### 15.3 localStorage 键名与系统归属

| 键名 | 归属系统 | 说明 |
|------|----------|------|
| `mc_user_id` | Member Engine | 用户 UUID 主键（认证前为前端生成的匿名 UUID，bind-email 后替换为真实 user_id） |
| `mc_email` | Member Engine | 用户邮箱 |
| `mc_referral_code` | Member Engine | 用户推荐码 |
| `mc_referred_by` | Member Engine | 推荐来源码 |
| `movingData` | Report Engine | 表单数据（其他系统禁止读写） |
| `movingReport` | Report Engine | 预览报告（其他系统禁止读写） |

**禁止**：Report Engine 读写 `mc_*` 键；Member Engine 读写 `movingData` / `movingReport`

---

## 16. 品牌、导航、Logo 和设计规范

### 16.1 品牌色

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

### 16.2 字体

- 标题（h1-h3 等）：**Playfair Display**（衬线，来自 global.css）
- 正文：**DM Sans** / **Inter**（无衬线，body 继承）
- 数字/功能标题：**Outfit**（部分页面局部使用）
- 来源：Google Fonts

### 16.3 导航类型

| 类型 | 适用页面 |
|------|----------|
| `nav-full` | 首页（index.html）、博客 index |
| `nav-article` | 博客文章页 |
| `nav-minimal` | 功能页（planner / thank-you 等） |

### 16.4 Logo 规则

- 浅色背景导航：`logo-light-transparent.png`
- 深色背景 / 页脚 / EarthSoul：`logo-dark-transparent.png`

### 16.5 Sign In 导航样式规范（已全站统一，2026-06-06）

- 标准样式：灰色细体，悬停变蓝，无背景色、无边框
- 修复方法：`:not(.is-member)` 透明样式 + `mobile-signin-link` 内联样式
- 博客全部 7 个文件已统一完成

### 16.6 博客基准文件

- **基准文件**：`city-personality-vs-your-personality.html`
- 所有新博客文章的导航 / CSS / 页脚必须以此为准
- 旧基准 `8-city-soul-types.html` 已废弃，不再参考

### 16.7 版权文本（标准格式）

```
© 2026 MovingCOST.ai. All rights reserved.
MovingCOST.ai™, City Soul™, EarthSoul™, and MovingCOST Points™ are brand assets of Classic Spread Inc.
```

---

## 17. 技术栈与模块类型

### 17.1 技术栈速查

| 层 | 技术 |
|----|------|
| 前端 | 纯 HTML/CSS/JS（无框架） |
| 部署 | GitHub main → Vercel 自动部署 |
| 数据库 | Supabase（项目：movingcost-rewards） |
| AI | Anthropic Claude claude-sonnet-4-6（两段式生成） |
| 支付 | Stripe（/api/create-checkout 为主，Payment Link 为降级） |
| 邮件 | Resend（reports@movingcost.ai / support@movingcost.ai） |

**环境变量**：
```
CLAUDE_API_KEY            # Anthropic Claude API
RESEND_API_KEY            # Resend 邮件服务
STRIPE_SECRET_KEY         # Stripe 收款密钥
STRIPE_WEBHOOK_SECRET     # Stripe Webhook 验证密钥
SUPABASE_URL              # Supabase 项目地址
SUPABASE_SERVICE_ROLE_KEY # Supabase 服务密钥
WX_APP_ID                 # 微信公众号/小程序 App ID（用于 wx-signature.js 签名）
WX_APP_SECRET             # 微信 App Secret（用于获取 access_token，不得记录真实值）
```

### 17.2 API 模块类型

| 模块类型 | 文件 | 验证方式 |
|----------|------|----------|
| CommonJS（require） | `send-report.js`、`webhook.js`、`create-checkout.js`、`wx-signature.js` | `node --check <文件>` |
| ESM（import/export） | `generate.js`、`magic-link.js`、`verify-token.js`、`user.js`、`rewards.js`、`referral.js` | 不得用 node --check；使用 parser、构建检查、动态 import 检查或 Vercel Preview 实际 API 请求验证 |

**铁律**：`package.json` 不得含 `"type":"module"`，否则 CommonJS 模块全部崩溃。

---

## 18. 文档自身的修订、版本和 Changelog 机制

### 18.1 修订规则

任何对本文档的修改必须：
1. 列出原规则
2. 列出新规则
3. 说明修改原因
4. 提供事实或事故依据
5. 说明风险变化
6. 获得 Da Vinci 审批
7. 更新版本号和日期
8. 在 Changelog 中记录

**禁止静默删除或以"重新整理"为名遗漏旧规则。**

### 18.2 版本号规则

- 重大结构变更：v2.0 → v3.0
- 内容增补（新增系统状态、新增规则）：v2.0 → v2.1
- 文字修正：v2.0 → v2.0.1

### 18.3 Changelog

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-19 | 初版（Cursor 本地创建，未推送仓库）。包含三系统边界、Pre-Change Checklist、跨系统禁止清单、Git 工作流、Phase 说明 |
| v2.0-draft | 2026-06-21 | 推送仓库的第一版（commit bf2b1f7）。包含最新系统状态、两段式架构、数据库修复事实、设计规范、待办优先级。注：v1.0 执行细则在此版中未完整保留 |
| v2.0-rc1 | 2026-06-21 | Review Candidate，未正式生效。以 v1.0 治理细则为骨架，以 v2.0-draft 最新事实为增量，完整融合18个章节 + Appendix A。新增：Post-Change Checklist、当次任务角色分工（5角色）、Executor 权限边界、例外机制（Explicit Exception / Emergency Override / Amendment）、Git 三路径、支付链路说明、API action 映射表、global.css 真实边界、CommonJS/ESM 分离验证规则、users 表权限矛盾修复、WX_APP_ID/WX_APP_SECRET 环境变量、Future Governance Improvements。 |
| v2.0 | 2026-06-21 | **Effective.** Da Vinci 批准，Explicit Exception 授权直接替换 main。commit: `docs: adopt MovingCOST project constitution v2.0`。Approved by: Da Vinci / CLASSIC SPREAD INC。本文档正式生效，成为项目唯一权威治理文件。 |

### 18.4 已解决确认项

| # | 问题 | 结论 |
|---|------|------|
| 1 | 报告章节数 | Section 0（固定免责声明）+ Section 1-10，对外标称"10 Sections"。0619版"12章节"为早期遗留，从未实现 |
| 2 | wx-signature.js 归属 | 归入 Shared Infrastructure，调用页面详见 Appendix A |
| 3 | EarthSoul 对 users 表权限 | 读 + 有限写（create 匿名用户 + recalculate points_balance），非纯只读 |
| 4 | 支付主链路 | /api/create-checkout 为主，Payment Link 为 catch 降级 fallback |

---

## Appendix A — Current Architecture Snapshot

> 本附录记录当前仓库的事实状态，与长期治理规则分离。
> 最后核实日期：2026-06-21（经代码搜索和 commit 历史确认）
> 今后以最新代码搜索结果为准，本附录需定期更新。

### A.1 Report Engine 封版状态

- **封版 commit**：`9fa9609`
- 两段式 Claude 调用：
  - Part 1：Section 0-5（固定免责声明 + Section 1-5），max_tokens 10000
  - Part 2：Section 6-10，max_tokens 10000
- maxDuration：800秒（vercel.json functions 块，仅限 send-report.js）
- Stripe Payment Link（降级用）：`https://buy.stripe.com/aFa6oG51x1KUgXT0C2cfK00`
- Resend 发件地址：reports@movingcost.ai

### A.2 Member & Rewards Engine 当前状态

- **bind-email 修复**：commit `1e8d70c` 已完成
  - `api/user.js` 的 bind-email action 返回 `user_id`
  - `earthsoul.html` 回调将返回的真实 user_id 写入 localStorage `mc_user_id`
  - **生产验收状态**：代码修复已完成，待 Da Vinci 最终确认
- **数据库修复（Phase 1）**：已完成
  - `uq_email_submitted` 唯一约束已从 `metadata->>'email'` 修正为 `user_id`
  - 重复积分记录已清理
  - `api/user.js` 代码层去重逻辑已更新
- **redirects bug 修复**：commit `1b569a2`
  - `vercel.json` 的 `redirects` 块已删除，localStorage 跨域问题已修复

### A.3 Phase 状态

| Phase | 状态 | 说明 |
|-------|------|------|
| Phase 1 | 🔄 进行中 | 代码修复已完成（1e8d70c），生产验收待 Da Vinci 确认 |
| Phase 2 | ⏸ 待开启 | Phase 1 验收通过后，Da Vinci 宣布开启 |

### A.4 wx-signature.js 当前调用页面

经当前仓库代码搜索确认（2026-06-21）：

**已调用**：`index.html`、`planner.html`、`thank-you.html`、`contact.html`、`privacy.html`、`terms.html`

**未调用**：`earthsoul.html`、`blog/**`

今后以最新代码搜索结果为准。

### A.5 当前待办（优先级顺序）

| 优先级 | 任务 | 状态 |
|--------|------|------|
| P0 | Phase 1 生产验收（Magic Link 端到端测试） | 待 Da Vinci 确认 |
| P1 | 报告视觉效果优化 | 待开始 |
| P2 | 重发机制设计（7天内 1-2 次） | 待设计 |
| P3 | 付款后自动绑定会员 + 积分方案 | 待设计 |
| P4 | 博客内容持续发布（City Soul Journal） | 进行中 |
| P5 | 会员订阅（Plus/Pro/Annual） | Coming Soon |

---

### Appendix B — Future Governance Improvements（v2.1 候选）

以下为本轮未重构、留待 v2.1 正式修订的治理改进事项：

#### B.1 Public Web & Growth Layer（内容与增长域）

当前 `首页（index.html）`、`公共页（about/contact/privacy/terms/services）`、`Blog`、`SEO`、`OG 标签`、`GA4`、`Google Search Console` 均归入 Shared Infrastructure 统一管理。

**候选改进**：将上述内容从 Shared Infrastructure 中独立，建立 **Public Web & Growth Layer** 业务域，专门管理：
- 内容发布、SEO 优化、OG/社交分享元数据
- 博客文章新增与更新
- GA4 事件追踪配置
- Google Search Console 管理

**改进理由**：内容与增长工作频率高、风险低，独立业务域可减少对 Shared Infrastructure 专项审批的依赖。

**生效条件**：Da Vinci 在 v2.1 修订中明确批准，在此之前维持现有 Shared Infrastructure 归属。

---

*本文档为 MovingCOST.ai 项目唯一权威治理文件。*
*版本 v2.0 | Status: Effective | Effective Date: 2026-06-21*
*Approved by: Da Vinci / CLASSIC SPREAD INC*
*本文档为 MovingCOST.ai 项目唯一权威治理文件。*
