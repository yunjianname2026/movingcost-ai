# Study, Major & Cost Planner — 问卷题库矩阵

设计目标（本轮已确认，替代此前"24-28目标/30绝对上限"的表述）：**标准路径最多30题，最长条件分支路径最多31题，目标完成时间6–8分钟**。不为了把每条分支都压到某个题量以下而删除有实际价值的问题（例如住宿类型、用车需求、在读年级、转专业意向）。

> **Approved questionnaire length (engineering handoff):** standard path maximum **30** questions; longest conditional path maximum **31** questions; target completion time **6–8 minutes**.

本矩阵是问卷 UI 开发前的唯一依据；UI 阶段不得再自行增删题目，如需调整须先回到本文件修改。

列说明：
- **Branch condition**：为空表示所有人都看到；非空表示只有满足条件才会看到该题。
- **Analysis impact**：只能是以下六类之一或多类：`major_fit` / `ai_era` / `school_city` / `cost` / `mobility` / `action_plan`（另有 `tone_only` 表示仅影响报告措辞、不进入评分或成本计算）。
- 所有金额类题目的选项均为**区间**，不允许用户输入精确数字，避免报告里出现"假精确"。

## Step 1 · Your Study Stage 你的学习阶段（4题，全部必答）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q01 | 1 | 你现在处于哪个阶段？ | Your Study Stage | 单选 | 是 | — | 无 | `current_stage`: high_school / college_current / graduated / grad_current / working_professional | major_fit, mobility, tone_only |
| Q02 | 1 | 你计划申请的层次是？（本阶段仅本科可选，其余标注"即将支持"且不可选中） | Target Degree (MVP: bachelor only) | 单选 | 是 | — | 无 | `target_degree`: bachelor（唯一可选值）/ master、phd、short_program 显示为置灰的"即将支持"选项，选中无效 | cost, major_fit |
| Q03 | 1 | 你计划的入学时间是？ | Planned Intake | 单选 | 是 | — | 无 | `planned_intake`: within_6mo / 6to12mo / 1to2yr / undecided | action_plan |
| Q04 | 1 | 你目前的申请/Offer状态是？ | Offer Status | 单选 | 是 | — | 无 | `offer_status`: has_offer / applied_waiting / not_applied / just_exploring | **仅控制 Q19 是否出现（Q11为独立的可选开放题，不受Q04影响）** |

## Step 2 · Academic Profile 学术基础（5题必答 + 1题仅对在读学生出现）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q05 | 2 | 你的成绩区间大致是？（标签随Q01变化：高中生显示GPA/年级排名区间，大学生显示大学GPA区间） | Academic Range | 单选 | 是 | — | 无 | `academic_range`: top / above_average / average / below_average / unsure | major_fit |
| Q06 | 2 | 你比较擅长的科目是？ | Strong Subjects | 多选 | 是 | 3 | 无 | `strong_subjects[]`: math / science / language_writing / art_design / social_science / business_econ / computer | major_fit, ai_era |
| Q07 | 2 | 你的英语能力自评是？ | English Level | 单选 | 是 | — | 无 | `english_level`: fluent / proficient / intermediate / basic | school_city |
| Q08 | 2 | 以下哪些内容你比较能接受？（可都选，也可都不选） | Math & Programming Acceptance | 多选 | 是 | 2 | 无 | `tech_acceptance[]`: math / programming / none | ai_era, major_fit |

> **Q08 互斥校验规则（新增）**：`none` 与 `math`/`programming` 互斥。UI行为：若用户已选 `math` 或 `programming` 后点击 `none`，自动取消 `math`/`programming` 的选中状态，只保留 `none`；反之若用户已选 `none` 后点击 `math` 或 `programming`，自动取消 `none`。前端与后端提交校验都必须执行此规则，不允许 `tech_acceptance` 数组中同时出现 `none` 与其他值。
| Q09 | 2 | 你能接受高强度课程或较长的培养周期吗？ | Rigor Acceptance | 单选 | 是 | — | 无 | `rigor_acceptance`: fully_accept / partially / prefer_efficient | major_fit, cost |
| Q09b | 2 | 你目前的专业是什么？是否在考虑转专业？你现在读到第几年？ | Current Major, Transfer Intent & Program Year | 简答+单选+单选 | 是（仅本条件下出现） | — | `current_stage ∈ {college_current, grad_current}` | `current_major`(text), `transfer_intent`: considering / not_considering / already_decided；`program_year`: 1/2/3/4+（用于成本公式判断是否计入毕业/搬迁准备金，见rules.md v3第7.3节；同时决定`planning_period_type=remaining_program`与`planning_start_year`，见rules.md v3第16.1节） | major_fit, cost, action_plan |

> **`program_year` 取值补充说明**：非在读学生（`current_stage` 为 high_school / graduated / working_professional）默认 `program_year = 1`（尚未入学，从第一年开始计算），不单独提问。

## Step 3 · Interests & Strengths 兴趣与优势（1题必答 + 1题可选，均不阻断进度）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q10 | 3 | 以下哪些最能代表你的兴趣与优势？ | Interests & Strengths | 多选 | 是 | 5 | 无 | `interest_strengths[]`：data_analysis / problem_solving / programming_tech / business_sales / writing_expression / design_creative / science_research / communication / organization_mgmt / helping_others / hands_on / content_creation | major_fit, ai_era |
| Q11 | 3 | 别人通常认为你最擅长什么？（一句话即可，不必长篇） | One-liner Strength | 简答 | **否（可跳过，不阻断进度）** | — | 无 | `strength_one_liner`(text, 可为空) | tone_only |

## Step 4 · Career Preferences 职业发展偏好（3题必答）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q12 | 4 | 你更看重职业发展中的哪些方面？ | Career Values | 多选 | 是 | 3 | 无 | `career_values[]`：high_income / stability / creativity / social_impact / work_life_balance / global_mobility / entrepreneurship / remote_work / big_company / professional_status / fast_growth | major_fit, mobility |
| Q13 | 4 | 你更偏向哪种类型的工作？ | Domain Preference | 单选 | 是 | — | 无 | `domain_preference`: technical / business / creative / research / service / management | major_fit |
| Q14 | 4 | 你对风险的接受程度是？ | Risk Acceptance | 单选 | 是 | — | 无 | `risk_acceptance`: high / medium / low | major_fit, action_plan |

## Step 5 · Country, School & City 目标国家、学校与城市（4题必答 + 1题按分支出现）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q15 | 5 | 你的目标国家是？（v1原型阶段仅支持美国，其他国家仅作为路线图展示） | Target Country (US-only MVP) | 单选 | 是 | — | 无 | `target_country`: US（固定值）/ `other_future`（选择后提示"其他国家分析暂未开放，敬请期待"，不生成具体成本与学校城市分析） | school_city, cost |
| Q16 | 5 | 你更偏好哪种城市类型？ | Target City Type | 单选 | 是 | — | 无 | `target_city_type`: metro / mid_size / small_town | school_city, mobility |
| Q17 | 5 | 请把以下六项按你的重视程度排序（选前3即可）：排名 / 专业 / 就业 / 成本 / 城市 / 校园体验 | Priority Ranking | 排序（取前3） | 是 | — | 无 | `priority_top3[]`(有序数组，取值来自 ranking/major/employment/cost/city/campus_life) | school_city, cost, mobility（"是否愿意用排名换性价比"由此题结果推导，不再单独提问） |
| Q18 | 5 | 你更偏好哪种学校规模/类型？ | School Type Preference | 单选 | 是 | — | 无 | `school_type_pref`: large_research / small_teaching / no_preference | school_city |
| Q19 | 5 | (a) 已拿到Offer：请简要写下你拿到offer的学校与专业；(b) 未拿到Offer：如果已经考虑了具体学校或专业，可以简单写一下（非必填） | Offer / Considered School & Major | 简答 | **(a)是 / (b)否，视 Q04 而定** | — | `offer_status`: (a)显示于 has_offer；(b)显示于 applied_waiting / not_applied；`just_exploring` 时整题隐藏 | `offer_or_considered_school_major`(text, 可为空) | school_city, tone_only |
| Q19b | 5 | 你对目标学校的学费定位怎么预期？ | Tuition Position | 单选 | 是 | — | 无 | `tuition_position`: lower_band / middle_band / upper_band / unsure（选unsure时系统按middle_band计算并在报告assumptions中注明） | **cost（成本计算的关键必需输入，见rules.md v3第6节）** |

## Step 6 · Family Budget & Lifestyle 家庭预算与生活方式（4题必答）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q20 | 6 | 你们家庭预计的年度总预算区间是？（美元） | Annual Budget Range | 单选（区间） | 是 | — | 无 | `annual_budget_range`: lt_30k / 30_45k / 45_60k / 60_80k / gt_80k | cost |
| Q21 | 6 | 这笔预算主要如何构成？ | Family Finance Structure | 单选 | 是 | — | 无 | `finance_structure`: family_full / family_plus_scholarship / mainly_scholarship / needs_loan | cost, mobility |
| Q22a | 6 | 你更偏好哪种住宿类型？ | Housing Type | 单选 | 是 | — | 无 | `housing_type`: campus_or_shared（校内宿舍/合租）/ shared_off_campus（校外合租）/ private_studio_or_1br（独立公寓/一居室） | cost |
| Q22b | 6 | 你日常是否需要用车？ | Car Need | 单选 | 是 | — | 无 | `car_need`: no_car（不需要）/ may_need_car（可能需要）/ definitely_need_car（肯定需要） | cost |

> **v4修订说明**：Q22原本是一道把住宿类型与用车需求捆绑成5选1的复合题，现拆分为 Q22a、Q22b 两道独立的轻量单选题，用户可以自由组合而不被限制在预设的5种搭配内。这一变更使核心题量从29题增加到30题（在读学生分支则从30题增加到31题，**超出此前设定的"绝对上限30题"**——已如实记录在下方汇总，需在下一轮决定是否需要精简其他题目以保持在30题以内，或调整绝对上限）。
>
> 住宿费仅由 `城市层级 × housing_type` 决定（不随Essential/Standard/Comfortable三档变化）；汽车附加仅在 `car_need=definitely_need_car` 时三档都计入，`may_need_car` 仅在Comfortable情景计入，`no_car` 任何情景都不计入。见 `study-major-cost-rules.md` 第1-2节。
| Q23 | 6 | 家庭最担心哪些成本项？ | Biggest Cost Worry | 多选 | 是 | 2 | 无 | `cost_worry[]`：tuition / housing / healthcare / transport / emergency / international_travel | cost, action_plan |

## Step 7 · Future Mobility & Life Plan 毕业后的迁移与人生计划（5题必答，本产品差异化核心）

| ID | Step | 中文问题 | 英文术语 | 类型 | 必答 | 最多选 | 分支条件 | 存储值 | Analysis impact |
|---|---|---|---|---|---|---|---|---|---|
| Q24 | 7 | 毕业后你的初步打算是？ | Post-Graduation Direction | 单选 | 是 | — | 无 | `post_grad_direction`: stay_study_country / return_home / third_country / undecided | mobility |
| Q25 | 7 | 如果毕业后要换城市工作，你会？ | Relocation Willingness & City Type | 单选 | 是 | — | 无 | `relocation_pref`: yes_best_opportunity / yes_prefer_metro / yes_prefer_lower_cost / prefer_not_move_again | mobility, school_city |
| Q26 | 7 | 你是否愿意补充AI、数据或数字技能？ | Upskilling Willingness | 单选 | 是 | — | 无 | `upskill_willingness`: very_willing / somewhat / not_priority | ai_era, action_plan |
| Q27 | 7 | 你希望多久实现经济独立？ | Independence Timeline | 单选 | 是 | — | 无 | `independence_timeline`: right_after_grad / within_1yr / 2to3yr / not_urgent | mobility, action_plan |
| Q28 | 7 | 你目前最想解决的问题是？ | Top Decision Question | 单选+可补充简答 | 是 | — | 无 | `top_decision_question`: major_uncertain / cost_pressure / city_uncertain / family_disagreement / other(text) | action_plan, tone_only |

## 汇总

> **题量目标已正式确认（本轮拍板，替代此前的"24-28目标/30绝对上限"）：标准路径最多30题，最长的条件分支路径最多31题，目标完成时间6-8分钟。不为了把每条分支都压到30题以下而删除有实际价值的住宿、用车、年级或转专业相关问题。**

- 通用路径（无分支加题）：**30 题**（Q22拆分为Q22a/Q22b两道独立题后，从29题增至30题）——**符合标准路径上限30题**
- 在读学生（本科在读/研究生在读）额外看到 Q09b：**31 题**——**符合最长条件分支路径上限31题**，不再视为"超限"
- "只是了解阶段"用户会跳过 Q19：实际比上述数字各少 1 题（通用路径29题，在读学生分支30题）
- Q22拆分为Q22a/Q22b两道独立题是有意保留的产品决策（不得把用户限制在预设的5种住宿+用车捆绑组合内），Q09b采集的年级/转专业信息是成本公式（毕业准备金、压力测试情景）的必需输入，均予以保留，不因题量目标而删减

- 全部落在 **24–31 题** 区间内，符合本轮确认的"标准路径≤30题、最长条件分支≤31题"目标
- 已删除但在原始任务书中出现过的题目及删除理由：
  - "是否愿意用排名换性价比" → 由 Q17 的排序结果推导，避免冗余提问
  - "国际旅行频率""应急预算金额"单独提问 → 改为 rules 层固定系数，用户只需在 Q23 勾选"担心这项"即可，不必逐项填精确数值
  - "填写角色"（学生/家长/共同）→ 降级为问卷入口的非计分小选项（不计入核心题数），只影响报告措辞，不出现在本矩阵的分析类计分题中
- **历史修订记录（v2）**：新增Q19b（学费定位）；Q09b扩展采集`program_year`；修正Q04分支说明错误；Q08新增互斥校验；Q15限定US-only
- **历史修订记录（v3）**：Q22曾一度拆分为`housing_type`+`car_need`但仍保留为单一复合题（5选1捆绑）；国际旅行锁定默认1次/年；转专业延长改为压力测试情景
- **历史修订记录（上一轮）**：Q22正式拆分为Q22a（住宿类型）与Q22b（用车需求）两道完全独立的题，不再捆绑为5选1；MVP学位范围锁定为仅本科（bachelor）；家庭预算压力对比年份规则区分"尚未入学"与"当前在读"两类用户（见rules.md第9.2节）
- **本轮修订（当前生效）**：正式确认题量目标为"标准路径≤30题、最长条件分支≤31题、目标完成时间6-8分钟"，替代此前的"24-28目标/30绝对上限"；明确不因题量目标而删除住宿、用车、年级、转专业等有实际价值的问题
