#!/usr/bin/env bash
# Builds @angular/flex-layout, then publishes the tarball as a tagged commit (tarball only, no
# history) of this repository's origin. npm downloads it from raw.githubusercontent.com. Published
# tags are never replaced, because lockfiles pin the tarball hash: to publish a new build, bump the
# version in src/lib/package.json and src/lib/version.ts (10.0.0-beta.32-ng22.1, ...).
set -euo pipefail
cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit your changes first: a published build must match a commit." >&2
  exit 1
fi
version=$(node -p "require('./src/lib/package.json').version")
if ! grep -qF "'$version'" src/lib/version.ts; then
  echo "src/lib/version.ts doesn't match version $version of src/lib/package.json." >&2
  exit 1
fi
tag=dist-$version
repo=$(git remote get-url origin | sed -E 's#^(git@github\.com:|https://github\.com/)##; s#\.git$##')
if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null; then
  echo "$tag is already published: bump the version." >&2
  exit 1
fi

npm ci && npm run build

tarball=angular-flex-layout-$version.tgz
tree=$(printf '100644 blob %s\t%s\n' "$(git hash-object -w "dist/$tarball")" "$tarball" | git mktree)
commit=$(git commit-tree "$tree" -m "$tag (built from $(git rev-parse --short HEAD))")
git push origin "$commit:refs/tags/$tag"

echo
echo "Published. In the application's package.json:"
echo "  \"@angular/flex-layout\": \"https://raw.githubusercontent.com/$repo/$tag/$tarball\""
