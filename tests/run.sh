#!/bin/sh
# Run every spec suite sequentially; exit non-zero if any assertion failed.
# Audits (contrast, mobile sweep) live in tests/audits/ and run separately.
cd "$(dirname "$0")/.."
fail=0
for f in tests/*.spec.js; do
  echo "=== $f"
  node "$f" || fail=1
done
exit $fail
