/**
 * Render laporan → HTML. Murni (tanpa DOM) supaya bisa diuji dari Node.
 *
 * Aturan yang menjaga halaman ini: **tidak ada panel yang hilang diam-diam.** Kalau sebuah
 * pembacaan gagal, panelnya tetap ada dan bertuliskan bahwa gagal. Halaman yang hanya
 * menampilkan bagian yang sukses adalah halaman yang bisa membuat "belum terverifikasi"
 * kelihatan "terverifikasi".
 */
import type { Report } from './verify'
import { EMPTY_UID } from './abi'
import { explorerLink } from './config'

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const VERDICT_LABEL: Record<string, { title: string; sub: string; cls: string }> = {
  VALID: { title: 'VALID', sub: 'Kredensial aktif dan terverifikasi di chain', cls: 'ok' },
  REVOKED: { title: 'DICABUT', sub: 'Pernah terbit, lalu dicabut — jejaknya permanen', cls: 'bad' },
  EXPIRED: { title: 'KEDALUWARSA', sub: 'Waktu berlakunya habis, tanpa ada yang menyentuh', cls: 'warn' },
  // Sengaja diberi label sendiri, bukan digabung ke DICABUT. Di chain `revocationTime` tetap 0,
  // jadi menampilkan delisting sebagai "dicabut" adalah klaim yang bisa dibantah verifier mana
  // pun dengan satu eth_call. Bagi pembaca hasilnya sama-sama "jangan diterima", tapi sebabnya
  // berbeda: yang satu tindakan penerbit dan permanen, yang satu penilaian platform dan bisa pulih.
  ISSUER_DELISTED: {
    title: 'PENERBIT DILISTING',
    sub: 'Platform menarik dukungannya dari penerbit — attestation-nya sendiri belum dicabut',
    cls: 'bad',
  },
  NOT_FOUND: { title: 'TIDAK DIKENALI', sub: 'Tidak pernah diterbitkan lewat sistem ini', cls: 'bad' },
  WRONG_CHAIN: { title: 'CHAIN TIDAK COCOK', sub: 'Kami menolak menampilkan hasil dari chain lain', cls: 'bad' },
  NOT_CONFIGURED: { title: 'BELUM DIKONFIGURASI', sub: 'Address kontrak belum diisi', cls: 'muted' },
  UNREACHABLE: { title: 'RPC TIDAK MENJAWAB', sub: 'Konfigurasi terisi, node-nya yang tidak terhubung', cls: 'warn' },
}

function ts(n: number | null | undefined): string {
  if (!n) return '—'
  return `${new Date(n * 1000).toISOString()}  (unix ${n})`
}

function age(n: number, now: number): string {
  if (!n) return ''
  const d = Math.round((now - n) / 86400)
  if (d === 0) return 'hari ini'
  return d > 0 ? `${d} hari lalu` : `${-d} hari lagi`
}

function yn(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return '<span class="na">tidak terbaca</span>'
  return v ? '<span class="yes">ya</span>' : '<span class="no">tidak</span>'
}

function row(label: string, value: string, hint = ''): string {
  return `<tr><th>${esc(label)}</th><td>${value}${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</td></tr>`
}

function addr(ep: Report['endpoint'], a: string | null | undefined, name = 'buka di explorer'): string {
  if (!a || a === '0x0000000000000000000000000000000000000000') return '<span class="na">—</span>'
  const link = explorerLink(ep, 'address', a)
  return `<code class="addr">${esc(a)}</code>${link ? ` <a href="${link}" target="_blank" rel="noopener">${esc(name)}</a>` : ''}`
}

function hex(v: string | null | undefined): string {
  if (!v || v === EMPTY_UID) return '<span class="na">—</span>'
  return `<code class="addr">${esc(v)}</code>`
}

function panel(title: string, body: string, opts: { note?: string; id?: string } = {}): string {
  return `<section class="panel"${opts.id ? ` id="${opts.id}"` : ''}>
  <h2>${esc(title)}</h2>
  ${opts.note ? `<p class="note">${esc(opts.note)}</p>` : ''}
  ${body}
</section>`
}

function table(rows: string): string {
  return `<table class="kv">${rows}</table>`
}

export function renderReport(r: Report): string {
  const ep = r.endpoint
  const v = VERDICT_LABEL[r.verdict] ?? VERDICT_LABEL.NOT_FOUND
  const now = r.chain?.blockTimestamp ?? Math.floor(Date.now() / 1000)
  const c = r.credential

  const out: string[] = []

  // 1 — keputusan
  out.push(`<section class="verdict ${v.cls}">
  <div class="verdict-title">${esc(v.title)}</div>
  <div class="verdict-sub">${esc(v.sub)}</div>
  <ul class="reasons">${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</section>`)

  // 2 — apa yang diminta
  out.push(
    panel(
      'Yang kamu minta',
      table(
        row('Masukan', `<code class="addr">${esc(r.input.raw)}</code>`) +
          row('Ditafsirkan sebagai', `<strong>${esc(r.input.interpretedAs)}</strong>`, r.input.note),
      ),
    ),
  )

  // 3 — chain & konfigurasi
  out.push(
    panel(
      'Chain & konfigurasi pembacaan',
      table(
        (r.chain
          ? row('Network', `<strong>${esc(r.chain.name)}</strong>`, r.chain.isTestnet ? 'Testnet — angka di sini tidak punya nilai ekonomi' : 'Mainnet') +
            row('chainId (dari RPC)', `<code>${esc(r.chain.chainId)}</code>`, `diharapkan ${r.chain.expectedChainId}`) +
            row('Blok terbaru', `<code>${esc(r.chain.blockNumber.toString())}</code>`, `timestamp ${ts(r.chain.blockTimestamp)}`)
          : row('chainId', '<span class="na">tidak terbaca</span>')) +
          row('RPC', `<code>${esc(ep.rpcUrl)}</code>`) +
          row('CredentialResolver (milik kami)', addr(ep, ep.resolver)) +
          row('SoulboundCert (milik kami)', addr(ep, ep.cert)) +
          row('BAS core (pihak ketiga)', addr(ep, ep.bas), 'buka BAS') +
          row('BAS SchemaRegistry (pihak ketiga)', addr(ep, r.resolver.schemaRegistry ?? null), 'buka registry') +
          row('BAC code ada?', yn(r.resolver.hasCode), 'bytecode pada address resolver') +
          row('Artefak code ada?', yn(r.cert.hasCode)) +
          row('Waktu laporan', ts(Math.floor(r.generatedAt / 1000))),
      ),
    ),
  )

  // 4 — identitas kredensial
  out.push(
    panel(
      'Identitas kredensial',
      table(
        row('credentialHash', hex(c.hash), 'keccak256 dari dokumen kredensial') +
          row('UID attestation (BAS)', hex(c.uid)) +
          row('courseId', hex(c.courseId), 'ID kursus, bukan nama peserta') +
          row('Schema UID', hex(c.schemaUid)) +
          row('UID schema resolver', hex(r.resolver.schemaUid), 'harus sama dengan di atas') +
          row('String schema', c.schemaUid ? `<code>${esc(r.resolver.schemaString ?? '—')}</code>` : '<span class="na">—</span>') +
          row('Panjang data attestation', esc(c.dataNote || '—')) +
          row('Diterbitkan lewat resolver ini?', yn(c.ours), 'perbedaan antara "ada attestation di chain" dan "kredensial kami"'),
      ),
    ),
  )

  // 5 — status
  out.push(
    panel(
      'Status keberlakuan',
      table(
        row('Tercatat di resolver', yn(c.exists)) +
          row('Dicabut', yn(c.revoked), c.revocationTime ? `pada ${ts(c.revocationTime)} — permanen, tidak ada jalur pembatalan` : 'tidak ada jalur untuk membatalkan pencabutan') +
          row('Kedaluwarsa', yn(c.expired)) +
          row(
            'Penerbit dilisting',
            yn(c.issuerDelisted),
            c.issuerDelisted
              ? 'platform menarik dukungannya; revocationTime di chain tetap 0, dan bisa dipulihkan lewat relistIssuer'
              : 'penerbitnya masih diakui platform',
          ) +
          row('Diterbitkan', ts(c.issuedAt || c.attestationTime), c.issuedAt ? age(c.issuedAt, now) : '') +
          row('Berlaku sampai', ts(c.expiresAt), c.expiresAt ? age(c.expiresAt, now) : 'tanpa expiry') +
          row('Dapat dicabut (sejak terbit)', yn(c.revocable), 'kalau false, pencabutan mustahil selamanya — itu bukan fitur di sini') +
          row('Dicabut off-chain oleh penerbit?', r.anchors.offchainRevokedByIssuer ? `<code>${esc(r.anchors.offchainRevokedByIssuer)}</code>` : '<span class="no">tidak</span>', 'jalur IEAS.revokeOffchain, terikat pasangan (pencabut, hash)') +
          row('Anchor bukti waktu terpisah', r.anchors.evidenceTimestamp ? `<code>${esc(r.anchors.evidenceTimestamp)}</code>` : '<span class="na">tidak ada</span>', 'IEAS.timestamp(hash) — write-once'),
      ),
      {
        note: 'Dicabut, kedaluwarsa, dan penerbit dilisting adalah TIGA hal berbeda dan ditampilkan terpisah. Dua yang pertama adalah fakta tentang kredensialnya dan berasal dari attester atau dari waktu; yang ketiga adalah penilaian platform tentang penerbitnya dan bisa dipulihkan. Ketiganya berarti "jangan diterima", tapi sebabnya berbeda — dan sebab itulah yang dicari auditor.',
      },
    ),
  )

  // 6 — orang/alamat yang terlibat
  out.push(
    panel(
      'Alamat yang terlibat',
      table(
        row('Issuer — agen penerbit', addr(ep, c.attester ?? c.issuer),
            'kolom `attester` di attestation BAS. Namanya "Issuer" karena itu memang nama field-nya di dokumen kredensial') +
          row('Pemegang (recipient)', addr(ep, c.holder ?? c.recipient), 'alamat, bukan identitas manusia') +
          row('Masih berizin menerbitkan?', yn(r.resolver.issuerApproved), 'izin menerbitkan ≠ pembatalan kredensial lama') +
          row('Admin resolver', addr(ep, r.resolver.owner), 'bisa menambah/mencabut izin penerbit') +
          row('Resolver terpasang di schema', addr(ep, r.resolver.schemaRecord?.resolver)),
      ),
      {
        note: 'Schema UID dihitung dari keccak256(string schema, alamat resolver, revocable) — jadi alamat resolver ikut menentukan dan tidak bisa dipindah-pindah tanpa membuat schema baru.',
      },
    ),
  )

  // 7 — rantai prasyarat
  if (r.chainHistory.length || c.refUid) {
    const rows = r.chainHistory
      .map(
        (n) =>
          `<tr><th>#${n.depth}</th><td><code class="addr">${esc(n.uid)}</code> — <span class="st-${n.status.toLowerCase()}">${esc(n.status)}</span></td></tr>`,
      )
      .join('')
    out.push(
      panel(
        'Rantai prasyarat',
        `<table class="kv">${row('Prasyarat langsung', hex(c.refUid))}${rows || row('', '<span class="na">tidak ada mata rantai lagi di atasnya</span>')}</table>`,
        {
          note: 'Yang dibuktikan di lapis ini: saat sertifikat lanjutan diterbitkan, prasyaratnya masih hidup, belum dicabut, dan milik pemegang yang sama. EAS mentah hanya mengecek prasyaratnya ADA — empat penolakan sisanya adalah kerja kami.',
        },
      ),
    )
  }

  // 8 — artefak soulbound
  out.push(
    panel(
      'Artefak yang dimiliki peserta (soulbound)',
      table(
        row('Kontrak', addr(ep, r.cert.address)) +
          row('Nama / simbol', `${esc(r.cert.name ?? '—')} / ${esc(r.cert.symbol ?? '—')}`) +
          row('tokenId', r.cert.tokenId ? `<code>${esc(r.cert.tokenId)}</code>` : '<span class="na">tidak ada artefak untuk ini</span>', 'tokenId = angka dari credentialHash, jadi tidak bisa ada dua artefak') +
          row('Dimiliki oleh', addr(ep, r.cert.owner)) +
          row('locked()', yn(r.cert.locked)) +
          row('Mendukung ERC-5192', yn(r.cert.supportsErc5192), 'interfaceId 0xb45a3c0e — wallet bisa melihat ini sebagai token tak terpindahtangankan') +
          row('tokenURI', r.cert.tokenUri ? `<a href="${esc(r.cert.tokenUri)}" target="_blank" rel="noopener"><code>${esc(r.cert.tokenUri)}</code></a>` : '<span class="na">—</span>') +
          row('Jumlah artefak milik pemegang', r.cert.holderBalance ? `<code>${esc(r.cert.holderBalance)}</code>` : '<span class="na">—</span>') +
          row('Artefak menunjuk resolver ini?', yn(r.cert.wiredToThisResolver)),
      ),
      {
        note: 'Artefak BUKAN kredensial dan BUKAN bukti keberlakuan. Kredensialnya dokumen JSON bertanda tangan; status kebenarannya di panel atas. Artefak yang kredensialnya sudah dicabut tetap ada sebagai catatan sejarah.',
      },
    ),
  )

  // 9 — record mentah di BAS
  out.push(
    panel(
      'Rekaman mentah di BAS (pihak ketiga, tidak bisa kami ubah)',
      table(
        row('Attestation ada?', yn(Boolean(c.uid))) +
          row('time', ts(c.attestationTime)) +
          row('expirationTime', ts(c.expiresAt)) +
          row('revocationTime', c.revocationTime ? ts(c.revocationTime) : '<span class="no">0 = belum dicabut</span>') +
          row('refUID', hex(c.refUid)) +
          row('Schema record: revocable', yn(r.resolver.schemaRecord?.revocable)) +
          row('Schema record: isi', r.resolver.schemaRecord ? `<code>${esc(r.resolver.schemaRecord.schema)}</code>` : '<span class="na">—</span>'),
      ),
      {
        note: 'Semua baris di halaman ini bisa dibaca langsung dari chain oleh siapa pun. Tidak ada satu pun yang bersumber dari basis data kami — karena memang tidak ada.',
      },
    ),
  )

  // 10 — cara mengulang sendiri
  out.push(
    panel(
      'Ulangi sendiri, tanpa halaman ini',
      `<pre class="cmd">${r.reproduction.cast.map(esc).join('\n')}</pre>
       <p class="note">atau tanpa Foundry, panggilan mentah JSON-RPC:</p>
       <pre class="cmd">${r.reproduction.curl.map(esc).join('\n')}</pre>
       <h3>Selector fungsi yang dipakai</h3>
       <table class="kv">${r.reproduction.selectors.map((s) => row(s.name, `<code>${esc(s.selector)}</code>`)).join('')}</table>`,
      {
        note: 'Klaim "terverifikasi publik" tidak berarti apa-apa kalau satu-satunya cara memeriksanya adalah alat dari kami. Salin perintah di atas dan jalankan.',
      },
    ),
  )

  // 11 — log pembacaan (transparansi penuh)
  const failed = r.readLog.filter((l) => !l.ok).length
  out.push(
    panel(
      `Panggilan yang dilakukan halaman ini (${r.readLog.length}${failed ? `, ${failed} gagal` : ', 0 gagal'})`,
      `<table class="log"><thead><tr><th>status</th><th>panggilan</th><th>terhadap</th><th>argumen</th><th>hasil</th></tr></thead><tbody>${r.readLog
        .map(
          (l) =>
            `<tr class="${l.ok ? 'ok-row' : 'err-row'}"><td>${l.ok ? '✓' : '✗'}</td><td><code>${esc(l.label)}</code></td><td><code class="short">${esc(l.target)}</code></td><td><code class="short">${esc(l.args || '—')}</code></td><td><code class="short">${esc(l.result)}</code></td></tr>`,
        )
        .join('')}</tbody></table>`,
      {
        note: 'Kalau sebuah baris di atas ✗, panelnya tetap muncul dan menulis "tidak terbaca". Tidak ada angka yang dipalsukan oleh kegagalan.',
      },
    ),
  )

  // 12 — batas klaim
  out.push(
    panel(
      'Batas yang harus kamu ketahui',
      `<ul class="limits">${r.limits.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`,
      {
        note: 'Bagian ini bukan formalitas hukum dan tidak bisa ditutup. Kami lebih memilih halaman yang mengatakan apa yang tidak dibuktikannya.',
      },
    ),
  )

  return out.join('\n')
}

export function renderEmpty(): string {
  return `<section class="verdict muted"><div class="verdict-title">MENUNGGU MASUKAN</div>
  <div class="verdict-sub">Tempel salah satu dari ini di kolom di atas</div>
  <ul class="reasons">
    <li><strong>credentialHash</strong> — 0x lalu 64 karakter hex. Bentuk paling kuat: dokumen kredensial tidak perlu bisa dilihat untuk diperiksa statusnya.</li>
    <li><strong>UID attestation</strong> — 0x + 64 hex; halaman mengenali mana yang hash dan mana yang UID.</li>
    <li><strong>tokenId artefak</strong> — angka decimal dari koleksi NFT peserta.</li>
    <li><strong>address penerbit atau peserta</strong> — 0x + 40 hex; untuk memeriksa izin penerbit dan jumlah sertifikat seseorang.</li>
  </ul>
  <p class="note">Tidak ada satu pun pemeriksaan di halaman ini yang memerlukan wallet, login, atau izin baca basis data.</p></section>`
}
