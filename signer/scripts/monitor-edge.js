/**
 * `npm run monitor:edge` — alarm eksternal untuk B67: "tepi tidak tahu kalau ia sendirian".
 *
 * Kenapa ini ada: `worker.mjs` sudah benar — ia MENOLAK menyajikan daftar yang tidak cocok dengan
 * chain (`x-lencana-stale: chain-diverged`) atau yang belum terbit (`not-published`). Tapi menolak
 * sambil diam itu bukan alarm: yang tahu pertama kali adalah orang asing yang membuka URL-nya,
 * bukan kami. Kalau `npm run publish:edge` berhenti (workflow gagal, token kedaluwarsa, KV dibersihkan),
 * dokumen lama tetap tersaji dan tetap bertanda tangan sah — jadi tidak ada satu pun sinyal yang
 * menyala di pihak kami.
 *
 * Yang diperiksa, dan apa yang membuatnya berarti (bukan sekadar ping):
 *   - `/healthz` harus 200 dan `ok:true`;
 *   - `publishedAt` umur state: kalau lebih tua dari `--max-age` (bawaan 26 jam — publish harian +
 *     kelonggaran), itu TERLALU TUA. Angka ini adalah umur, bukan ambang yang diturunkan diam-diam;
 *   - kedua daftar status harus 200 dan TIDAK membawa `x-lencana-stale`;
 *   - satu dokumen kredensial nyata (dibaca dari `decisions/`? tidak — dari `/healthz`'s own list)
 *     harus 200, karena "edge hidup tapi kertasnya hilang" adalah kegagalan yang berbeda;
 *   - `watched` harus > 0: tepi yang sehat tapi tidak memantau apa pun itu bukan sehat.
 *
 * mode:
 *   npm run monitor:edge                     → sekali, keluar 0 (aman) / 1 (ALARM)
 *   npm run monitor:edge -- --max-age=26     → ambang umur dalam JAM
 *   npm run monitor:edge -- --json           → keluaran mesin (buat workflow/monitor)
 *
 * Ini perkakas baca-saja. Tidak ada transaksi, tidak ada publish, tidak ada tulis-menulis.
 */

// Lencana-B67 status=SELESAI 2026-09-29 — alarm EKSTERNAL tepi (umur publishedAt, matchesChainNow, unchecked) — jangan turunkan ambang diam-diam. Buktikan ulang: npm run monitor:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B67 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
const EDGE = (process.env.EDGE_BASE_URL ?? 'https://lencana-edge.hansgunawan775.workers.dev').replace(/\/$/, '')
const JSON_OUT = process.argv.includes('--json')
const argNum = (name, def) => {
  const a = process.argv.find((s) => s.startsWith(`--${name}=`))
  return a ? Number(a.split('=')[1]) : def
}
const MAX_AGE_HOURS = argNum('max-age', 26)

const get = async (path) => {
  try {
    const r = await fetch(`${EDGE}${path}`, { signal: AbortSignal.timeout(15000) })
    let body = null
    try { body = await r.json() } catch { /* bukan JSON: diperlakukan sebagai gagal di bawah */ }
    return { status: r.status, body, stale: r.headers.get('x-lencana-stale'), ctype: r.headers.get('content-type') ?? '' }
  } catch (e) {
    return { status: `gagal ${String(e?.name ?? e?.code ?? e)}`, body: null, stale: null, ctype: '' }
  }
}

const alarms = []
const notes = []
const health = await get('/healthz')
if (health.status !== 200 || health.body?.ok !== true) {
  alarms.push(`healthz: HTTP ${health.status}${health.status === 200 ? ' tapi ok:' + JSON.stringify(health.body?.ok) : ''}`)
} else {
  // Bentuk `/healthz` TEPI berbeda dari signer lokal, dan alarm pertama monitor ini adalah tembakan
  // palsu hasil sangkaan itu (`watched` top-level tidak ada di tepi). Yang nyata, terukur 29 Sep:
  //   { ok, edge, baseUrl, resolver, rpc, publishedAt, agentSlug, issuerDocument, listBits,
  //     counts: { watchedHashes, credentialsWithDocument, records, courses, results, manifests },
  //     revocation: { hash, watched, flagged, matchesChainNow, checked, unchecked }, suspension: {...} }
  const counts = health.body.counts ?? {}
  notes.push(`healthz ok · resolver ${String(health.body.resolver).slice(0, 10)}… · rpc ${health.body.rpc ? 'diisi' : '(kosong)'} · `
    + `watchedHashes=${counts.watchedHashes} · denganDokumen=${counts.credentialsWithDocument} · listBits=${health.body.listBits}`)
  if (!Number.isFinite(counts.watchedHashes) || counts.watchedHashes <= 0) {
    alarms.push(`counts.watchedHashes=${counts.watchedHashes} — state tepi tidak membawa apa pun untuk dipantau`)
  }
  if (Number.isFinite(counts.credentialsWithDocument) && counts.credentialsWithDocument <= 0) {
    alarms.push(`counts.credentialsWithDocument=${counts.credentialsWithDocument} — tepi hidup tapi tidak ada kertas yang bisa dibuka orang`)
  }
  for (const purpose of ['revocation', 'suspension']) {
    const l = health.body[purpose]
    if (!l) { alarms.push(`healthz tidak melaporkan daftar ${purpose} sama sekali`); continue }
    if (l.matchesChainNow !== true) alarms.push(`${purpose}: matchesChainNow=${JSON.stringify(l.matchesChainNow)} — daftar sajian tidak cocok dengan chain SEKARANG`)
    if (Number.isFinite(l.unchecked) && l.unchecked > 0) notes.push(`${purpose}: ${l.unchecked} hash TIDAK sempat diperiksa (checked ${l.checked}/${l.watched}) — ini bukan lulus penuh`)
    else notes.push(`${purpose}: matchesChainNow=true · checked ${l.checked}/${l.watched} · flagged=${l.flagged}`)
  }
  const publishedAt = health.body.publishedAt ?? null
  const t = Date.parse(String(publishedAt ?? ''))
  if (!Number.isFinite(t)) alarms.push(`publishedAt tidak terbaca (${JSON.stringify(publishedAt)}) — umur state tidak bisa disimpulkan, jadi TIDAK dianggap aman`)
  else {
    const ageH = (Date.now() - t) / 3.6e6
    notes.push(`state dipublikasikan ${publishedAt} (umur ${ageH.toFixed(1)} jam)`)
    if (ageH > MAX_AGE_HOURS) alarms.push(`state TUA: ${ageH.toFixed(1)} jam > ambang ${MAX_AGE_HOURS} jam — publish:edge berhenti/kegagalan CI`)
    if (ageH < -1) alarms.push(`publishedAt di MASA DEPAN (${ageH.toFixed(1)} jam) — jam tepi/publisher tidak cocok`)
  }
}

for (const purpose of ['revocation', 'suspension']) {
  const l = await get(`/credentials/status/${purpose}`)
  if (l.status !== 200) alarms.push(`daftar ${purpose}: HTTP ${l.status}`)
  else if (l.stale) alarms.push(`daftar ${purpose}: disajikan dengan x-lencana-stale=${l.stale}`)
  else notes.push(`daftar ${purpose}: 200, tanpa header stale`)
}

// Sampel dokumen: diambil dari store lokal kalau ada (jadi angkanya dicetak alat, bukan dihafal);
// di CI tanpa store, isi MONITOR_CREDENTIAL_HASH. Kalau dua-duanya kosong, ini ditulis sebagai
// TIDAK DIUJI — bukan sebagai lulus.
let SAMPLE = (process.env.MONITOR_CREDENTIAL_HASH ?? '').trim()
if (!SAMPLE) {
  try {
    const { readFileSync } = await import('node:fs')
    const { join, resolve, dirname } = await import('node:path')
    const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
    const st = JSON.parse(readFileSync(join(resolve(here, '..'), '.store', 'state.json'), 'utf8'))
    const h = Object.values(st.credentials ?? {}).map((c) => String(c.credentialHash ?? '').toLowerCase()).find((x) => /^0x[0-9a-f]{64}$/.test(x))
    if (h) SAMPLE = h
  } catch { /* tidak apa: dilaporkan sebagai tidak diuji */ }
}
if (/^0x[0-9a-f]{64}$/i.test(SAMPLE)) {
  const d = await get(`/credentials/${SAMPLE.toLowerCase()}`)
  if (d.status !== 200) alarms.push(`dokumen ${SAMPLE.slice(0, 10)}…: HTTP ${d.status}`)
  else if (!/application\/json/.test(d.ctype)) alarms.push(`dokumen ${SAMPLE.slice(0, 10)}…: HTTP 200 tapi content-type ${d.ctype}`)
  else notes.push(`satu dokumen kredensial (${SAMPLE.slice(0, 10)}…): 200 JSON`)
} else notes.push('TIDAK DIUJI: pemeriksaan satu dokumen (store lokal tidak ada & MONITOR_CREDENTIAL_HASH kosong)')

const payload = {
  checkedAt: new Date().toISOString(), edge: EDGE, maxAgeHours: MAX_AGE_HOURS,
  alarms, notes, verdict: alarms.length ? 'ALARM' : 'AMAN',
}
if (JSON_OUT) console.log(JSON.stringify(payload, null, 2))
else {
  console.log(`\nmonitor:edge — ${EDGE}`)
  for (const n of payload.notes) console.log(`  · ${n}`)
  if (alarms.length) { console.log('\n  ALARM (B67):'); for (const a of alarms) console.log(`    ! ${a}`) }
  else console.log('\n  AMAN — tidak ada alarm; catat bahwa pemeriksaan yang dilewati tertulis di atas, tidak dihitung sebagai lulus')
}
process.exitCode = alarms.length ? 1 : 0
