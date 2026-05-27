#!/bin/bash
# run_nav_patches.sh
# 一键运行所有导航补丁，并输出 git diff 摘要
# 运行前请确保在仓库根目录，且已切换到 dev 分支
#
# 使用方式：
#   git checkout dev
#   bash patches/run_nav_patches.sh

set -e  # 任一步骤失败立即停止

PATCH_DIR="$(dirname "$0")"

echo "================================================"
echo "  MovingCOST.ai 导航统一 — Patch Runner"
echo "  当前分支: $(git branch --show-current)"
echo "================================================"
echo ""

# 确认在 dev 分支
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "dev" ]; then
  echo "⚠ 警告：当前不在 dev 分支（当前：$BRANCH）"
  echo "  建议先运行: git checkout dev"
  read -p "  确认继续？(y/N) " confirm
  if [ "$confirm" != "y" ]; then
    echo "已取消"
    exit 1
  fi
fi

echo "▶ 运行 patch_index_nav.py ..."
python3 "$PATCH_DIR/patch_index_nav.py"
echo ""

echo "▶ 运行 patch_planner_nav.py ..."
python3 "$PATCH_DIR/patch_planner_nav.py"
echo ""

echo "▶ 运行 patch_quiz_nav.py ..."
python3 "$PATCH_DIR/patch_quiz_nav.py"
echo ""

echo "================================================"
echo "  Git Diff 摘要"
echo "================================================"
git diff --stat index.html planner.html quiz.html
echo ""

echo "================================================"
echo "  关键词检查"
echo "================================================"
echo "✅ index.html nav-main-cta 数量：$(grep -c 'nav-main-cta' index.html || echo 0)"
echo "✅ index.html nav-member-link 数量：$(grep -c 'nav-member-link' index.html || echo 0)"
echo "✅ planner.html nav-links 残留（应为 0）：$(grep -c 'nav-links' planner.html || echo 0)"
echo "✅ quiz.html quiz-member-link 数量：$(grep -c 'quiz-member-link' quiz.html || echo 0)"
echo ""

echo "================================================"
echo "  下一步"
echo "================================================"
echo "  1. git diff index.html planner.html quiz.html  （详细确认）"
echo "  2. git add index.html planner.html quiz.html"
echo "  3. git commit -m 'nav: unify navigation v1 - dynamic member CTA'"
echo "  4. git push origin dev"
echo "  5. 在 Vercel Preview 预览测试"
echo "  6. 测试通过后合并 main"
echo ""
echo "🎉 所有补丁运行完毕！"
