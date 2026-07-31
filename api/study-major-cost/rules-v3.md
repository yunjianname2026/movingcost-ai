# Study, Major & Cost Planner — 规则层说明（当前生效版本：`rules_v3_prototype_deterministic`）

> 本文件所有数字均为原型阶段的假设值，非任何具体学校/城市/年份的已核实数据。正式上线前必须替换为有来源的真实数据。
>
> **本文件是唯一需要的实现依据**：开发者应能仅凭本文件完整实现产品的成本计算、AI分类、ROI边界、移民身份边界与市场声明边界，无需查阅任何历史版本。历史版本的变更记录仅保留在文末第17节，供追溯参考，不作为实现依据。

## 0. 使用原则

1. 所有成本数字只能来自本文件固定点值表 + 第11节公式，Claude不得自行编造。
2. Essential/Standard/Comfortable三档年度总额是单一确定值，不是区间估计。
3. `tuition_position` 缺失默认 `middle_band`。
4. **地理与学位范围（MVP锁定，见第6节）**：本版本仅支持美国（US）、本科（Bachelor）、四年制标准培养周期。硕士、博士、短期项目在v1原型阶段**不作为可选值提供给用户**，问卷与产品文案中应展示为"未来支持"或直接移除，不得让用户选择后仍套用未经测试的分数年限换算。
5. 货币仅USD。
6. 住宿费不随Essential/Standard/Comfortable三档变化，只由"城市层级 × housing_type"决定（见第1节）；情景差异体现在饮食、个人支出、旅行、汽车附加等线项。

## 1. 住宿费表（Housing Table，单位USD/年，固定值，不随情景变化）

| 城市层级 | campus_or_shared（校内/合租） | shared_off_campus（校外合租） | private_studio_or_1br（独立公寓/一居室） |
|---|---|---|---|
| Tier A（大都市 metro） | 10,800 | 14,400 | 19,800 |
| Tier B（中型城市 mid_size） | 6,600 | 9,000 | 12,600 |
| Tier C（小城镇 small_town） | 4,200 | 5,700 | 8,100 |

`target_city_type` → 城市层级：`metro`→Tier A，`mid_size`→Tier B，`small_town`→Tier C。

`housing_type` 与 `car_need` 是两个独立输入（问卷中以两个独立的轻量选择呈现，不合并为固定组合，见第16节）。

## 2. 汽车附加规则（Car Add-on Rule）

| `car_need` | Essential | Standard | Comfortable |
|---|---|---|---|
| `no_car` | 不计入 | 不计入 | 不计入 |
| `may_need_car` | 不计入 | 不计入 | **仅Comfortable情景计入**（作为可选/更舒适的附加，不代表用户一定需要） |
| `definitely_need_car` | 计入 | 计入 | 计入 |

汽车附加固定值（计入时使用）：Essential $2,400 / Standard $3,000 / Comfortable $3,600

## 3. 交通基础费（Transport Base，不含汽车附加，按城市层级）

| 城市层级 | Essential | Standard | Comfortable |
|---|---|---|---|
| Tier A | 900 | 1,200 | 1,600 |
| Tier B | 600 | 800 | 1,000 |
| Tier C | 300 | 500 | 700 |

## 4. 饮食 / 保险 / 个人支出

**饮食（按城市层级）**：Tier A 4,800/6,000/7,200；Tier B 3,600/4,500/5,400；Tier C 3,000/3,600/4,200（Essential/Standard/Comfortable）
**医疗保险（统一档，不随城市层级变化）**：1,800/2,400/3,200
**个人支出（按城市层级）**：Tier A 2,400/3,300/4,200；Tier B 1,800/2,400/3,000；Tier C 1,500/1,950/2,400

## 5. 国际旅行（锁定默认值，按往返次数驱动）

**规则锁定**：本原型阶段固定默认 `international_round_trips_per_year = 1`（每学年往返1次）。每次往返费用：Essential $800 / Standard $1,000 / Comfortable $1,300。年度旅行成本 = 1 × 对应情景每次往返费用。本版本不提供往返次数的问卷输入；如需支持0次或2次以上，需先在问卷中新增对应问题并更新本文件。

## 6. 学位范围与学费表（MVP锁定：仅支持本科）

**本版本仅支持 `target_degree = bachelor`，固定4年培养周期。** 硕士（master）、博士（phd）、短期项目（short_program）不在v1原型的可选值范围内——如果产品UI仍展示这些选项，必须标注为"即将支持"且不可选中，或直接从选项中移除。**不得对非整年的学位周期（如1.75年、4.5年、0.75年）做未经验证的按比例折算**——本版本没有完整测试过的分数年限折算算法，因此暂不支持这些学位类型进入实际计算流程。

| target_degree | lower_band | middle_band | upper_band | 学位年限 |
|---|---|---|---|---|
| bachelor 本科（唯一支持） | 24,000 | 34,000 | 46,000 | 4年（固定整数年，不做小数折算） |

## 7. 经常性 vs 一次性成本分类

### 7.1 经常性年度成本（每年都计入）
学费、住宿、饮食、保险、交通基础费（+汽车附加，按第2节规则）、个人支出、国际旅行

### 7.2 一次性/过渡成本（仅入学第一年计入，固定按情景分档，不随城市层级变化）

| 项目 | Essential | Standard | Comfortable |
|---|---|---|---|
| 初始签证与行政费 initial_visa_admin | 500 | 700 | 1,000 |
| 初始置装与设备 initial_setup_equipment（含电脑、宿舍必需品、首套教材） | 700 | 1,000 | 1,400 |
| 抵达搬迁安顿费 arrival_relocation_setup（首次抵达航班、临时住宿过渡等） | 500 | 800 | 1,200 |

### 7.3 毕业/搬迁准备金（仅培养周期最后一年计入）

| Essential | Standard | Comfortable |
|---|---|---|
| 1,500 | 2,500 | 3,500 |

## 8. 应急缓冲

Essential 8% / Standard 10% / Comfortable 12%，按当年（含一次性/毕业准备金，如适用）小计计算。

## 9. 家庭预算压力判定

### 9.1 `annual_budget_range` → 确定性区间边界（USD）

| 选项 | F_low | F_high |
|---|---|---|
| lt_30k | 0 | 30,000 |
| 30_45k | 30,000 | 45,000 |
| 45_60k | 45,000 | 60,000 |
| 60_80k | 60,000 | 80,000 |
| gt_80k | 80,000 | 999,999（报告中表述为"$80,000以上"） |

### 9.2 对比年份规则（本版本明确修正：不同用户比较的"年份"不同）

- **尚未入学的用户**（`current_stage` 为 high_school / graduated / working_professional）：将家庭预算区间与 **Year 1 Standard 年度总额**（含入学第一年的一次性成本）比较。
- **当前在读的用户**（`current_stage` 为 college_current / grad_current）：将家庭预算区间与 **剩余规划周期中第一年（`planning_start_year = program_year`，即当前学年）的 Standard 年度总额** 比较——如果当前学年不是最后一年，这一年通常是"中间年"（仅经常性成本），而不是含一次性入学成本的Year 1。

### 9.3 判定规则（S = 按9.2选定的对比年份Standard年度总额）

- F_high < S → `very_high`
- F_low < S ≤ F_high 且 F_high < S×1.15 → `high`
- F_low < S ≤ F_high 且 F_high ≥ S×1.15 → `moderate`
- F_low ≥ S → `low`

## 10. 转专业：压力测试情景（不计入基础总额）

不论 `transfer_intent` 是 `considering` 还是 `already_decided`，基础总额均不自动增加一年。转专业延长统一作为独立的"压力测试情景"展示：

> "如果转专业导致额外增加一个学年，压力测试成本约为 [该延长年份按Standard情景的经常性年度成本计算，不含一次性/毕业准备金]——这是一个假设性推演，不计入基础总额。"

## 11. 计算公式（Explicit Formulas，唯一允许的计算路径）

```
tuition_annual = TuitionTable[bachelor][tuition_position]（unsure → middle_band；本版本仅支持bachelor）
housing_annual = HousingTable[tier][housing_type]（固定值，不随情景变化）

car_addon[scenario] = CarAddonTable[scenario] if (
    car_need == "definitely_need_car"
    or (car_need == "may_need_car" and scenario == "comfortable")
) else 0

annual_recurring[scenario] =
    tuition_annual + housing_annual
  + Food[tier][scenario] + Insurance[scenario]
  + TransportBase[tier][scenario] + car_addon[scenario]
  + PersonalSpending[tier][scenario]
  + (1 × TravelPerTrip[scenario])   # 往返次数固定为1，见第5节

year1_subtotal[scenario] = annual_recurring[scenario]
  + InitialVisaAdmin[scenario] + InitialSetupEquipment[scenario] + ArrivalRelocationSetup[scenario]

middle_year_subtotal[scenario] = annual_recurring[scenario]

final_year_subtotal[scenario] = annual_recurring[scenario] + GraduationRelocationReserve[scenario]

year_total[scenario] = 对应subtotal × (1 + EmergencyBufferPct[scenario])

# 尚未入学用户：full_program_total = year1_total + Σ(middle_year_total × 中间年数) + final_year_total（4年制，即year1+2个中间年+final）
# 在读用户：remaining_program_total = Σ(从planning_start_year到毕业的各年年度总额)，其中若planning_start_year为中间年则不含一次性成本

transfer_stress_test_addon[scenario=standard] = middle_year_subtotal[standard] × (1 + EmergencyBufferPct[standard])
（固定按Standard情景计算，独立披露，不并入 full_program_total 或 remaining_program_total）
```

## 12. AI时代分类限制（本节为完整生效条款）

**以下分级是本工具内部的原型分类（prototype classification），不是对真实劳动力市场、招聘需求或薪资趋势的事实性陈述。** 报告中引用这些分级时，必须明确标注"本工具原型分类"字样，不得表述为"市场认可度上升""需求持续增长"等既成事实性语言。

方向性分级参考（原型标签，`ai_augmentation_potential` / `automation_risk_level` 只能取 `low`/`moderate`/`high`）：
- 偏重"重复性信息处理、基础文案、基础数据录入、初级客服"：`automation_risk_level` 倾向 `high`
- 偏重"人际协作、复杂判断、现场实践、监管强相关（医疗执照、法律执业）、创意策略统筹"：`automation_risk_level` 倾向 `low`
- 具备"数据/AI工具 + 行业知识"组合潜力：归入 `ai_augmentation_potential` 为 `high` 的组合型专业

分数与百分比限制：所有分数字段限制0–100且需注明"仅为内部相对比较"；不得输出未标注来源的百分比或概率。

## 13. 财务回报（ROI）限制（本节为完整生效条款）

**在没有经过核实的薪资、就业率数据支持前，禁止对任何专业路径做出"投资回报更确定""财务回报更高"这类比较性结论。** `education_value.overall_assessment` 只能围绕以下五项展开，不得涉及financial ROI比较：个人适配（personal fit）、完成风险（completion risk）、预算可持续性（budget sustainability）、转换/转专业风险（transfer risk）、长期灵活性（flexibility）。`education_value.financial_roi_assessed` 必须固定为 `false`。

## 14. 移民与工作许可限制（本节为完整生效条款）

**本工具不评估移民身份、工作许可、雇主担保或未来政策变化。** 所有涉及"毕业后留在留学国"的表述，必须明确区分：
- **用户偏好**（`preferred_post_graduation_direction`）——用户在问卷中表达的意愿，仅代表意愿本身，不得写成"大概率会……"
- **规划情景**（`planning_scenario`）——基于用户偏好构建的情景描述，用条件句
- **可行性置信度**（`feasibility_confidence`）——本版本固定为 `not_assessed`
- **工作许可假设**（`work_authorization_assumption`）——固定文案："本工具不评估工作许可、移民身份、雇主担保或未来政策变化，具体身份与合法工作资格问题需咨询移民律师或学校国际学生办公室（DSO）。"

不得因为用户"偏好留在留学国"就推导出"大概率能留下"这类可行性结论。**Career Destination（毕业后第一份工作所在地）的定义为"用户当前的偏好或规划表达"，不是"更可能发生"的结果预测；Long-Term Destination（长期定居地）的定义为"用户当前表达的5–10年长期生活地点偏好，不代表定居可行性或未来结果预测"。**

## 15. 未支持的劳动力市场与城市声明限制（本节为完整生效条款）

以下类型的表述，除非有明确传入的数据支持，一律禁止作为既成事实陈述，必须改用条件句或"需核实"表述：

- "需求正在增长""市场认可度上升""某领域正在扩张" → 改为"本工具将该方向归类为……（原型分类，非市场事实）"
- "某类城市机会更多""机会分布均衡""所有城市类型都有需求" → 改为"具体城市机会分布需以实时劳动力市场数据核实，本工具暂未接入此类数据"
- "入门起薪通常更低/更高" → 不得做薪资比较，改为"具体起薪因地区/雇主/岗位而异，需以公开薪资信息核实"
- "作品集/实习经历比学位/排名更重要" → 改为"在本原型路径中，作品集/实习经历被视为重要的验证信号，但具体雇主重视程度需以真实招聘信息核实，本工具不做绝对比较判断"
- "某类课程设置尚不成熟/已经成熟" → 改为"具体课程设置因学校而异，需要逐校核实"
- 任何具体城市名称的价值排序或性价比断言（如"XX城市比YY城市性价比更高"）→ 不得使用具体城市名称做比较，只能使用城市层级（Tier A/B/C）等原型分类

## 16. 规划周期与住宿/用车输入的产品呈现规则

### 16.1 规划周期类型（Planning Period Type）

- **尚未入学的用户** → `planning_period_type = full_program`，`planning_start_year = 1`，报告展示"四年完整周期总额"
- **当前在读的用户** → `planning_period_type = remaining_program`，`planning_start_year = program_year`（即从当前学年开始规划，覆盖当前学年到最后一年），报告展示"剩余N年总额"，**不得**将其标注为"四年完整周期总额"

### 16.2 住宿类型与用车需求的问卷呈现

`housing_type` 与 `car_need` 是两个独立的输入字段，在问卷中应作为**两个独立的轻量选择**分别呈现（即使放在同一屏幕上），不得将用户限制在预先绑定的组合选项中（例如不得只提供"合租不需要车/独立公寓需要车"这类五选一捆绑选项）。具体UI呈现与题号见 `study-major-cost-question-matrix.md`。

## 17. 版本记录

- `rules_v1_prototype`（已废弃）：首次建立，使用区间+模糊缩放语言
- `rules_v2_prototype_deterministic`（已废弃）：固定点值+公式，但住宿/用车耦合、一次性成本被误按年计入、转专业延长被自动计入基础总额
- `rules_v3_prototype_deterministic`（**当前生效版本**）：住宿与用车解耦（问卷中呈现为两个独立选择）、经常性/一次性成本分离、旅行假设锁定为每年1次、转专业改为压力测试情景、MVP范围锁定为仅美国/本科/四年制、预算对比年份按"是否在读"区分、新增规划周期类型（full_program / remaining_program）区分新生与在读生的成本口径
