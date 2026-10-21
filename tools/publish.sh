#!/usr/bin/env bash
# Publish the app/ folder to GitHub Pages (gh-pages branch). Run after committing changes on main.
#   tools/publish.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git diff --quiet && git diff --cached --quiet || { echo "commit or stash your changes first"; exit 1; }
git push origin main
tree=$(git rev-parse HEAD:app)
parent=$(git rev-parse -q --verify refs/remotes/origin/gh-pages 2>/dev/null || true)
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "Publish app from $(git rev-parse --short HEAD)")
git update-ref refs/heads/gh-pages "$commit"
git push --force origin gh-pages
echo "published: https://keauk.github.io/trakia/  (allow a minute for Pages to rebuild)"
