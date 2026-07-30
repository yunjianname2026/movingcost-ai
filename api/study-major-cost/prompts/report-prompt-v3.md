# Study, Major & Cost Planner — Report Generation Prompt v3 — Prototype

> `prompt_version: report-prompt-v3` · `schema_version: v3` · `rules_version: rules_v3_prototype_deterministic`

> 本提示词与 `study-major-cost-system-prompt.md`（角色与原则）配合使用，专门规定"具体怎么写每一个字段"。

## 篇幅要求（硬性）

- 完整中文示例报告目标总字数：**约2,500–3,500中文字符**（不含 JSON 结构本身，指渲染成中文报告正文后的字数）
- `decision_summary.summary_text`：**约300–450中文字符**，必须能在一屏内读完，不得需要向下滚动才能看到结论
- 禁止输出"很长但没有明确判断"的内容——字数达标但缺乏判断等同于失败

## v2 新增写作硬性要求

### 成本数字必须逐项可验算
- `cost_outlook` 中的每一个金额都必须能在 `study-major-cost-rules.md`（当前生效版本 `rules_v3_prototype_deterministic`）的固定点值表中找到对应行，并能用 `study-major-cost-calculation-trace.md` 的公式（对应rules.md第11节）重新算出。禁止使用"约""大概""区间"这类模糊表述描述 essential/standard/comfortable 三档年度总额本身——**这三个值现在都是单一确定数字**。允许对"全周期总额""预算缺口"做区间化的文字解读，但不能编造缺口的精确数字。

### 市场/趋势类表述
- 任何涉及"需求""认可度""增长""机会多寡"的表述，写法必须是"本工具将该方向归类为……"或"根据本工具的原型分类……"，不得写成"该领域需求正在增长""这类城市机会更多"这种既成事实句式。

### 毕业后去向：偏好 ≠ 可行性
- `mobility_outlook.preferred_post_graduation_direction` 只写用户的意愿本身（"用户希望留在留学国工作"）
- `mobility_outlook.planning_scenario` 写"如果用户按当前偏好规划，会呈现的情景"，用条件句
- `feasibility_confidence` 和 `work_authorization_assumption` 必须原样使用 schema 给定的固定文案，不得改写、不得暗示"大概率能拿到工作签证"之类的可行性判断

### 财务回报（ROI）
- `education_value.financial_roi_assessed` 固定为 `false`
- `overall_assessment` 禁止出现"回报更高""更值得投资""确定性更强"这类比较财务回报的表述，只能比较个人适配度、完成风险、预算可持续性、转换风险、长期灵活性

## 分字段写作指令

### decision_summary（决策摘要）
- 这是用户最先看到、可能唯一会认真读完的部分，必须包含明确结论，不能只是"总结一下你的情况"
- `study_destination` / `preferred_career_destination` / `long_term_destination` 三个字段**必须都填**，即使三者相同也要明确说"预计三者一致"，不同则要点出差异和原因；`preferred_career_destination` 只写用户偏好本身，不做可行性判断

### student_profile（学生画像）
- `family_student_tension` 字段是硬性要求，必须写出一句具体的矛盾（例如"家长希望稳妥的CS路径，但学生的编程接受度和兴趣都指向内容与商业方向"），不能写成"暂无明显矛盾"这种回避性表述——如果输入数据中确实矛盾很弱，也要写出"当前矛盾集中在XX，而非专业选择本身"这类具体表述

### recommended_paths（三条专业路径）
- 三条必须有清晰的**推荐顺序**，不能三条都写"非常适合"
- `best_match`：最贴合学生当下已表现出的优势和接受度
- `ai_augmented_combo`：一个"主专业+第二技能"的组合型方向，体现 AI 时代分析
- `safe_alternative`：进入门槛更低、或更贴合家庭稳定诉求的备选，但也要诚实写出它的局限
- 每条路径的 `why_not_perfect` 字段不能省略或写敷衍话

### caution_areas（谨慎方向）
- 至少写1条，最多2条
- 不能说"绝对不能学"，必须说明"不匹配在哪里""如果坚持需要满足什么条件"

### school_city_strategy
- 明确回答：学习城市和未来就业城市是否可能不同
- 明确回答：是否值得为更高排名支付明显额外成本（`worth_paying_ranking_premium` 用 yes/conditional/no，正文里要给出条件）
- 第一阶段不虚构具体学校名称的排名或录取结论——可以谈"学校类型"，不能编造"某某大学排名第几"

### cost_outlook（完整成本分析）
- 所有数字必须能对应回 `study-major-cost-rules.md v3` 的系数表，写作时不得脱离 rules 文件自行调整数字
- 三个情景（essential/standard/comfortable）都要给出；**v3变更：住宿费不随三档变化**（只由`housing_type`决定），三档差异体现在饮食、个人支出、汽车附加（按car_need规则）、旅行等线项，写作时不要再说"essential情景靠合租压低住宿"这类表述（合租与否是`housing_type`的选择，不是essential/standard/comfortable三档的差异）
- 必须区分Year1（含一次性签证/置装/抵达安顿费）、中间年（仅经常性成本）、最后一年（经常性+毕业搬迁准备金），不得把一次性成本写成每年都发生
- 如果`transfer_intent`涉及转专业，必须把延长成本作为独立的"压力测试情景"呈现（"如果转专业导致额外增加一学年，压力测试成本约为……"），不得说成"已经计入总额"或暗示这是确定会发生的
- `family_budget_gap` 用文字描述区间关系，不能编造精确缺口金额（例如可以说"家庭预算区间大致覆盖Standard情景的中下段，Comfortable情景存在明显缺口"，不能说"缺口精确为$4,320"）

### education_value
- 综合个人适配、成本、专业前景、AI影响、毕业就业、目标城市生活成本、未来再次迁移、是否值得读更高学位
- 避免"保证回报"类表述，用"在当前假设下……""如果……条件成立……"这类条件句

### mobility_outlook（本产品核心差异化模块，不可写得敷衍）
- `study_destination_fit`：为什么这个学习地适合/不适合
- `preferred_post_graduation_direction`：只写用户的偏好/规划表达（"用户希望/计划……"），不得写成"大概率会去哪类城市工作"这种可行性预测语气
- `city_transition_risk`：这次潜在的"二次迁移"风险有多大，风险点具体是什么（签证窗口、行业集中度、社交网络重建成本等）
- `relocation_cost_considerations`：如果确实要二次迁移，大致会涉及哪些成本类型（不需要精确数字，可以引用 rules 层的 `graduation_relocation_reserve` 概念，注意v3已限定为仅最后一年计入）
- `long_term_location_flexibility`：从长期看，这个学生/家庭的选择路径给未来留下了多少灵活性

### action_plan（12个月行动计划）
- 每个时间段2-4条，必须具体可执行，禁止"多做研究""保持开放心态"这类无法执行的表述
- 参考任务书示例："完成一个专业体验项目""比较三类课程设置""与在读学生访谈""学习一个基础AI或数据工具""验证自己是否真的接受核心课程"

### advisor_conclusion
- `preferred_option` 和 `alternative_option` 必须是具体方向，不是"综合考虑后建议深思熟虑"这类空话
- `currently_not_recommended` 要具体点名一个当前不建议做的决定（不是泛泛而谈风险）
- `reassess_if` 给出触发重新评估的具体条件变化（例如"如果奖学金申请失败""如果转专业获批"）

### assumptions（假设清单）
- 逐条列出本次报告在数据不足或规则未覆盖时做的假设，每条都要具体，不能只写"部分数据为估算"

### disclaimer
- 使用 `study-major-cost-schema.json` 中给出的固定文案，不做改写

## 需要避免的失败模式（复查清单，生成后自检）

- [ ] 是否有任何专业被描述为"非常适合"却没有给出对应的 `why_not_perfect`？
- [ ] 是否有任何金额没有出现在 rules.md 的系数表里？
- [ ] 是否有任何百分比/分数是自己编的，而不是"low/moderate/high"这类方向性表述？
- [ ] `family_student_tension` 是否具体，还是变成了"暂无明显矛盾"？
- [ ] `mobility_outlook` 三个目的地字段是否都填写，是否体现了"可能不同"？
- [ ] 全文字数是否落在2,500–3,500中文字符区间？决策摘要是否落在300–450区间？
- [ ] 是否出现了"保证""确保""一定能"这类承诺性用词？
- [ ] 是否有任何essential/standard/comfortable金额没有严格对应rules.md（当前生效版本rules_v3_prototype_deterministic）固定点值表？
- [ ] 是否有"需求增长""认可度上升""机会更多"这类未标注为"原型分类"的既成事实句式？
- [ ] `preferred_post_graduation_direction` 和 `feasibility_confidence` 是否被混为一谈，写成了"大概率能留下"这类可行性断言？
- [ ] `education_value.overall_assessment` 是否出现了跨专业的财务回报比较？
- [ ] 是否暗示对美国以外国家有同等准确的支持？
