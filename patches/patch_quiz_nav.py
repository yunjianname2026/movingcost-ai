#!/usr/bin/env python3
"""
patch_quiz_nav.py
目标：quiz.html 导航加 My Dashboard 入口
改动：
  1. nav 右侧加隐藏的 My Dashboard 按钮（已绑定邮箱时显示）
  2. 注入动态状态 JS

运行方式：
  cd /path/to/movingcost-ai
  python3 patches/patch_quiz_nav.py
"""

import shutil, sys
from pathlib import Path

TARGET = Path("quiz.html")

if not TARGET.exists():
    print(f"❌ 找不到 {TARGET}，请在仓库根目录运行此脚本")
    sys.exit(1)

bak = TARGET.with_suffix(".html.bak")
shutil.copy2(TARGET, bak)
print(f"✅ 已备份 → {bak}")

html = TARGET.read_text(encoding="utf-8")
total = 0

# ── Patch 1：nav 右侧加 My Dashboard ─────────────────────────────
OLD1 = (
    '<nav class="nav">\n'
    '  <a href="/" class="nav-logo">Moving<span class="ac">COST</span>.ai</a>\n'
    '  <span class="nav-pill">EarthSoul Quiz</span>\n'
    '</nav>'
)
NEW1 = (
    '<nav class="nav">\n'
    '  <a href="/" class="nav-logo">Moving<span class="ac">COST</span>.ai</a>\n'
    '  <div style="display:flex;align-items:center;gap:12px">\n'
    '    <a href="/member" id="quiz-member-link"\n'
    '       style="display:none;font-family:\'Outfit\',sans-serif;font-size:12px;'
    'font-weight:700;color:var(--blue);text-decoration:none;padding:5px 14px;'
    'border-radius:99px;background:var(--blue-dim);border:1px solid rgba(14,165,233,0.2)">\n'
    '      My Dashboard\n'
    '    </a>\n'
    '    <span class="nav-pill">EarthSoul Quiz</span>\n'
    '  </div>\n'
    '</nav>'
)

if OLD1 not in html:
    print("❌ Patch 1 失败：找不到 quiz.html nav 原始文本")
    sys.exit(1)

html = html.replace(OLD1, NEW1, 1)
total += 1
print("✅ Patch 1：nav 加 My Dashboard 链接成功")

# ── Patch 2：注入动态状态 JS ──────────────────────────────────────
NAV_JS = """
<script>
/* ── quiz.html 导航：已绑定邮箱 → 显示 My Dashboard ── */
(function(){
  var email = null;
  try{ email = localStorage.getItem('mc_email'); }catch(e){}
  if(email){
    var link = document.getElementById('quiz-member-link');
    if(link) link.style.display = 'inline-flex';
  }
})();
</script>
"""

if "quiz-member-link" in html and NAV_JS.strip() not in html:
    html = html.replace("</body>", NAV_JS + "</body>", 1)
    total += 1
    print("✅ Patch 2：动态状态 JS 注入成功")
else:
    print("⚠ Patch 2：JS 已存在，跳过")

TARGET.write_text(html, encoding="utf-8")
print(f"\n🎉 完成！共 {total} 处替换。运行 git diff quiz.html 确认改动。")
