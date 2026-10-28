#!/bin/sh
# Writes /config.json at container start, before nginx starts, from every
# PLATFORM_* setting and every setting whose name starts with PUBLIC_, and
# nothing else, so no secret reaches the browser. The site reads it in
# src/lib/config.ts. One image runs in every Environment this way.
set -eu

out=/usr/share/nginx/config/config.json

awk '
  function quote(s) {
    gsub(/\\/, "\\\\", s)
    gsub(/"/, "\\\"", s)
    gsub(/\n/, "\\n", s)
    gsub(/\r/, "\\r", s)
    gsub(/\t/, "\\t", s)
    return "\"" s "\""
  }
  BEGIN {
    printf "{"
    sep = ""
    for (name in ENVIRON) {
      if (name ~ /^(PLATFORM|PUBLIC)_[A-Za-z0-9_]+$/) {
        printf "%s%s:%s", sep, quote(name), quote(ENVIRON[name])
        sep = ","
      }
    }
    print "}"
  }
' > "$out"

echo "$0: wrote $out"
