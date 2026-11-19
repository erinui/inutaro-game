#!/usr/bin/env bash
# Install the verified runtime before running npm, Wrangler, or project code.
set -euo pipefail
cd "$(dirname "$0")/.."
version="$(tr -d '\r\n' < .node-version)"
if [[ "$version" != '24.22.3' ]]; then
  echo 'Update the official archive checksums when changing .node-version.' >&2
  exit 1
fi
case "$(uname -s):$(uname -m)" in
  Linux:x86_64)
    platform='linux-x64'
    expected='4f2b175a6d53a5c617a80dba2676238a0688cef28c6da4eba35c7d844e66fcfb'
    archive="node-v${version}-${platform}.tar.xz"
    ;;
  Darwin:arm64)
    platform='darwin-arm64'
    expected='ff6e17d4874b76d272212b908cc020d6e815fba5a6c7eaaa06add725840307fd'
    archive="node-v${version}-${platform}.tar.gz"
    ;;
  *) echo 'Unsupported runtime installation platform.' >&2; exit 1 ;;
esac
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != '--verify-only' && "$1" != '--preview' ) ]]; then
  echo 'Usage: deploy-cloudflare.sh [--verify-only|--preview]' >&2
  exit 1
fi
runtime_dir="$(mktemp -d "${TMPDIR:-/tmp}/inutaro-node-runtime.XXXXXX")"
trap 'rm -rf "$runtime_dir"' EXIT
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  --retry 3 --max-time 120 "https://nodejs.org/dist/v${version}/${archive}" \
  --output "$runtime_dir/$archive"
if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$runtime_dir/$archive")"
else
  actual="$(shasum -a 256 "$runtime_dir/$archive")"
fi
if [[ "${actual%% *}" != "$expected" ]]; then
  echo 'Official Node.js archive checksum mismatch; stopping before execution.' >&2
  exit 1
fi
echo "Official Node.js ${version} ${platform} SHA-256 verified."
tar -xf "$runtime_dir/$archive" -C "$runtime_dir"
export PATH="$runtime_dir/node-v${version}-${platform}/bin:$PATH"
node scripts/check-node-version.mjs
if [[ "${1:-}" == '--verify-only' ]]; then
  echo 'Verified Node.js runtime installation; deployment was not requested.'
  exit 0
fi
npm ci --prefix tools/deploy --ignore-scripts --no-fund
if [[ "${1:-}" == '--preview' ]]; then
  node tools/deploy/node_modules/wrangler/bin/wrangler.js preview
else
  node tools/deploy/node_modules/wrangler/bin/wrangler.js deploy
fi
