#!/usr/bin/env python3
"""
patch_planner_nav.py
目标：planner.html 流程页导航极简化
改动：
  1. 删除 nav-links 完整菜单（流程页不应有完整导航）
  2. 简化移动端菜单为 Home + My Dashboard（条件显示）
  3. 注入移动菜单动态状态 JS

运行方式：
  cd /path/to/movingcost-ai
  python3 patches/patch_planner_nav.py
"""

import shutil, sys
from pathlib import Path

TARGET = Path("planner.html")

if not TARGET.exists():
    print(f"❌ 找不到 {TARGET}，请在仓库根目录运行此脚本")
    sys.exit(1)

bak = TARGET.with_suffix(".html.bak")
shutil.copy2(TARGET, bak)
print(f"✅ 已备份 → {bak}")

html = TARGET.read_text(encoding="utf-8")
total = 0

# ── Patch 1：删除桌面端完整 nav-links ────────────────────────────
OLD1 = (
    '    <div class="nav-links">\n'
    '        <a href="/">Home</a>\n'
    '        <a href="/#tools">AI Tools</a>\n'
    '        <a href="/">Cities</a>\n'
    '        <a href="/">Routes</a>\n'
    '        <a href="/#guides">Guides</a>\n'
    '        <a href="/#services">Services</a>\n'
    '        <a href="/blog">Blog</a>\n'
    '        <a href="/about">About</a>\n'
    '      </div>'
)
NEW1 = ""  # 完全删除，流程页不需要完整菜单

if OLD1 not in html:
    print("❌ Patch 1 失败：找不到 planner.html nav-links 完整文本")
    sys.exit(1)

html = html.replace(OLD1, NEW1, 1)
total += 1
print("✅ Patch 1：删除桌面端完整 nav-links 成功")

# ── Patch 2：简化移动端菜单 ──────────────────────────────────────
OLD2 = (
    '<div class="nav-mobile" id="mobileMenu">\n'
    '  <a href="/" onclick="closeMenu()">Home</a>\n'
    '  <a href="/#tools" onclick="closeMenu()">AI Tools</a>\n'
    '  <a href="/" onclick="closeMenu()">Cities</a>\n'
    '  <a href="/" onclick="closeMenu()">Routes</a>\n'
    '  <a href="/#guides" onclick="closeMenu()">Guides</a>\n'
    '  <a href="/#services" onclick="closeMenu()">Services</a>\n'
    '  <a href="/blog" onclick="closeMenu()">Blog</a>\n'
    '  <a href="/about" onclick="closeMenu()">About</a>\n'
    '  <a href="/planner" class="mobile-cta" onclick="closeMenu()">Start Free Plan \u2192</a>\n'
    '</div>'
)
NEW2 = (
    '<div class="nav-mobile" id="mobileMenu">\n'
    '  <a href="/" onclick="closeMenu()">\u2190 Back to Home</a>\n'
    '  <a href="/member" id="planner-mobile-member" '
    'style="display:none;color:var(--blue);font-weight:600" '
    'onclick="closeMenu()">My Dashboard</a>\n'
    '</div>'
)

if OLD2 not in html:
    print("❌ Patch 2 失败：找不到 planner.html 移动菜单原始文本")
    sys.exit(1)

html = html.replace(OLD2, NEW2, 1)
total += 1
print("✅ Patch 2：移动端菜单简化成功")

# ── Patch 3：注入移动菜单动态 JS ─────────────────────────────────
NAV_JS = """
<script>
/* ── planner.html 导航：已绑定邮箱 → 显示 My Dashboard ── */
(function(){
  var email = null;
  try{ email = localStorage.getItem('mc_email'); }catch(e){}
  if(email){
    var el = document.getElementById('planner-mobile-member');
    if(el) el.style.display = 'block';
  }
})();
</script>
"""

if "planner-mobile-member" in html and NAV_JS.strip() not in html:
    html = html.replace("</body>", NAV_JS + "</body>", 1)
    total += 1
    print("✅ Patch 3：导航状态 JS 注入成功")
else:
    print("⚠ Patch 3：JS 已存在或条件不满足，跳过")

TARGET.write_text(html, encoding="utf-8")
print(f"\n🎉 完成！共 {total} 处替换。运行 git diff planner.html 确认改动。")
