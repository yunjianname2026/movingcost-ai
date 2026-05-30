# MovingCOST.ai 项目工作记录

## ✅ 已完成
- 产品核心链路打通（填表→AI预览→付款→报告→邮件）
- dev/main 分支工作流建立
- 全站玻璃卡片视觉升级
- 移动端汉堡菜单
- favicon + og:image 品牌资产
- 数据传递修复（Stripe Checkout Session + Cookie三层保险）
- 报告截断修复（max_tokens 16000）
- 报告质量升级（13条规则 + AIMA + D7 €920/月 + IFICI）
- About 页面上线
- Blog 列表页上线
- 第一篇SEO文章上线（NYC→Lisbon）
- 封面图上传（nyc-to-lisbon-cover.jpg）
- 全站导航统一（8个栏目）
- 全站Footer统一
- 首页示例 NYC→Dubai 改为 NYC→Lisbon
- Google Search Console 验证完成
- Sitemap 提交完成
- sitemap.xml 上传

## 🔄 进行中
- 文章页社交分享404问题排查（微信/Facebook）

## 📋 待办（近期）
- Bing Webmaster Tools 提交
- 第二篇SEO文章（Best Cities for Digital Nomads 2026）
- 第三篇SEO文章
- Privacy Policy 页面
- Terms of Service 页面
- 订阅计划设计（$9.9/月早鸟 → $19.9/月）

## 📋 待办（中期）
- Google Search Console 数据监控（1周后查看）
- 社交媒体账号注册（X/LinkedIn/YouTube/TikTok/小红书）
- 多语言架构（第一阶段西班牙文 /es/）
- Cities 页面内容填充
- Routes 页面内容填充

## 🗝️ 项目关键信息
- 网站：www.movingcost.ai
- 仓库：github.com/yunjianname2026/movingcost-ai
- 分支：dev（测试）→ main（生产）
- 部署：Vercel（okayus团队）
- 域名：GoDaddy
- 技术栈：纯HTML + Vercel Serverless + Claude API + Stripe + Resend
- AI模型：claude-sonnet-4-20250514
- 支付：Stripe Checkout Session（$9.90）
- 邮件：Resend（reports@movingcost.ai）
- 客服：support@movingcost.ai
- 设计：Outfit标题 + DM Sans正文 + 玻璃卡片风格

## 📁 重要文件路径
- 首页：/index.html
- AI表单：/planner.html
- 付款成功：/thank-you.html
- 关于：/about.html
- Blog列表：/blog/index.html
- 第一篇文章：/blog/nyc-to-lisbon.html
- 封面图：/blog/nyc-to-lisbon-cover.jpg
- API-生成预览：/api/generate.js
- API-发送报告：/api/send-report.js
- API-创建付款：/api/create-checkout.js
- Webhook：/api/webhook.js
- 站点地图：/sitemap.xml
## 2026-05-29 完成 ✅
- [x] earthsoul.html 品牌统一（rename from quiz.html）
- [x] Magic Link 流程跑通
- [x] verify.html 写入 mc_email + userEmail

## 待办
- [ ] 测试导航栏"My Dashboard"是否正常显示
- [ ] Welcome Email（新用户绑定邮箱时发送）
- [ ] CHANGELOG.md 推送到GitHub
