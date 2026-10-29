#!/usr/bin/env bash
set -euo pipefail
cd /srv/jekyll
bundle check
bundle exec ruby bin/sync_archives.rb
exec bundle exec jekyll serve --host 0.0.0.0 --port 8080 --livereload --force_polling
