#!/bin/sh
# Lencana-B154 status=TERBUKA 2026-10-05 — start signer di Railway: kunci daftar status khusus cloud (AGENT_KEY_JSON_B64) ditulis ke signer/.keys/<AGENT_SLUG>.json saat start, lalu variabelnya dibuang dari lingkungan server; image tidak pernah memuat kunci. Buktikan ulang: /catalog/published + /healthz 200 dari domain Railway (vault B154). JANGAN dibalik/diulang tanpa membuka kembali baris B154 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
set -eu
cd "$(dirname "$0")/.."

SLUG="${AGENT_SLUG:?AGENT_SLUG wajib diisi: server mati tanpa signer/.keys/<AGENT_SLUG>.json}"
if [ -n "${AGENT_KEY_JSON_B64:-}" ]; then
  mkdir -p .keys
  umask 077
  printf '%s' "$AGENT_KEY_JSON_B64" | base64 -d > ".keys/$SLUG.json"
fi
unset AGENT_KEY_JSON_B64

exec ./node_modules/.bin/tsx src/server.js
