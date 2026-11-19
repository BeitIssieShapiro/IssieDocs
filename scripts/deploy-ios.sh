#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Match the shared Android deployer's use of Homebrew Ruby on macOS.
for ruby_bin in /opt/homebrew/opt/ruby/bin /usr/local/opt/ruby/bin; do
  if [[ -x "$ruby_bin/ruby" ]]; then
    export PATH="$ruby_bin:$PATH"
    break
  fi
done

export BUNDLE_GEMFILE="$PROJECT_ROOT/ios/Gemfile"
export BUNDLE_PATH="${BUNDLE_PATH:-$PROJECT_ROOT/vendor/bundle/ios}"
cd "$PROJECT_ROOT/ios"
bundle check || bundle install

lane="${1:-beta}"
if [[ $# -gt 0 ]]; then shift; fi
exec bundle exec fastlane ios "$lane" "$@"
