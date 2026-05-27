#!/usr/bin/env python3
"""
patch_index_nav.py
目标：index.html 主站导航动态化
改动：
  1. nav-cta 加 id="nav-main-cta"
  2. nav-links 末尾加 My Dashboard 隐藏链接
  3. 移动菜单末尾加 My Dashboard 选项
  4. 页面底部 </body> 前注入导航状态 JS

运行方式：
  cd /path/to/movingcost-ai
  python3 patches/patch_index_nav.py
"""

import shutil, sys, re
from pathlib import Path

TARGET = Path("index.html")

# ── 检查文件存在 ──────────────────────────────────────────────────
if not TARGET.exists():
    print(f"❌ 找不到 {TARGET}，请在仓库根目录运行此脚本")
    sys.exit(1)

# ── 备份 ─────────────────────────────────────────────────────────
bak = TARGET.with_suffix(".html.bak")
shutil.copy2(TARGET, bak)
print(f"✅ 已备份 → {bak}")

html = TARGET.read_text(encoding="utf-8")
total = 0

# ── Patch 1：nav-cta 加 id ────────────────────────────────────────
OLD1 = '<a href="/planner" class="nav-cta">Start Free Plan &#x2192;</a>'
NEW1 = '<a href="/planner" class="nav-cta" id="nav-main-cta">Start Free Plan &#x2192;</a>'

if OLD1 not in html:
    print("❌ Patch 1 失败：找不到 nav-cta 原始文本，请检查 index.html")
    sys.exit(1)

html = html.replace(OLD1, NEW1, 1)
total += 1
print("✅ Patch 1：nav-cta 加 id 成功")

# ── Patch 2：nav-links 末尾加 My Dashboard 链接 ────────────────────
OLD2 = '        <a href="/about">About</a>\n      </div>'
NEW2 = (
    '        <a href="/about">About</a>\n'
    '        <a href="/member" id="nav-member-link" '
    'style="display:none;color:var(--blue);font-weight:700">My Dashboard</a>\n'
    '      </div>'
)

if OLD2 not in html:
    print("❌ Patch 2 失败：找不到 nav-links About 结束文本")
    sys.exit(1)

html = html.replace(OLD2, NEW2, 1)
total += 1
print("✅ Patch 2：nav-links 加 My Dashboard 隐藏链接成功")

# ── Patch 3：移动菜单加 My Dashboard 选项 ────────────────────────
OLD3 = '  <a href="/planner" class="mobile-cta" onclick="closeMenu()">Start Free Plan &#x2192;</a>\n</div>'
NEW3 = (
    '  <a href="/member" id="mobile-member-cta" '
    'style="display:none;font-size:18px;font-weight:600;color:var(--blue);'
    'padding:14px 0;border-bottom:1px solid var(--border)" '
    'onclick="closeMenu()">My Dashboard →</a>\n'
    '  <a href="/planner" class="mobile-cta" id="mobile-main-cta" '
    'onclick="closeMenu()">Start Free Plan &#x2192;</a>\n'
    '</div>'
)

if OLD3 not in html:
    print("❌ Patch 3 失败：找不到移动菜单 mobile-cta 文本")
    sys.exit(1)

html = html.replace(OLD3, NEW3, 1)
total += 1
print("✅ Patch 3：移动菜单加 My Dashboard 成功")

# ── Patch 4：注入导航状态 JS（在第一个 </script> 前的最后 </body> 注入）──
NAV_JS = """
<script>
/* ── 导航动态状态：已绑定邮箱 → 显示 My Dashboard ── */
(function(){
  var email = null;
  try{ email = localStorage.getItem('mc_email'); }catch(e){}
  if(email){
    var navCta = document.getElementById('nav-main-cta');
    if(navCta){ navCta.textContent = 'My Dashboard →'; navCta.href = '/member'; }
    var memberLink = document.getElementById('nav-member-link');
    if(memberLink) memberLink.style.display = 'inline';
    var mobileMember = document.getElementById('mobile-member-cta');
    if(mobileMember) mobileMember.style.display = 'block';
    var mobileCta = document.getElementById('mobile-main-cta');
    if(mobileCta){ mobileCta.textContent = 'My Dashboard →'; mobileCta.href = '/member'; }
  }
})();
</script>
"""

if "nav-main-cta" in html and NAV_JS.strip() not in html:
    html = html.replace("</body>", NAV_JS + "</body>", 1)
    total += 1
    print("✅ Patch 4：导航状态 JS 注入成功")
else:
    print("⚠ Patch 4：JS 已存在，跳过")

# ── 写入 ─────────────────────────────────────────────────────────
TARGET.write_text(html, encoding="utf-8")
print(f"\n🎉 完成！共 {total} 处替换。运行 git diff index.html 确认改动。")
