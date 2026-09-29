/**
 * Matriks kepatuhan OB3.0/VC2.0 — **dihitung dari dokumen yang diambil, bukan ditulis tetap.**
 *
 * Kenapa berkas ini ada (29 Sep, mengukur `render.ts` lama): tabel 14 barisnya menulis
 * `status: 'PASS'` sebagai teks, dan yang dijudis adalah dokumen yang **kami karang di browser**
 * (`generateCanonicalJsonLd`) — lengkap dengan `proofValue` yang tidak pernah ditandatangani siapa
 * pun dan `statusListIndex: "14"` yang bukan milik kredensial mana pun. Header-nya menjual
 * "14 / 14 ASSERTIONS PASSED", tombolnya hanya menyalakan kelas CSS dengan `setTimeout`.
 * Diukur 29 Sep terhadap dokumen yang benar-benar terbit: `credentialStatus` kita **satu entri**
 * (revocation), bukan dua — jadi klaim "exactly 2 status entries" bahkan tidak benar untuk
 * artefak kami sendiri. Halaman yang bilang "lulus 14/14" tanpa menjalankan satu pun uji adalah
 * cara tercepat kehilangan kepercayaan juri yang membuka `/credentials/<hash>` di tab sebelah.
 *
 * Aturan yang dipegang di sini:
 *  - baris hanya hijau kalau predikatnya benar-benar dievaluasi terhadap dokumen yang diaih;
 *  - dokumen tidak teraih ⇒ SEMUA baris "tidak terbaca", bukan hijau;
 *  - yang tidak bisa diuji di browser (anchor BAS) diuji lewat `/healthz` tepi kami dan写明 nilainya,
 *    dengan cakupan yang ditulis apa adanya;
 *  - tombol salin/unduh tidak pernah menyerahkan dokumen karangan: ia diisi setelah dokumen asli tiba.
 */
import type { CredentialInfo } from './verify'

export type SpecVerdict = { id: string; ok: boolean | null; observed: string }

type Row = {
  id: string
  clause: string
  name: { en: string; id: string }
  rule: { en: string; id: string }
}

/** 14 asersi — teksnya tetap, yang berubah: statusnya sekarang hasil evaluasi. */
export const SPEC_ROWS: Row[] = [
  { id: 'VC20-CTX-01', clause: 'W3C VC 2.0 §4.1', name: { en: '@context Sequence Ordering', id: 'Urutan Sequence @context' }, rule: { en: 'First URI must be credentials/v2, second must be Open Badges 3.0 context', id: 'URI pertama harus credentials/v2, URI kedua harus konteks Open Badges 3.0' } },
  { id: 'VC20-TYPE-02', clause: 'W3C VC 2.0 §4.2', name: { en: 'Type Heritage Inheritance', id: 'Pewarisan Tipe (Type Heritage)' }, rule: { en: 'type array must contain both VerifiableCredential and OpenBadgeCredential', id: 'Array type wajib memuat VerifiableCredential dan OpenBadgeCredential' } },
  { id: 'VC20-DATE-03', clause: 'W3C VC 2.0 §5.2.1', name: { en: 'validFrom Datetime Property', id: 'Properti Waktu validFrom (Bukan VC 1.1)' }, rule: { en: 'validFrom must be ISO-8601 UTC string; legacy issuanceDate is forbidden', id: 'validFrom wajib format ISO-8601 UTC; issuanceDate dilarang (warisan VC 1.1)' } },
  { id: 'VC20-DATE-04', clause: 'W3C VC 2.0 §5.2.2', name: { en: 'validUntil Expiration Semantics', id: 'Semantik Kadaluarsa validUntil' }, rule: { en: 'validUntil, when present, must be ISO-8601 UTC; legacy expirationDate is forbidden', id: 'validUntil, kalau ada, wajib ISO-8601 UTC; expirationDate dilarang di VC 2.0' } },
  { id: 'OB30-CRIT-05', clause: 'OB 3.0 §B.1.18', name: { en: 'Mandatory Achievement Criteria', id: 'Kriteria Capaian Wajib (Criteria)' }, rule: { en: 'credentialSubject.achievement.criteria.narrative must be non-empty', id: 'credentialSubject.achievement.criteria.narrative wajib ada dan terisi' } },
  { id: 'OB30-SUBJ-06', clause: 'OB 3.0 §9.1', name: { en: 'Subject Identifier XOR Rule', id: 'Aturan XOR Identitas Subjek' }, rule: { en: 'Must specify exactly one: id XOR identifier (never both or neither)', id: 'Wajib tepat salah satu: id XOR identifier (tidak boleh keduanya atau kosong)' } },
  { id: 'OB30-RES-07', clause: 'OB 3.0 §B.1.20', name: { en: 'Result Value String Format', id: 'Format Nilai Result.value (Bukan OB 2.0)' }, rule: { en: 'result[0].value must be string representation; legacy resultScore is omitted', id: 'result[0].value wajib string; resultScore (warisan OB 2.0) ditiadakan' } },
  { id: 'BAS-EXP-08', clause: 'Lencana BAS Anchor', name: { en: 'On-Chain Expiration Synchronization', id: 'Sinkronisasi Kadaluarsa On-Chain BAS' }, rule: { en: 'Document validUntil matches the attestation expirationTime read from the resolver', id: 'validUntil dokumen identik dengan expirationTime yang dibaca dari resolver' } },
  { id: 'BSL-IDX-09', clause: 'Bitstring Status List §3.1', name: { en: 'Base-10 String Status Index', id: 'Indeks Status String Basis-10' }, rule: { en: 'statusListIndex must be base-10 integer encoded strictly as string', id: 'statusListIndex wajib berupa integer basis-10 dalam bentuk string' } },
  { id: 'BSL-PURP-10', clause: 'OB 3.0 §9.1 / BSL §3.2', name: { en: 'Both Status Lists Reachable', id: 'Dua Daftar Status Dapat Diraih' }, rule: { en: 'The status list the document references must answer publicly, and our edge must also serve the suspension list', id: 'Daftar status yang dirujuk dokumen wajib menjawab publik, dan tepi kami juga menyajikan daftar suspension' } },
  { id: 'BSL-FRAG-11', clause: 'Bitstring Status List §3.1', name: { en: 'Status Entry Fragment Anchor URI', id: 'URI Fragment Anchor Entri Status' }, rule: { en: 'Entry id must be a hash-fragment anchor (#uid), not equal to parent status list URL', id: 'id entri wajib berupa fragment anchor (#uid), tidak sama dengan URL list induk' } },
  { id: 'W3C-DI-12', clause: 'W3C Data Integrity §3.1', name: { en: 'Cryptosuite Specification', id: 'Spesifikasi Cryptosuite Terdaftar' }, rule: { en: 'proof.cryptosuite must be eddsa-rdfc-2022', id: 'proof.cryptosuite wajib eddsa-rdfc-2022' } },
  { id: 'W3C-DI-13', clause: 'W3C Data Integrity §B.1.24', name: { en: 'Assertion Method Proof Purpose', id: 'Tujuan Bukti assertionMethod' }, rule: { en: 'proof.proofPurpose must be assertionMethod for credential issuance', id: 'proof.proofPurpose wajib assertionMethod untuk penerbitan kredensial' } },
  { id: 'BAS-HASH-14', clause: 'EAS / BAS 1.3.0 Anchor', name: { en: 'Status List Hash Anchored on BAS', id: 'Hash Daftar Status Tertambat di BAS' }, rule: { en: 'Our edge reports that the status lists it serves match the bit states on chain (getTimestamp)', id: 'Tepi kami melaporkan daftar status yang sajikan cocok dengan keadaan bit di chain (getTimestamp)' } },
]

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : []
const text = (v: unknown): string => typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v)
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const W3C_V2 = 'https://www.w3.org/ns/credentials/v2'
const OB3_CTX = 'ob/v3p0/context-3.0.3'

async function getJson (url: string): Promise<{ ok: boolean; status: number | string; body: Record<string, unknown> | null }> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) })
    const body = r.ok ? obj(await r.json().catch(() => null)) : null
    return { ok: r.ok, status: r.status, body }
  } catch (e) {
    return { ok: false, status: (e as Error)?.name === 'TimeoutError' ? 'timeout' : 'gagal', body: null }
  }
}

/**
 * Mengadili 14 asersi terhadap SATU dokumen: yang teraih dari tepi.
 * `ok === null` berarti "tidak bisa disimpulkan di sini" — bukan lulus, bukan gagal.
 */
export async function evaluateSpecAssertions (
  doc: unknown,
  cred: Pick<CredentialInfo, 'expiresAt' | 'issuedAt'> | null,
  edgeBase: string,
): Promise<SpecVerdict[]> {
  const d = obj(doc)
  const ctx = arr(d['@context']).map(text)
  const types = arr(d.type).map(text)
  const subject = obj(d.credentialSubject)
  const achievement = obj(subject.achievement)
  const criteria = obj(achievement.criteria)
  const results = arr(subject.result)
  const firstResult = obj(results[0])
  const statusEntries = Array.isArray(d.credentialStatus) ? d.credentialStatus.map(obj) : d.credentialStatus ? [obj(d.credentialStatus)] : []
  const entry = statusEntries[0] ?? {}
  const proof = obj(d.proof)

  const validUntil = text(d.validUntil)
  const expMatch = (() => {
    if (!cred) return { ok: null as boolean | null, obs: 'keadaan chain tidak terbaca di sesi ini' }
    const chainExp = Number(cred.expiresAt) || 0
    if (!chainExp && !validUntil) return { ok: true as boolean | null, obs: 'tidak ada kadaluarsa di chain maupun di dokumen — konsisten' }
    if (!validUntil || !chainExp) return { ok: false as boolean | null, obs: `chain=${chainExp || '—'} · dokumen=${validUntil || 'tidak ada validUntil'}` }
    const same = Math.abs(Date.parse(validUntil) / 1000 - chainExp) <= 1
    return { ok: same as boolean | null, obs: `chain=${chainExp} · dokumen=${Date.parse(validUntil) / 1000}` }
  })()

  const referenced = await getJson(text(entry.statusListCredential))
  const suspension = await getJson(`${edgeBase}/credentials/status/suspension`)

  const health = await getJson(`${edgeBase}/healthz`)
  const rev = obj(health.body?.revocation)
  const sus = obj(health.body?.suspension)
  const anchored = health.ok && rev?.matchesChainNow === true && sus?.matchesChainNow === true

  return [
    { id: 'VC20-CTX-01', ok: ctx[0] === W3C_V2 && ctx[1]?.includes(OB3_CTX), observed: `@context[0]=${ctx[0] ?? '—'} · [1]=${ctx[1] ?? '—'}` },
    { id: 'VC20-TYPE-02', ok: types.includes('VerifiableCredential') && types.includes('OpenBadgeCredential'), observed: `[${types.join(', ')}]` },
    { id: 'VC20-DATE-03', ok: ISO.test(text(d.validFrom)) && !('issuanceDate' in d), observed: `validFrom: ${text(d.validFrom) || '—'} · issuanceDate: ${'issuanceDate' in d ? 'ADA (melanggar)' : 'tidak ada'}` },
    { id: 'VC20-DATE-04', ok: (!validUntil || ISO.test(validUntil)) && !('expirationDate' in d), observed: `validUntil: ${validUntil || '—'} · expirationDate: ${'expirationDate' in d ? 'ADA (melanggar)' : 'tidak ada'}` },
    { id: 'OB30-CRIT-05', ok: text(criteria.narrative).trim().length > 0, observed: `criteria.narrative: ${text(criteria.narrative).slice(0, 64) || '(kosong)'}` },
    { id: 'OB30-SUBJ-06', ok: (text(subject.id).length > 0) !== (text(subject.identifier).length > 0), observed: `id: ${text(subject.id).slice(0, 40) || '—'} · identifier: ${text(subject.identifier) || 'tidak ada'}` },
    { id: 'OB30-RES-07', ok: results.length > 0 && typeof firstResult.value === 'string' && !('resultScore' in firstResult), observed: `result[0].value: ${JSON.stringify(firstResult.value ?? null)} · resultScore: ${'resultScore' in firstResult ? 'ADA' : 'tidak ada'}` },
    { id: 'BAS-EXP-08', ok: expMatch.ok, observed: expMatch.obs },
    { id: 'BSL-IDX-09', ok: typeof entry.statusListIndex === 'string' && /^\d+$/.test(text(entry.statusListIndex)), observed: `statusListIndex: ${JSON.stringify(entry.statusListIndex ?? null)}` },
    {
      id: 'BSL-PURP-10',
      ok: statusEntries.length > 0 && referenced.ok && suspension.ok,
      observed: `entri di dokumen=${statusEntries.length} (${text(entry.statusPurpose) || '—'}) · daftar yang dirujuk=${referenced.status} · suspension=${suspension.status}`,
    },
    { id: 'BSL-FRAG-11', ok: text(entry.id).includes('#') && text(entry.id) !== text(entry.statusListCredential), observed: `${text(entry.id).slice(-24) || '—'}` },
    { id: 'W3C-DI-12', ok: text(proof.cryptosuite) === 'eddsa-rdfc-2022', observed: `proof.cryptosuite: ${text(proof.cryptosuite) || '—'}` },
    { id: 'W3C-DI-13', ok: text(proof.proofPurpose) === 'assertionMethod', observed: `proof.proofPurpose: ${text(proof.proofPurpose) || '—'}` },
    {
      id: 'BAS-HASH-14',
      ok: health.ok ? anchored : null,
      observed: anchored
        ? `tepi: revocation ${text(rev.matchesChainNow)} · suspension ${text(sus.matchesChainNow)} · ${text(rev.watched)} hash dipantau`
        : health.ok ? `tepi menjawab tapi penambatan tidak cocok: revocation=${text(rev.matchesChainNow)} suspension=${text(sus.matchesChainNow)}` : 'tepi tidak menjawab — penambatan tidak bisa disimpulkan dari sini',
    },
  ]
}

/** Semua baris "tidak terbaca" — dipakai ketika dokumen asli tidak teraih. Jangan pernah hijau. */
export function unreadableVerdicts (reason: string): SpecVerdict[] {
  return SPEC_ROWS.map((r) => ({ id: r.id, ok: null, observed: `dokumen tidak teraih: ${reason}` }))
}

/** Baris saja (status kosong) — dipakai sampul di bawah dan tabel statis di index.html. */
export function specRowsHtml (lang: 'en' | 'id'): string {
  const isEn = lang === 'en'
  return SPEC_ROWS.map((a) => `
      <tr class="spec-row" data-spec-row="${a.id}">
        <td><span class="spec-pending-badge" data-spec-badge>${isEn ? 'PENDING' : 'MENUNGGU'}</span></td>
        <td><code>${a.id}</code><div class="spec-clause-tag">${a.clause}</div></td>
        <td><strong>${esc2(isEn ? a.name.en : a.name.id)}</strong><div class="spec-rule-desc">${esc2(isEn ? a.rule.en : a.rule.id)}</div></td>
        <td><code class="spec-observed-code" data-spec-observed>—</code></td>
      </tr>`).join('')
}

/** Sampul tabel; status sel kosong sampai `runSpecAudit` mengevaluasi. */
export function specMatrixHtml (lang: 'en' | 'id'): string {
  const isEn = lang === 'en'
  const rows = specRowsHtml(lang)
  return `
    <div class="spec-matrix-wrapper" data-spec-root>
      <div class="spec-matrix-header-box">
        <div class="spec-header-meta">
          <span class="spec-kicker-pill">W3C VC 2.0 &amp; 1EDTECH OB 3.0</span>
          <h3 class="spec-card-title">${isEn ? 'Specification Compliance — evaluated, not asserted' : 'Kepatuhan Spesifikasi — Dihitung, Bukan Diklaim'}</h3>
          <p class="spec-card-sub">${isEn
            ? 'Each row below is a predicate run in your browser against the document fetched from:'
            : 'Setiap baris di bawah adalah predikat yang dijalankan di browsermu terhadap dokumen yang diambil dari:'} <code data-spec-source>${isEn ? '(not fetched yet)' : '(belum diambil)'}</code></p>
        </div>
        <div class="spec-status-pill-lg">
          <span class="pulse-dot-green" data-spec-dot></span>
          <span data-spec-verdict>${isEn ? 'not computed yet' : 'belum dihitung'}</span>
        </div>
      </div>

      <div class="spec-actions-bar">
        <button type="button" class="btn btn-secondary btn-sm btn-copy-report-jsonld" disabled>
          📋 ${isEn ? 'Copy the fetched JSON-LD' : 'Salin JSON-LD yang diambil'}
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-download-report-jsonld" disabled data-filename="lencana-credential.jsonld">
          ⬇️ ${isEn ? 'Download .jsonld' : 'Unduh .jsonld'}
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-pulse-spec-test">
          🧪 ${isEn ? 'Evaluate against the edge document' : 'Hitung terhadap dokumen dari tepi'}
        </button>
      </div>

      <div class="spec-table-scroll">
        <table class="spec-matrix-table">
          <thead>
            <tr><th>Status</th><th>Assertion &amp; Spec</th><th>Normative Constraint</th><th>Observed (from the fetched document)</th></tr>
          </thead>
          <tbody>${rows}
          </tbody>
        </table>
      </div>

      <details class="spec-jsonld-drawer">
        <summary class="spec-drawer-summary">
          <span>${isEn ? 'The document this table was judged against' : 'Dokumen yang jadi bahan uji tabel ini'}</span>
          <span class="drawer-badge">JSON-LD</span>
        </summary>
        <div class="spec-drawer-body"><pre class="spec-jsonld-pre"><code class="spec-jsonld-code" data-spec-doc>${isEn ? '(not fetched yet)' : '(belum diambil)'}</code></pre></div>
      </details>

      <div class="spec-honest-notice">
        <div class="notice-icon">⚖️</div>
        <div class="notice-text"><strong>${isEn ? 'What this table can and cannot prove' : 'Yang bisa dan tidak bisa dibuktikan tabel ini'}</strong>
          <p>${isEn
            ? 'Thirteen rows are structural checks over the published document; the last row is our edge reporting that the status lists it serves match the bit states on chain. Signature verification and the BAS timestamp are checked by `npm run verify:edge` / the 1EdTech validator, not by this page. A row that cannot be judged here reads "not readable" — it never reads green by default.'
            : 'Tiga belas baris adalah pemeriksaan struktur atas dokumen yang terbit; baris terakhir adalah laporan tepi kami bahwa daftar status yang disajikan cocok dengan keadaan bit di chain. Verifikasi tanda tangan dan waktu BAS diperiksa `npm run verify:edge` / validator 1EdTech, bukan oleh halaman ini. Baris yang tidak bisa diuji di sini terbaca "tidak terbaca" — ia tidak pernah hijau karena default.'}</p>
        </div>
      </div>
    </div>`
}

const esc2 = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Mengisi sampul dengan hasil evaluasi. DOM-only, dipanggil dari main.ts. */
export async function runSpecAudit (
  root: ParentNode,
  opts: { hash: string | null; cred: Pick<CredentialInfo, 'expiresAt' | 'issuedAt'> | null; edgeBase: string; lang: 'en' | 'id' },
): Promise<{ passed: number; failed: number; unknown: number; ms: number }> {
  const isEn = opts.lang === 'en'
  const started = performance.now()
  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-spec-row]'))
  const verdictEl = root.querySelector<HTMLElement>('[data-spec-verdict]')
  if (!rows.length) return { passed: 0, failed: 0, unknown: 0, ms: 0 }

  for (const tr of rows) {
    const b = tr.querySelector<HTMLElement>('[data-spec-badge]')
    if (b) { b.textContent = isEn ? 'RUNNING' : 'MENGHITUNG'; b.className = 'spec-pending-badge' }
  }
  if (verdictEl) verdictEl.textContent = isEn ? 'computing…' : 'menghitung…'

  const source = opts.hash ? `${opts.edgeBase}/credentials/${opts.hash}` : null
  const srcEl = root.querySelector<HTMLElement>('[data-spec-source]')
  if (srcEl) srcEl.textContent = source ?? (isEn ? '(this report has no credential hash)' : '(laporan ini tidak punya hash kredensial)')
  let verdicts: SpecVerdict[]
  let docJson = ''
  if (source) {
    const got = await getJson(source)
    if (got.ok && got.body) {
      docJson = JSON.stringify(got.body, null, 2)
      verdicts = await evaluateSpecAssertions(got.body, opts.cred, opts.edgeBase)
    } else {
      verdicts = unreadableVerdicts(`${source} → ${got.status}`)
    }
  } else verdicts = unreadableVerdicts(isEn ? 'no credential hash in this report' : 'laporan ini tidak punya hash kredensial')

  const byId = new Map(verdicts.map((v) => [v.id, v]))
  let passed = 0; let failed = 0; let unknown = 0
  for (const tr of rows) {
    const v = byId.get(tr.dataset.specRow ?? '')
    const badge = tr.querySelector<HTMLElement>('[data-spec-badge]')
    const obs = tr.querySelector<HTMLElement>('[data-spec-observed]')
    if (!v) continue
    if (badge) {
      badge.className = v.ok === true ? 'spec-pass-badge' : v.ok === false ? 'spec-fail-badge' : 'spec-unknown-badge'
      badge.textContent = v.ok === true ? '✓ PASS' : v.ok === false ? (isEn ? '✗ FAIL' : '✗ GAGAL') : (isEn ? '— not readable here' : '— tidak terbaca di sini')
    }
    if (obs) obs.textContent = v.observed
    if (v.ok === true) passed++
    else if (v.ok === false) failed++
    else unknown++
  }

  const ms = Math.round(performance.now() - started)
  if (verdictEl) {
    verdictEl.textContent = isEn
      ? `${passed} / ${rows.length} satisfied · ${failed} failed · ${unknown} not readable · ${ms} ms`
      : `${passed} / ${rows.length} terpenuhi · ${failed} gagal · ${unknown} tidak terbaca · ${ms} ms`
  }
  const dot = root.querySelector<HTMLElement>('[data-spec-dot]')
  if (dot) dot.className = failed === 0 && unknown === 0 ? 'pulse-dot-green' : 'spec-dot-warn'

  const docEl = root.querySelector<HTMLElement>('[data-spec-doc]')
  if (docEl) docEl.textContent = docJson || (isEn ? '(no document fetched — nothing to show)' : '(tidak ada dokumen teraih — tidak ada yang ditampilkan)')
  for (const btn of Array.from(root.querySelectorAll<HTMLElement>('.btn-copy-report-jsonld, .btn-download-report-jsonld'))) {
    if (docJson) {
      btn.dataset.json = docJson
      btn.removeAttribute('disabled')
      if (btn.classList.contains('btn-download-report-jsonld')) {
        btn.dataset.filename = opts.hash ? `lencana-${opts.hash.slice(2, 10)}.jsonld` : 'lencana-credential.jsonld'
      }
    } else { btn.removeAttribute('data-json'); btn.setAttribute('disabled', 'true') }
  }
  return { passed, failed, unknown, ms }
}
