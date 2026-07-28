(function () {
  'use strict';

  var DRAFT_KEY = 'mc_smc_draft_v1';
  var FIXTURE_URL = '/fixtures/study-major-cost/fixture-report-a.json';
  var API_URL = '/api/pathways-study-major-cost';
  var MOCK_MODE = /[?&]mock=1(?:&|$)/.test(window.location.search);

  var STEP_TITLES = [
    '你的学习阶段 · Your Study Stage',
    '学术基础 · Academic Profile',
    '兴趣与优势 · Interests & Strengths',
    '职业发展偏好 · Career Preferences',
    '目标国家、学校与城市 · Country, School & City',
    '家庭预算与生活方式 · Family Budget & Lifestyle',
    '毕业后的迁移与人生计划 · Future Mobility & Life Plan',
  ];

  var PRESSURE_LABELS = {
    low: '较低',
    moderate: '中等',
    high: '偏高',
    very_high: '很高',
  };

  var PATH_TYPE_LABELS = {
    best_match: '最佳匹配',
    ai_augmented_combo: 'AI 增强组合',
    safe_alternative: '稳健备选',
  };

  var state = {
    view: 'landing',
    currentStep: 1,
    answers: {},
    costs: null,
    freePreview: null,
    fullReport: null,
    apiError: null,
    fixtureMode: false,
    analyzing: false,
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function formatUsd(n) {
    if (n == null || isNaN(n)) return '—';
    return '$' + Number(n).toLocaleString('en-US');
  }

  function showView(name) {
    state.view = name;
    $$('[data-view]').forEach(function (el) {
      el.hidden = el.getAttribute('data-view') !== name;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function defaultAnswers() {
    return {
      target_country: 'US',
      target_degree: 'bachelor',
      strong_subjects: [],
      tech_acceptance: [],
      interest_strengths: [],
      career_values: [],
      priority_top3: [],
      cost_worry: [],
      strength_one_liner: '',
      current_major: '',
      offer_or_considered_school_major: '',
      top_decision_question_other: '',
    };
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var draft = JSON.parse(raw);
      if (draft.productVersion !== window.SMC.PRODUCT_VERSION) return;
      if (draft.answers) state.answers = Object.assign(defaultAnswers(), draft.answers);
      if (draft.currentStep) state.currentStep = draft.currentStep;
    } catch (e) { /* ignore */ }
  }

  function saveDraft() {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          answers: state.answers,
          currentStep: state.currentStep,
          draftTimestamp: Date.now(),
          productVersion: window.SMC.PRODUCT_VERSION,
          rulesVersion: window.SMC.RULES_VERSION,
        })
      );
    } catch (e) { /* ignore */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    state.answers = defaultAnswers();
    state.currentStep = 1;
    renderQuestionnaire();
    showView('landing');
  }

  function isEnrolled() {
    var s = state.answers.current_stage;
    return s === 'college_current' || s === 'grad_current';
  }

  function showQ19() {
    var os = state.answers.offer_status;
    return os && os !== 'just_exploring';
  }

  function q19Required() {
    return state.answers.offer_status === 'has_offer';
  }

  function isHighSchoolStage() {
    return state.answers.current_stage === 'high_school';
  }

  function getVisibleQuestionIds(step) {
    var ids = [];
    if (step === 1) ids = ['Q01', 'Q02', 'Q03', 'Q04'];
    else if (step === 2) {
      ids = ['Q05', 'Q06', 'Q07', 'Q08', 'Q09'];
      if (isEnrolled()) ids.push('Q09b');
    } else if (step === 3) ids = ['Q10', 'Q11'];
    else if (step === 4) ids = ['Q12', 'Q13', 'Q14'];
    else if (step === 5) {
      ids = ['Q15', 'Q16', 'Q17', 'Q18'];
      if (showQ19()) ids.push('Q19');
      ids.push('Q19b');
    } else if (step === 6) ids = ['Q20', 'Q21', 'Q22a', 'Q22b', 'Q23'];
    else if (step === 7) ids = ['Q24', 'Q25', 'Q26', 'Q27', 'Q28'];
    return ids;
  }

  function countTotalQuestions() {
    var total = 0;
    for (var s = 1; s <= 7; s++) total += getVisibleQuestionIds(s).length;
    return total;
  }

  function answeredCountForStep(step) {
    var ids = getVisibleQuestionIds(step);
    var n = 0;
    ids.forEach(function (id) {
      if (isQuestionAnswered(id)) n++;
    });
    return n;
  }

  function isQuestionAnswered(id) {
    var a = state.answers;
    switch (id) {
      case 'Q01': return !!a.current_stage;
      case 'Q02': return a.target_degree === 'bachelor';
      case 'Q03': return !!a.planned_intake;
      case 'Q04': return !!a.offer_status;
      case 'Q05': return !!a.academic_range;
      case 'Q06': return Array.isArray(a.strong_subjects) && a.strong_subjects.length >= 1;
      case 'Q07': return !!a.english_level;
      case 'Q08': return Array.isArray(a.tech_acceptance) && a.tech_acceptance.length >= 1;
      case 'Q09': return !!a.rigor_acceptance;
      case 'Q09b':
        return !!(a.current_major && String(a.current_major).trim()) &&
          !!a.transfer_intent && !!a.program_year;
      case 'Q10': return Array.isArray(a.interest_strengths) && a.interest_strengths.length >= 1;
      case 'Q11': return true;
      case 'Q12': return Array.isArray(a.career_values) && a.career_values.length >= 1;
      case 'Q13': return !!a.domain_preference;
      case 'Q14': return !!a.risk_acceptance;
      case 'Q15': return a.target_country === 'US';
      case 'Q16': return !!a.target_city_type;
      case 'Q17': return Array.isArray(a.priority_top3) && a.priority_top3.length === 3;
      case 'Q18': return !!a.school_type_pref;
      case 'Q19':
        if (!q19Required()) return true;
        return !!(a.offer_or_considered_school_major && String(a.offer_or_considered_school_major).trim());
      case 'Q19b': return !!a.tuition_position;
      case 'Q20': return !!a.annual_budget_range;
      case 'Q21': return !!a.finance_structure;
      case 'Q22a': return !!a.housing_type;
      case 'Q22b': return !!a.car_need;
      case 'Q23': return Array.isArray(a.cost_worry) && a.cost_worry.length >= 1;
      case 'Q24': return !!a.post_grad_direction;
      case 'Q25': return !!a.relocation_pref;
      case 'Q26': return !!a.upskill_willingness;
      case 'Q27': return !!a.independence_timeline;
      case 'Q28': return !!a.top_decision_question;
      default: return false;
    }
  }

  function stepComplete(step) {
    var ids = getVisibleQuestionIds(step);
    for (var i = 0; i < ids.length; i++) {
      if (!isQuestionAnswered(ids[i])) return false;
    }
    return true;
  }

  function handleTechAcceptance(value, checked) {
    var arr = state.answers.tech_acceptance.slice();
    if (value === 'none') {
      state.answers.tech_acceptance = checked ? ['none'] : [];
    } else {
      arr = arr.filter(function (x) { return x !== 'none'; });
      if (checked && arr.indexOf(value) === -1) arr.push(value);
      if (!checked) arr = arr.filter(function (x) { return x !== value; });
      state.answers.tech_acceptance = arr.slice(0, 2);
    }
    saveDraft();
    renderQuestionnaire();
  }

  function toggleMulti(field, value, max) {
    var arr = (state.answers[field] || []).slice();
    var idx = arr.indexOf(value);
    if (idx === -1) {
      if (arr.length >= max) return;
      arr.push(value);
    } else {
      arr.splice(idx, 1);
    }
    state.answers[field] = arr;
    saveDraft();
    renderQuestionnaire();
  }

  function setSingle(field, value) {
    state.answers[field] = value;
    if (field === 'offer_status') {
      if (value === 'just_exploring') state.answers.offer_or_considered_school_major = '';
    }
    if (field === 'current_stage' && !isEnrolled()) {
      state.answers.current_major = state.answers.current_major || '';
      state.answers.transfer_intent = 'not_considering';
      state.answers.program_year = 1;
    }
    saveDraft();
    renderQuestionnaire();
  }

  function setText(field, value, maxLen) {
    state.answers[field] = String(value || '').slice(0, maxLen || 400);
    saveDraft();
  }

  function handlePriorityPick(value) {
    var arr = (state.answers.priority_top3 || []).slice();
    var idx = arr.indexOf(value);
    if (idx !== -1) {
      arr.splice(idx, 1);
    } else if (arr.length < 3) {
      arr.push(value);
    }
    state.answers.priority_top3 = arr;
    saveDraft();
    renderQuestionnaire();
  }

  var QUESTIONS = {
    Q01: {
      field: 'current_stage', type: 'single',
      label: '你现在处于哪个阶段？',
      sub: 'Your Study Stage',
      options: [
        { v: 'high_school', l: '高中在读 / 即将毕业' },
        { v: 'college_current', l: '大学在读（本科）' },
        { v: 'graduated', l: '已高中毕业，尚未入读大学' },
        { v: 'grad_current', l: '研究生在读' },
        { v: 'working_professional', l: '已工作，考虑重返校园' },
      ],
    },
    Q02: {
      field: 'target_degree', type: 'single',
      label: '你计划申请的层次是？',
      sub: 'Target Degree（MVP 仅本科可选）',
      options: [
        { v: 'bachelor', l: '本科 Bachelor' },
        { v: 'master', l: '硕士 Master', disabled: true, tag: '即将支持' },
        { v: 'phd', l: '博士 PhD', disabled: true, tag: '即将支持' },
        { v: 'short_program', l: '短期项目', disabled: true, tag: '即将支持' },
      ],
    },
    Q03: {
      field: 'planned_intake', type: 'single',
      label: '你计划的入学时间是？',
      sub: 'Planned Intake',
      options: [
        { v: 'within_6mo', l: '6 个月内' },
        { v: '6to12mo', l: '6–12 个月' },
        { v: '1to2yr', l: '1–2 年' },
        { v: 'undecided', l: '尚未确定' },
      ],
    },
    Q04: {
      field: 'offer_status', type: 'single',
      label: '你目前的申请 / Offer 状态是？',
      sub: 'Offer Status',
      options: [
        { v: 'has_offer', l: '已拿到 Offer' },
        { v: 'applied_waiting', l: '已申请，等待结果' },
        { v: 'not_applied', l: '尚未申请' },
        { v: 'just_exploring', l: '只是了解阶段' },
      ],
    },
    Q05: {
      field: 'academic_range', type: 'single',
      label: function () {
        return isHighSchoolStage()
          ? '你的成绩区间大致是？（GPA / 年级排名）'
          : '你的大学 GPA 区间大致是？';
      },
      sub: 'Academic Range',
      options: function () {
        return [
          { v: 'top', l: '顶尖（前 10%）' },
          { v: 'above_average', l: '中上（前 10%–30%）' },
          { v: 'average', l: '中等' },
          { v: 'below_average', l: '偏低' },
          { v: 'unsure', l: '不太确定' },
        ];
      },
    },
    Q06: {
      field: 'strong_subjects', type: 'multi', max: 3,
      label: '你比较擅长的科目是？（最多 3 项）',
      sub: 'Strong Subjects',
      options: [
        { v: 'math', l: '数学 Math' },
        { v: 'science', l: '理科 Science' },
        { v: 'language_writing', l: '语言与写作' },
        { v: 'art_design', l: '艺术与设计' },
        { v: 'social_science', l: '社会科学' },
        { v: 'business_econ', l: '商业与经济' },
        { v: 'computer', l: '计算机相关' },
      ],
    },
    Q07: {
      field: 'english_level', type: 'single',
      label: '你的英语能力自评是？',
      sub: 'English Level',
      options: [
        { v: 'fluent', l: '流利 Fluent' },
        { v: 'proficient', l: '熟练 Proficient' },
        { v: 'intermediate', l: '中等 Intermediate' },
        { v: 'basic', l: '基础 Basic' },
      ],
    },
    Q08: {
      field: 'tech_acceptance', type: 'tech_xor', max: 2,
      label: '以下哪些内容你比较能接受？（可都选，也可都不选；「都不选」与数学/编程互斥）',
      sub: 'Math & Programming Acceptance',
      options: [
        { v: 'math', l: '数学类课程' },
        { v: 'programming', l: '编程类内容' },
        { v: 'none', l: '都不太能接受' },
      ],
    },
    Q09: {
      field: 'rigor_acceptance', type: 'single',
      label: '你能接受高强度课程或较长的培养周期吗？',
      sub: 'Rigor Acceptance',
      options: [
        { v: 'fully_accept', l: '完全可以接受' },
        { v: 'partially', l: '部分接受' },
        { v: 'prefer_efficient', l: '更偏好高效路径' },
      ],
    },
    Q09b: {
      type: 'enrolled_combo',
      label: '你目前的专业、转专业意向与在读年级',
      sub: 'Current Major, Transfer Intent & Program Year',
    },
    Q10: {
      field: 'interest_strengths', type: 'multi', max: 5,
      label: '以下哪些最能代表你的兴趣与优势？（最多 5 项）',
      sub: 'Interests & Strengths',
      options: [
        { v: 'data_analysis', l: '数据分析' },
        { v: 'problem_solving', l: '解决问题' },
        { v: 'programming_tech', l: '编程与技术' },
        { v: 'business_sales', l: '商业与销售' },
        { v: 'writing_expression', l: '写作与表达' },
        { v: 'design_creative', l: '设计与创意' },
        { v: 'science_research', l: '科学研究' },
        { v: 'communication', l: '沟通协作' },
        { v: 'organization_mgmt', l: '组织与管理' },
        { v: 'helping_others', l: '帮助他人' },
        { v: 'hands_on', l: '动手实践' },
        { v: 'content_creation', l: '内容创作' },
      ],
    },
    Q11: {
      field: 'strength_one_liner', type: 'text', max: 280, optional: true,
      label: '别人通常认为你最擅长什么？（一句话即可，可跳过）',
      sub: 'One-liner Strength',
      placeholder: '例如：很会说服别人、点子多、组织活动能力强…',
    },
    Q12: {
      field: 'career_values', type: 'multi', max: 3,
      label: '你更看重职业发展中的哪些方面？（最多 3 项）',
      sub: 'Career Values',
      options: [
        { v: 'high_income', l: '高收入' },
        { v: 'stability', l: '稳定性' },
        { v: 'creativity', l: '创造力' },
        { v: 'social_impact', l: '社会影响力' },
        { v: 'work_life_balance', l: '工作生活平衡' },
        { v: 'global_mobility', l: '全球流动性' },
        { v: 'entrepreneurship', l: '创业' },
        { v: 'remote_work', l: '远程工作' },
        { v: 'big_company', l: '大公司平台' },
        { v: 'professional_status', l: '专业地位' },
        { v: 'fast_growth', l: '快速成长' },
      ],
    },
    Q13: {
      field: 'domain_preference', type: 'single',
      label: '你更偏向哪种类型的工作？',
      sub: 'Domain Preference',
      options: [
        { v: 'technical', l: '技术 Technical' },
        { v: 'business', l: '商业 Business' },
        { v: 'creative', l: '创意 Creative' },
        { v: 'research', l: '研究 Research' },
        { v: 'service', l: '服务 Service' },
        { v: 'management', l: '管理 Management' },
      ],
    },
    Q14: {
      field: 'risk_acceptance', type: 'single',
      label: '你对风险的接受程度是？',
      sub: 'Risk Acceptance',
      options: [
        { v: 'high', l: '较高' },
        { v: 'medium', l: '中等' },
        { v: 'low', l: '较低' },
      ],
    },
    Q15: {
      field: 'target_country', type: 'single',
      label: '你的目标国家是？（v1 原型仅支持美国）',
      sub: 'Target Country',
      options: [
        { v: 'US', l: '美国 United States' },
        { v: 'other_future', l: '其他国家（加拿大、英国等）', disabled: true, tag: 'Coming Soon' },
      ],
    },
    Q16: {
      field: 'target_city_type', type: 'single',
      label: '你更偏好哪种城市类型？',
      sub: 'Target City Type',
      options: [
        { v: 'metro', l: '大都市 Metro' },
        { v: 'mid_size', l: '中型城市 Mid-size' },
        { v: 'small_town', l: '小城镇 Small town' },
      ],
    },
    Q17: {
      field: 'priority_top3', type: 'priority', max: 3,
      label: '请把以下六项按重视程度选择前 3 项（按点击顺序排序）',
      sub: 'Priority Ranking',
      options: [
        { v: 'ranking', l: '排名 Ranking' },
        { v: 'major', l: '专业 Major' },
        { v: 'employment', l: '就业 Employment' },
        { v: 'cost', l: '成本 Cost' },
        { v: 'city', l: '城市 City' },
        { v: 'campus_life', l: '校园体验 Campus life' },
      ],
    },
    Q18: {
      field: 'school_type_pref', type: 'single',
      label: '你更偏好哪种学校规模/类型？',
      sub: 'School Type Preference',
      options: [
        { v: 'large_research', l: '大型研究型大学' },
        { v: 'small_teaching', l: '小型教学型学院' },
        { v: 'no_preference', l: '没有特别偏好' },
      ],
    },
    Q19: {
      field: 'offer_or_considered_school_major', type: 'text', max: 400,
      label: function () {
        return q19Required()
          ? '请简要写下你拿到 Offer 的学校与专业（必填）'
          : '如果已经考虑了具体学校或专业，可以简单写一下（选填）';
      },
      sub: 'Offer / Considered School & Major',
      placeholder: '例如：NYU Stern · Business 或 正在考虑 UIUC Information Systems',
    },
    Q19b: {
      field: 'tuition_position', type: 'single',
      label: '你对目标学校的学费定位怎么预期？',
      sub: 'Tuition Position',
      options: [
        { v: 'lower_band', l: '偏低档（约 $24k/年）' },
        { v: 'middle_band', l: '中档（约 $34k/年）' },
        { v: 'upper_band', l: '偏高档（约 $46k/年）' },
        { v: 'unsure', l: '不太确定（按中档估算）' },
      ],
    },
    Q20: {
      field: 'annual_budget_range', type: 'single',
      label: '你们家庭预计的年度总预算区间是？（美元）',
      sub: 'Annual Budget Range',
      options: [
        { v: 'lt_30k', l: '低于 $30,000' },
        { v: '30_45k', l: '$30,000 – $45,000' },
        { v: '45_60k', l: '$45,000 – $60,000' },
        { v: '60_80k', l: '$60,000 – $80,000' },
        { v: 'gt_80k', l: '高于 $80,000' },
      ],
    },
    Q21: {
      field: 'finance_structure', type: 'single',
      label: '这笔预算主要如何构成？',
      sub: 'Family Finance Structure',
      options: [
        { v: 'family_full', l: '家庭全额承担' },
        { v: 'family_plus_scholarship', l: '家庭 + 奖学金' },
        { v: 'mainly_scholarship', l: '主要靠奖学金' },
        { v: 'needs_loan', l: '需要贷款' },
      ],
    },
    Q22a: {
      field: 'housing_type', type: 'single',
      label: '你更偏好哪种住宿类型？',
      sub: 'Housing Type',
      options: [
        { v: 'campus_or_shared', l: '校内宿舍 / 合租' },
        { v: 'shared_off_campus', l: '校外合租' },
        { v: 'private_studio_or_1br', l: '独立公寓 / 一居室' },
      ],
    },
    Q22b: {
      field: 'car_need', type: 'single',
      label: '你日常是否需要用车？',
      sub: 'Car Need',
      options: [
        { v: 'no_car', l: '不需要' },
        { v: 'may_need_car', l: '可能需要' },
        { v: 'definitely_need_car', l: '肯定需要' },
      ],
    },
    Q23: {
      field: 'cost_worry', type: 'multi', max: 2,
      label: '家庭最担心哪些成本项？（最多 2 项）',
      sub: 'Biggest Cost Worry',
      options: [
        { v: 'tuition', l: '学费' },
        { v: 'housing', l: '住宿' },
        { v: 'healthcare', l: '医疗/保险' },
        { v: 'transport', l: '交通' },
        { v: 'emergency', l: '应急储备' },
        { v: 'international_travel', l: '国际旅行' },
      ],
    },
    Q24: {
      field: 'post_grad_direction', type: 'single',
      label: '毕业后你的初步打算是？',
      sub: 'Post-Graduation Direction',
      options: [
        { v: 'stay_study_country', l: '留在留学国家' },
        { v: 'return_home', l: '回国' },
        { v: 'third_country', l: '去第三国' },
        { v: 'undecided', l: '尚未确定' },
      ],
    },
    Q25: {
      field: 'relocation_pref', type: 'single',
      label: '如果毕业后要换城市工作，你会？',
      sub: 'Relocation Willingness',
      options: [
        { v: 'yes_best_opportunity', l: '愿意，跟随最佳机会' },
        { v: 'yes_prefer_metro', l: '愿意，但偏好大都市' },
        { v: 'yes_prefer_lower_cost', l: '愿意，但偏好生活成本较低的城市' },
        { v: 'prefer_not_move_again', l: '不太想再次搬迁' },
      ],
    },
    Q26: {
      field: 'upskill_willingness', type: 'single',
      label: '你是否愿意补充 AI、数据或数字技能？',
      sub: 'Upskilling Willingness',
      options: [
        { v: 'very_willing', l: '非常愿意' },
        { v: 'somewhat', l: '有一定意愿' },
        { v: 'not_priority', l: '不是当前重点' },
      ],
    },
    Q27: {
      field: 'independence_timeline', type: 'single',
      label: '你希望多久实现经济独立？',
      sub: 'Independence Timeline',
      options: [
        { v: 'right_after_grad', l: '毕业后尽快' },
        { v: 'within_1yr', l: '1 年内' },
        { v: '2to3yr', l: '2–3 年' },
        { v: 'not_urgent', l: '不着急' },
      ],
    },
    Q28: {
      field: 'top_decision_question', type: 'single_with_other',
      label: '你目前最想解决的问题是？',
      sub: 'Top Decision Question',
      options: [
        { v: 'major_uncertain', l: '专业方向不确定' },
        { v: 'cost_pressure', l: '成本/预算压力大' },
        { v: 'city_uncertain', l: '城市选择不确定' },
        { v: 'family_disagreement', l: '家庭意见不一致' },
        { v: 'other', l: '其他（可补充说明）' },
      ],
    },
  };

  function renderQuestionBlock(id) {
    var q = QUESTIONS[id];
    if (!q) return '';
    var label = typeof q.label === 'function' ? q.label() : q.label;
    var html = '<div class="q-block" data-qid="' + id + '">';
    html += '<div class="q-label">' + label + '</div>';
    html += '<div class="q-sub">' + q.sub + '</div>';

    if (q.type === 'single') {
      var opts = typeof q.options === 'function' ? q.options() : q.options;
      html += '<div class="opt-grid">';
      opts.forEach(function (o) {
        var sel = state.answers[q.field] === o.v;
        var cls = 'opt-btn' + (sel ? ' selected' : '') + (o.disabled ? ' disabled' : '');
        html += '<button type="button" class="' + cls + '" data-action="single" data-field="' + q.field + '" data-value="' + o.v + '"' +
          (o.disabled ? ' disabled' : '') + '>' + o.l +
          (o.tag ? ' <span class="opt-tag">' + o.tag + '</span>' : '') + '</button>';
      });
      html += '</div>';
    } else if (q.type === 'multi') {
      html += '<div class="opt-grid">';
      q.options.forEach(function (o) {
        var arr = state.answers[q.field] || [];
        var sel = arr.indexOf(o.v) !== -1;
        html += '<button type="button" class="opt-btn' + (sel ? ' selected' : '') + '" data-action="multi" data-field="' + q.field + '" data-value="' + o.v + '" data-max="' + q.max + '">' + o.l + '</button>';
      });
      html += '</div>';
      html += '<p class="q-hint">已选 ' + (state.answers[q.field] || []).length + ' / ' + q.max + '</p>';
    } else if (q.type === 'tech_xor') {
      html += '<div class="opt-grid">';
      q.options.forEach(function (o) {
        var arr = state.answers.tech_acceptance || [];
        var sel = arr.indexOf(o.v) !== -1;
        html += '<button type="button" class="opt-btn' + (sel ? ' selected' : '') + '" data-action="tech" data-value="' + o.v + '">' + o.l + '</button>';
      });
      html += '</div>';
    } else if (q.type === 'priority') {
      var picked = state.answers.priority_top3 || [];
      html += '<div class="priority-list">';
      q.options.forEach(function (o) {
        var rank = picked.indexOf(o.v);
        var sel = rank !== -1;
        html += '<button type="button" class="opt-btn priority' + (sel ? ' selected' : '') + '" data-action="priority" data-value="' + o.v + '">';
        html += '<span class="priority-rank">' + (sel ? '#' + (rank + 1) : '—') + '</span> ' + o.l;
        html += '</button>';
      });
      html += '</div>';
      html += '<p class="q-hint">已选 ' + picked.length + ' / 3</p>';
    } else if (q.type === 'text') {
      var val = state.answers[q.field] || '';
      html += '<textarea class="q-text" data-field="' + q.field + '" maxlength="' + q.max + '" rows="3" placeholder="' + (q.placeholder || '') + '">' + escapeHtml(val) + '</textarea>';
      if (q.optional) html += '<p class="q-hint">选填，不影响继续</p>';
    } else if (q.type === 'enrolled_combo') {
      html += '<input type="text" class="q-input" data-field="current_major" maxlength="120" placeholder="当前专业" value="' + escapeHtml(state.answers.current_major || '') + '">';
      html += '<div class="q-mini-label">是否在考虑转专业？</div><div class="opt-grid">';
      [
        { v: 'considering', l: '正在考虑' },
        { v: 'not_considering', l: '不考虑' },
        { v: 'already_decided', l: '已决定转专业' },
      ].forEach(function (o) {
        var sel = state.answers.transfer_intent === o.v;
        html += '<button type="button" class="opt-btn' + (sel ? ' selected' : '') + '" data-action="single" data-field="transfer_intent" data-value="' + o.v + '">' + o.l + '</button>';
      });
      html += '</div><div class="q-mini-label">目前读到第几年？</div><div class="opt-grid">';
      [1, 2, 3, 4].forEach(function (yr) {
        var sel = state.answers.program_year === yr;
        html += '<button type="button" class="opt-btn' + (sel ? ' selected' : '') + '" data-action="single" data-field="program_year" data-value="' + yr + '">第 ' + yr + ' 年</button>';
      });
      html += '</div>';
    } else if (q.type === 'single_with_other') {
      html += '<div class="opt-grid">';
      q.options.forEach(function (o) {
        var sel = state.answers.top_decision_question === o.v;
        html += '<button type="button" class="opt-btn' + (sel ? ' selected' : '') + '" data-action="single" data-field="top_decision_question" data-value="' + o.v + '">' + o.l + '</button>';
      });
      html += '</div>';
      if (state.answers.top_decision_question === 'other') {
        html += '<input type="text" class="q-input" data-field="top_decision_question_other" maxlength="200" placeholder="请补充说明" value="' + escapeHtml(state.answers.top_decision_question_other || '') + '">';
      }
    }

    html += '</div>';
    return html;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderQuestionnaire() {
    var container = $('#questionnaire-body');
    if (!container) return;

    var ids = getVisibleQuestionIds(state.currentStep);
    container.innerHTML = ids.map(renderQuestionBlock).join('');

    $('#step-title').textContent = '第 ' + state.currentStep + ' 步 · ' + STEP_TITLES[state.currentStep - 1];
    $('#step-progress').textContent =
      '步骤 ' + state.currentStep + '/7 · 本步 ' + answeredCountForStep(state.currentStep) + '/' + ids.length +
      ' · 全卷约 ' + countTotalQuestions() + ' 题';

    var prevBtn = $('#btn-prev');
    var nextBtn = $('#btn-next');
    if (prevBtn) prevBtn.disabled = state.currentStep <= 1;
    if (nextBtn) {
      nextBtn.textContent = state.currentStep >= 7 ? '提交分析' : '下一步';
      nextBtn.disabled = !stepComplete(state.currentStep);
    }

    $$('.step-dot').forEach(function (dot) {
      var n = Number(dot.getAttribute('data-step'));
      dot.classList.toggle('active', n === state.currentStep);
      dot.classList.toggle('done', n < state.currentStep || (n === state.currentStep && stepComplete(n)));
    });

    bindQuestionEvents(container);
    saveDraft();
  }

  function bindQuestionEvents(root) {
    $$('[data-action="single"]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var field = btn.getAttribute('data-field');
        var val = btn.getAttribute('data-value');
        if (field === 'program_year') setSingle(field, Number(val));
        else setSingle(field, val);
      });
    });
    $$('[data-action="multi"]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleMulti(btn.getAttribute('data-field'), btn.getAttribute('data-value'), Number(btn.getAttribute('data-max')));
      });
    });
    $$('[data-action="tech"]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-value');
        var arr = state.answers.tech_acceptance || [];
        var checked = arr.indexOf(val) === -1;
        handleTechAcceptance(val, checked);
      });
    });
    $$('[data-action="priority"]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        handlePriorityPick(btn.getAttribute('data-value'));
      });
    });
    $$('.q-text, .q-input', root).forEach(function (el) {
      el.addEventListener('input', function () {
        setText(el.getAttribute('data-field'), el.value, Number(el.getAttribute('maxlength') || 400));
        renderQuestionnaire();
      });
    });
  }

  function buildSubmitPayload() {
    var payload = {};
    var a = state.answers;
    var keys = [
      'current_stage', 'target_degree', 'planned_intake', 'offer_status', 'academic_range',
      'strong_subjects', 'english_level', 'tech_acceptance', 'rigor_acceptance', 'current_major',
      'transfer_intent', 'program_year', 'interest_strengths', 'strength_one_liner',
      'career_values', 'domain_preference', 'risk_acceptance', 'target_country',
      'target_city_type', 'priority_top3', 'school_type_pref', 'offer_or_considered_school_major',
      'tuition_position', 'annual_budget_range', 'finance_structure', 'housing_type', 'car_need',
      'cost_worry', 'post_grad_direction', 'relocation_pref', 'upskill_willingness',
      'independence_timeline', 'top_decision_question',
    ];
    keys.forEach(function (k) {
      if (a[k] !== undefined) payload[k] = a[k];
    });
    return payload;
  }

  function renderFreeResult() {
    var root = $('#free-result-body');
    if (!root) return;

    var costs = state.costs;
    var preview = state.freePreview || {};
    var ds = preview.decision_summary || preview;
    var html = '';

    if (state.apiError) {
      html += '<div class="banner banner-warn">' + escapeHtml(state.apiError) + '</div>';
    }

    html += '<div class="result-card">';
    html += '<div class="result-tag">免费预览 · Free Preview</div>';
    html += '<h2 class="result-title">' + escapeHtml(ds.best_major_direction || preview.best_major_direction || '分析完成') + '</h2>';
    if (ds.summary_text || preview.summary_text) {
      html += '<p class="result-lead">' + escapeHtml(ds.summary_text || preview.summary_text) + '</p>';
    } else if (preview.headline) {
      html += '<p class="result-lead">' + escapeHtml(preview.headline) + '</p>';
    }
    html += '</div>';

    if (costs && costs.scenarios) {
      var pressure = costs.budget_coverage.pressure_level;
      html += '<div class="cost-grid">';
      ['essential', 'standard', 'comfortable'].forEach(function (sc) {
        var s = costs.scenarios[sc];
        var label = sc === 'essential' ? 'Essential 精简' : sc === 'standard' ? 'Standard 标准' : 'Comfortable 舒适';
        html += '<div class="cost-card' + (sc === 'standard' ? ' highlight' : '') + '">';
        html += '<div class="cost-scenario">' + label + '</div>';
        html += '<div class="cost-year">首年规划 · ' + formatUsd(s.first_planning_year_total) + '</div>';
        html += '<div class="cost-program">全程 · ' + formatUsd(s.program_total) + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '<div class="pressure-badge pressure-' + pressure + '">预算压力 · ' + (PRESSURE_LABELS[pressure] || pressure) + '</div>';
      html += '<p class="result-note">成本数字由确定性引擎（' + window.SMC.RULES_VERSION + '）计算，非学校官方报价。</p>';
    }

    if (preview.biggest_opportunity || preview.biggest_risk) {
      html += '<div class="insight-row">';
      if (preview.biggest_opportunity) {
        html += '<div class="insight-item"><strong>最大机会</strong><p>' + escapeHtml(preview.biggest_opportunity) + '</p></div>';
      }
      if (preview.biggest_risk) {
        html += '<div class="insight-item"><strong>最大风险</strong><p>' + escapeHtml(preview.biggest_risk) + '</p></div>';
      }
      html += '</div>';
    }

    root.innerHTML = html;
  }

  function renderFullReport() {
    var root = $('#full-report-body');
    if (!root) return;
    var report = state.fullReport;
    if (!report) {
      root.innerHTML = '<p class="result-note">暂无完整报告数据。</p>';
      return;
    }

    var html = '';
    if (state.fixtureMode) {
      html += '<div class="banner banner-fixture">Fixture 演示（非实时生成）</div>';
    }
    html += '<div class="report-header"><span class="result-tag">Internal Beta · 完整报告</span>';
    html += '<h2 class="result-title">Study, Major &amp; Cost Planner</h2></div>';

    var ds = report.decision_summary || {};
    html += '<section class="report-section"><h3>一、决策摘要</h3>';
    html += '<p>' + escapeHtml(ds.summary_text || '') + '</p>';
    html += '<ul class="report-list">';
    html += '<li><strong>最佳方向</strong>：' + escapeHtml(ds.best_major_direction || '') + '</li>';
    html += '<li><strong>预算压力</strong>：' + escapeHtml(PRESSURE_LABELS[ds.budget_pressure_level] || ds.budget_pressure_level || '') + '</li>';
    html += '<li><strong>下一步</strong>：' + escapeHtml(ds.most_important_next_action || '') + '</li>';
    html += '</ul></section>';

    var sp = report.student_profile || {};
    html += '<section class="report-section"><h3>二、学生画像</h3><ul class="report-list">';
    (sp.core_strengths || []).forEach(function (x) { html += '<li>' + escapeHtml(x) + '</li>'; });
    html += '</ul><p>' + escapeHtml(sp.family_student_tension || '') + '</p></section>';

    html += '<section class="report-section"><h3>三、三条专业路径</h3>';
    (report.recommended_paths || []).forEach(function (p) {
      html += '<div class="path-card"><div class="path-type">' + escapeHtml(PATH_TYPE_LABELS[p.path_type] || p.path_type) + '</div>';
      html += '<h4>' + escapeHtml(p.major_name_zh) + ' · ' + escapeHtml(p.major_name_en) + '</h4>';
      html += '<p>' + escapeHtml(p.why_fits) + '</p>';
      html += '<p class="muted">' + escapeHtml(p.why_not_perfect) + '</p>';
      html += '<p class="disclaimer-inline">' + escapeHtml(p.market_claim_disclaimer) + '</p></div>';
    });
    html += '</section>';

    (report.caution_areas || []).forEach(function (c) {
      html += '<section class="report-section caution"><h3>谨慎方向 · ' + escapeHtml(c.direction_name) + '</h3>';
      html += '<p>' + escapeHtml(c.mismatch_reason) + '</p></section>';
    });

    var co = report.cost_outlook || {};
    html += '<section class="report-section"><h3>六、完整成本分析</h3>';
    html += '<p>规划周期：' + escapeHtml(co.planning_period_type || '') + ' · 起始第 ' + (co.planning_start_year || 1) + ' 年</p>';
    html += '<div class="cost-grid">';
    ['essential', 'standard', 'comfortable'].forEach(function (sc) {
      var yr = co.annual_total_by_scenario && co.annual_total_by_scenario[sc];
      var prog = co.program_total_by_scenario && co.program_total_by_scenario[sc];
      html += '<div class="cost-card"><div class="cost-scenario">' + sc + '</div>';
      html += '<div class="cost-year">首年 · ' + formatUsd(yr) + '</div>';
      html += '<div class="cost-program">全程 · ' + formatUsd(prog) + '</div></div>';
    });
    html += '</div>';
    html += '<p class="muted">' + escapeHtml(co.family_budget_gap || '') + '</p></section>';

    var ev = report.education_value || {};
    html += '<section class="report-section"><h3>七、教育选择价值</h3><p>' + escapeHtml(ev.overall_assessment || '') + '</p>';
    html += '<p class="muted">财务回报（ROI）评估：' + (ev.financial_roi_assessed ? '已评估' : '本版本不作评估') + '</p></section>';

    var mo = report.mobility_outlook || {};
    html += '<section class="report-section"><h3>八、迁移路径</h3>';
    html += '<p>' + escapeHtml(mo.planning_scenario || mo.preferred_post_graduation_direction || '') + '</p>';
    html += '<p class="disclaimer-inline">' + escapeHtml(mo.work_authorization_assumption || '') + '</p></section>';

    var ap = report.action_plan || {};
    html += '<section class="report-section"><h3>九、12 个月行动计划</h3>';
    html += '<h4>未来 30 天</h4><ul class="report-list">';
    (ap.next_30_days || []).forEach(function (x) { html += '<li>' + escapeHtml(x) + '</li>'; });
    html += '</ul><h4>未来 90 天</h4><ul class="report-list">';
    (ap.next_90_days || []).forEach(function (x) { html += '<li>' + escapeHtml(x) + '</li>'; });
    html += '</ul><h4>未来 6–12 个月</h4><ul class="report-list">';
    (ap.next_6_to_12_months || []).forEach(function (x) { html += '<li>' + escapeHtml(x) + '</li>'; });
    html += '</ul></section>';

    var ac = report.advisor_conclusion || {};
    html += '<section class="report-section"><h3>十、顾问结论</h3>';
    html += '<p><strong>首选</strong>：' + escapeHtml(ac.preferred_option || '') + '</p>';
    html += '<p><strong>替代</strong>：' + escapeHtml(ac.alternative_option || '') + '</p>';
    html += '<p><strong>暂不建议</strong>：' + escapeHtml(ac.currently_not_recommended || '') + '</p></section>';

    html += '<section class="report-section disclaimer-block"><h3>免责声明</h3><p>' + escapeHtml(report.disclaimer || '') + '</p></section>';

    root.innerHTML = html;
  }

  function runAnalysis() {
    var validation = window.SMC.validateClientAnswers(buildSubmitPayload());
    if (!validation.ok) {
      alert('请检查问卷：\n' + validation.errors.join('\n'));
      return;
    }

    state.analyzing = true;
    showView('loading');
    state.apiError = null;
    state.fullReport = null;
    state.fixtureMode = false;

    var answers = validation.answers;
    state.costs = window.SMC.calculateCosts(answers);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        state.analyzing = false;
        if (result.ok && result.data && (result.data.ok || result.data.free || result.data.report)) {
          var data = result.data;
          state.freePreview = data.free || data.free_preview || extractFreeFromReport(data.report);
          if (data.costs) state.costs = mergeCosts(state.costs, data.costs);
          state.fullReport = data.report || null;
          state.apiError = null;
        } else {
          state.freePreview = buildLocalFreePreview(answers, state.costs);
          state.apiError = 'API 暂不可用（Internal Beta）— 已展示本地确定性成本结果。';
          if (MOCK_MODE) loadFixtureReport(false);
        }
        renderFreeResult();
        showView('free-result');
      })
      .catch(function () {
        state.analyzing = false;
        state.freePreview = buildLocalFreePreview(answers, state.costs);
        state.apiError = 'API 暂不可用（Internal Beta）— 已展示本地确定性成本结果。';
        renderFreeResult();
        showView('free-result');
      });
  }

  function extractFreeFromReport(report) {
    if (!report || !report.decision_summary) return null;
    return report.decision_summary;
  }

  function mergeCosts(local, api) {
    if (!api || !api.scenarios) return local;
    return local;
  }

  function buildLocalFreePreview(answers, costs) {
    return {
      summary_text: '已完成本地确定性成本分析。完整 AI 报告需 Internal Beta API；您可查看完整报告按钮获取 API 或 Fixture 演示内容。',
      best_major_direction: '分析预览（本地成本引擎）',
      budget_pressure_level: costs.budget_coverage.pressure_level,
    };
  }

  function loadFixtureReport(showFull) {
    return fetch(FIXTURE_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.fullReport = data;
        state.fixtureMode = true;
        if (showFull !== false) {
          renderFullReport();
          showView('full-report');
        }
        return data;
      });
  }

  function requestFullReport() {
    if (state.fullReport && !state.fixtureMode) {
      renderFullReport();
      showView('full-report');
      return;
    }
    showView('loading');
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: buildSubmitPayload(), full: true }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok && result.data && result.data.report) {
          state.fullReport = result.data.report;
          state.fixtureMode = false;
          renderFullReport();
          showView('full-report');
        } else {
          return loadFixtureReport(true);
        }
      })
      .catch(function () {
        return loadFixtureReport(true);
      });
  }

  function bindGlobalEvents() {
    var startBtn = $('#btn-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        showView('questionnaire');
        renderQuestionnaire();
      });
    }

    var clearBtn = $('#btn-clear-draft');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (confirm('确定清除本地草稿并重新开始？')) clearDraft();
      });
    }

    var prevBtn = $('#btn-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (state.currentStep > 1) {
          state.currentStep--;
          renderQuestionnaire();
        }
      });
    }

    var nextBtn = $('#btn-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (!stepComplete(state.currentStep)) return;
        if (state.currentStep >= 7) runAnalysis();
        else {
          state.currentStep++;
          renderQuestionnaire();
        }
      });
    }

    var fullBtn = $('#btn-full-report');
    if (fullBtn) fullBtn.addEventListener('click', requestFullReport);

    var backFreeBtn = $('#btn-back-free');
    if (backFreeBtn) {
      backFreeBtn.addEventListener('click', function () {
        renderFreeResult();
        showView('free-result');
      });
    }

    var backQuestBtn = $('#btn-back-questionnaire');
    if (backQuestBtn) {
      backQuestBtn.addEventListener('click', function () {
        showView('questionnaire');
        renderQuestionnaire();
      });
    }

    $$('.step-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        var n = Number(dot.getAttribute('data-step'));
        if (n <= state.currentStep) {
          state.currentStep = n;
          renderQuestionnaire();
        }
      });
    });
  }

  function initNav() {
    var menuBtn = document.getElementById('menuBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', function () {
        var open = mobileMenu.classList.toggle('open');
        menuBtn.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
    }
    window.closeMenu = function () {
      if (!mobileMenu || !menuBtn) return;
      mobileMenu.classList.remove('open');
      menuBtn.classList.remove('open');
      document.body.style.overflow = '';
    };
    var email = null;
    try { email = localStorage.getItem('mc_email'); } catch (e) { /* ignore */ }
    var navCta = document.getElementById('nav-main-cta');
    if (email && navCta) {
      navCta.textContent = 'My Dashboard';
      navCta.href = '/member';
      navCta.classList.add('is-member');
    }
  }

  /** Internal Beta / local QA only when ?mock=1 — does not expose prompts. */
  if (MOCK_MODE) {
    window.__SMC_DEMO = {
      showFreeFromAnswers: function (answers) {
        var validation = window.SMC.validateClientAnswers(answers);
        if (!validation.ok) return validation;
        state.answers = validation.answers;
        state.costs = window.SMC.calculateCosts(validation.answers);
        state.freePreview = buildLocalFreePreview(validation.answers, state.costs);
        state.apiError = null;
        state.fixtureMode = false;
        renderFreeResult();
        showView('free-result');
        return { ok: true };
      },
      showFullFixture: function () {
        return loadFixtureReport(true);
      },
    };
  }

  function init() {
    state.answers = defaultAnswers();
    loadDraft();
    bindGlobalEvents();
    initNav();
    showView('landing');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
