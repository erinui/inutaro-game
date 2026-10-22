#!/usr/bin/env bash
# Install the verified runtime before running npm, Wrangler, or project code.
set -euo pipefail
cd "$(dirname "$0")/.."
version="$(tr -d '\r\n' < .node-version)"
if [[ "$version" != '24.22.1' ]]; then
  echo 'Update the official archive checksums when changing .node-version.' >&2
  exit 1
fi
case "$(uname -s):$(uname -m)" in
  Linux:x86_64)
    platform='linux-x64'
    expected='6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6'
    archive="node-v${version}-${platform}.tar.xz"
    ;;
  Darwin:arm64)
    platform='darwin-arm64'
    expected='89c682593d76cd44233fa53b1563264e7de9cbb189cad169135c5b4fadfbc0a7'
    archive="node-v${version}-${platform}.tar.gz"
    ;;
  *) echo 'Unsupported runtime installation platform.' >&2; exit 1 ;;
esac
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != '--verify-only' ) ]]; then
  echo 'Usage: deploy-cloudflare.sh [--verify-only]' >&2
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
npx --yes wrangler deploy
