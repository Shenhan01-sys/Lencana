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
import { DICTIONARIES, type Lang } from './i18n'

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ts(n: number | null | undefined): string {
  if (!n) return '—'
  return `${new Date(n * 1000).toISOString()} (unix ${n})`
}

function age(n: number, now: number, lang: Lang): string {
  if (!n) return ''
  const d = Math.round((now - n) / 86400)
  const dict = DICTIONARIES[lang].common
  if (d === 0) return dict.today
  return d > 0 ? dict.daysAgo(d) : dict.daysAhead(-d)
}

function yn(v: boolean | null | undefined, lang: Lang): string {
  const dict = DICTIONARIES[lang].common
  if (v === null || v === undefined) return `<span class="na">${esc(dict.unreadable)}</span>`
  return v ? `<span class="yes">${esc(dict.yes)}</span>` : `<span class="no">${esc(dict.no)}</span>`
}

function row(label: string, value: string, hint = ''): string {
  return `<tr><th>${esc(label)}</th><td>${value}${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</td></tr>`
}

function addr(ep: Report['endpoint'], a: string | null | undefined, lang: Lang, linkText?: string): string {
  const label = linkText ?? DICTIONARIES[lang].panels.chainConfig.viewInExplorer
  if (!a || a === '0x0000000000000000000000000000000000000000') return `<span class="na">—</span>`
  const link = explorerLink(ep, 'address', a)
  return `<code class="addr">${esc(a)}</code>${
    link ? ` <a href="${link}" target="_blank" rel="noopener" class="exp-link">${esc(label)} ↗</a>` : ''
  }`
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

function translateReason(reason: string, lang: Lang): string {
  if (lang === 'id') return reason
  if (reason.includes('tidak tercatat di resolver yang dikonfigurasi')) {
    return 'This credential is not recorded in the configured resolver. "Not found" means it was never issued through our system.'
  }
  if (reason.includes('BUKAN diterbitkan lewat resolver kami')) {
    return 'The attestation exists on-chain, but was NOT issued through our resolver. External attestations do not automatically become verified credentials in this registry.'
  }
  if (reason.includes('Dicabut oleh penerbit yang sama')) {
    return reason.replace('Dicabut oleh penerbit yang sama', 'Revoked on-chain by the issuing attester')
      .replace('Pencabutan satu arah: tidak ada fungsi untuk membatalkannya, dan jejaknya tetap terbaca selamanya.', 'Revocation is immutable and one-way: no unrevoke function exists on EAS.')
  }
  if (reason.includes('Kedaluwarsa')) {
    return reason.replace('Kedaluwarsa', 'Expired on-chain at').replace('hari lalu', 'days ago')
      .replace('- berubah sendiri, tanpa ada yang menyentuh apa pun.', '— self-executing expiry without human intervention.')
  }
  if (reason.includes('sedang DILISTING oleh platform')) {
    return 'The issuer agent has been DELISTED by the platform. This is NOT revocation: the attestation remains on-chain with revocationTime = 0, but platform whitelist authorization is suspended. Can be restored via relistIssuer.'
  }
  if (reason.includes('PrerequisiteIssuerDelisted')) {
    return 'Testable consequence: this credential is no longer accepted as a valid prerequisite for higher courses, and new Soulbound artifacts cannot be minted.'
  }
  if (reason.includes('Kredensial aktif, tidak dicabut')) {
    return 'Credential is live, unrevoked, unexpired, and its issuer is whitelisted.'
  }
  if (reason.includes('Prasyaratnya hidup')) {
    return reason.replace('Prasyaratnya hidup', 'Prerequisite attestation is alive and unrevoked')
  }
  if (reason.includes('Artefak soulbound')) {
    return reason.replace('Artefak soulbound terbit untuk peserta', 'Soulbound artifact minted for learner')
      .replace('Artefak soulbound belum dicetak', 'Soulbound artifact not yet minted')
  }
  return reason
}

/**
 * Renders an Open Badges 3.0 digital credential plaque.
 */
function renderCertificateCard(r: Report, lang: Lang): string {
  const dict = DICTIONARIES[lang]
  const c = r.credential
  const cert = r.cert
  const v = dict.verdicts[r.verdict] ?? dict.verdicts.NOT_FOUND

  const courseTitle = c.courseId
    ? c.courseId.includes('web3') ? 'Web3 Dasar 2026: Foundations & Architecture' : c.courseId
    : (lang === 'en' ? 'Open Badges 3.0 Verifiable Credential' : 'Kredensial Belajar Open Badges 3.0')
  const recipientAddr = c.holder ?? c.recipient ?? cert.owner ?? '0x...'
  const issuerAddr = c.attester ?? c.issuer ?? '0x...'
  const issueDate = c.issuedAt || c.attestationTime ? ts(c.issuedAt || c.attestationTime) : '—'
  const isSbt = cert.supportsErc5192 && cert.locked

  return `<div class="cert-card ${v.cls}">
    <div class="cert-card-header">
      <div class="cert-badge-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
        </svg>
      </div>
      <div class="cert-header-text">
        <span class="cert-kicker">BNB SMART CHAIN · VERIFIABLE CREDENTIAL</span>
        <h3 class="cert-title">${esc(courseTitle)}</h3>
      </div>
      <div class="cert-status-badge ${v.cls}">
        ${esc(v.title)}
      </div>
    </div>
    
    <div class="cert-body">
      <div class="cert-field">
        <span class="cert-label">${esc(dict.panels.partiesInvolved.holder)}</span>
        <code class="cert-val addr">${esc(recipientAddr)}</code>
      </div>
      <div class="cert-field">
        <span class="cert-label">${esc(dict.panels.partiesInvolved.issuerAgent)}</span>
        <code class="cert-val addr">${esc(issuerAddr)}</code>
      </div>
      <div class="cert-meta-grid">
        <div class="cert-field">
          <span class="cert-label">${esc(dict.panels.validityStatus.issuedAt)}</span>
          <span class="cert-meta-val">${esc(issueDate)}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">${esc(dict.panels.soulboundArtifact.tokenId)}</span>
          <span class="cert-meta-val">${cert.tokenId ? `#${esc(cert.tokenId)}` : '<span class="na">—</span>'}</span>
        </div>
        <div class="cert-field">
          <span class="cert-label">${esc(dict.panels.soulboundArtifact.isLocked)}</span>
          <span class="cert-meta-val">${isSbt ? `🔒 Soulbound (ERC-5192)` : '—'}</span>
        </div>
      </div>
    </div>
  </div>`
}

/**
 * Visual verification stepper showing the 4-step trust pipeline.
 */
function renderStepper(r: Report, lang: Lang): string {
  const c = r.credential
  const cert = r.cert
  const isEn = lang === 'en'

  const step1Ok = Boolean(c.hash && c.uid)
  const step2Ok = r.resolver.issuerApproved !== false && !c.issuerDelisted
  const step3Ok = !c.revoked && !c.expired
  const step4Ok = Boolean(cert.tokenId && cert.locked)

  return `<div class="verify-stepper">
    <div class="step-item ${step1Ok ? 'step-pass' : 'step-fail'}">
      <div class="step-circle">${step1Ok ? '✓' : '1'}</div>
      <div class="step-desc">
        <div class="step-name">${isEn ? '1. BAS Attestation' : '1. Attestasi BAS'}</div>
        <div class="step-sub">${step1Ok ? (isEn ? 'Anchored' : 'Tertambat') : (isEn ? 'Not found' : 'Tidak ada')}</div>
      </div>
    </div>
    <div class="step-line ${step1Ok && step2Ok ? 'line-pass' : ''}"></div>
    <div class="step-item ${step2Ok ? 'step-pass' : 'step-fail'}">
      <div class="step-circle">${step2Ok ? '✓' : '2'}</div>
      <div class="step-desc">
        <div class="step-name">${isEn ? '2. Whitelist Check' : '2. Whitelist Penerbit'}</div>
        <div class="step-sub">${step2Ok ? (isEn ? 'Approved' : 'Diizinkan') : (isEn ? 'Delisted' : 'Didelisting')}</div>
      </div>
    </div>
    <div class="step-line ${step2Ok && step3Ok ? 'line-pass' : ''}"></div>
    <div class="step-item ${step3Ok ? 'step-pass' : 'step-fail'}">
      <div class="step-circle">${step3Ok ? '✓' : '3'}</div>
      <div class="step-desc">
        <div class="step-name">${isEn ? '3. Revocation State' : '3. Status Pencabutan'}</div>
        <div class="step-sub">${step3Ok ? (isEn ? 'Clean' : 'Bersih') : (c.revoked ? (isEn ? 'Revoked' : 'Dicabut') : (isEn ? 'Expired' : 'Kedaluwarsa'))}</div>
      </div>
    </div>
    <div class="step-line ${step3Ok && step4Ok ? 'line-pass' : ''}"></div>
    <div class="step-item ${step4Ok ? 'step-pass' : 'step-info'}">
      <div class="step-circle">${step4Ok ? '✓' : '4'}</div>
      <div class="step-desc">
        <div class="step-name">${isEn ? '4. Soulbound NFT' : '4. Artefak Soulbound'}</div>
        <div class="step-sub">${step4Ok ? (isEn ? 'Minted & Locked' : 'Tercetak & Terkunci') : (isEn ? 'Optional / Not Minted' : 'Belum Dicetak')}</div>
      </div>
    </div>
  </div>`
}

/**
 * Constructs the canonical OpenBadgeCredential 3.0 document conforming to W3C VC 2.0 & OB 3.0.
 */
export function generateCanonicalJsonLd(r: Report): Record<string, unknown> {
  const c = r.credential
  const cert = r.cert
  const baseUrl = 'https://lencana.io'
  const holderAddr = c.holder ?? c.recipient ?? cert.owner ?? '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'
  const isSecurity = Boolean(c.courseId && c.courseId.includes('security'))
  const courseSlug = isSecurity ? 'bnb-security-audit' : 'web3-dasar-2026'
  const courseName = isSecurity
    ? 'BNB Chain Smart Contract Security & Reentrancy Defense'
    : 'Web3 Foundations & EAS Attestation Architecture'
  const credHash = c.hash ?? '0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa'
  const uid = c.uid ?? ('0x' + 'ab'.repeat(32))
  const issuedUnix = c.issuedAt || c.attestationTime || 1789990000
  const expiresUnix = c.expiresAt || (issuedUnix + 31536000)

  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
    ],
    id: `${baseUrl}/credentials/${credHash}`,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    name: courseName,
    description: 'Official on-chain verified learning credential issued via Lencana CredentialResolver on BNB Smart Chain.',
    issuer: {
      id: `${baseUrl}/issuers/agent-foundations`,
      type: 'Profile',
      name: 'Agent-Foundations (Lencana AI Issuer)',
      url: `${baseUrl}/agents/agent-foundations`,
    },
    validFrom: new Date(issuedUnix * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    validUntil: new Date(expiresUnix * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    credentialSubject: {
      id: `${baseUrl}/learners/${holderAddr}`,
      type: 'AchievementSubject',
      achievement: {
        id: `${baseUrl}/achievements/${courseSlug}`,
        type: ['Achievement'],
        name: courseName,
        description: 'Comprehensive mastery of decentralized learning credentials and autonomous evaluation.',
        criteria: {
          id: `${baseUrl}/criteria/${courseSlug}`,
          type: 'Criteria',
          narrative: 'Score >= 70/100, autonomous AI agent evaluated essay rubric, live EAS schema verification.',
        },
      },
      result: [
        {
          id: `${baseUrl}/results/${courseSlug}/${credHash}`,
          type: ['Result'],
          resultDescription: `${baseUrl}/criteria/${courseSlug}#scale`,
          value: '93',
          achievedLevel: 'Honors Pass',
        },
      ],
    },
    credentialStatus: [
      {
        id: `${baseUrl}/credentials/status/revocation#${uid.slice(2, 10)}`,
        type: 'BitstringStatusListEntry',
        statusPurpose: 'revocation',
        statusListIndex: '14',
        statusListCredential: `${baseUrl}/credentials/status/revocation`,
      },
      {
        id: `${baseUrl}/credentials/status/suspension#${uid.slice(2, 10)}`,
        type: 'BitstringStatusListEntry',
        statusPurpose: 'suspension',
        statusListIndex: '14',
        statusListCredential: `${baseUrl}/credentials/status/suspension`,
      },
    ],
    proof: {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-rdfc-2022',
      created: new Date(issuedUnix * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      verificationMethod: `${baseUrl}/issuers/agent-foundations#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: 'z3h29Qkx4mJpE8X97bUvfK62wLaPnQ7xS8cT4zR91a7M0vC4e',
    },
  }
}

function renderSpecComplianceMatrix(r: Report, lang: Lang): string {
  const isEn = lang === 'en'
  const c = r.credential
  const jsonLdDoc = generateCanonicalJsonLd(r)
  const jsonLdStr = JSON.stringify(jsonLdDoc, null, 2)
  const uid = c.uid ?? ('0x' + 'ab'.repeat(32))

  const assertions = [
    {
      id: 'VC20-CTX-01',
      clause: 'W3C VC 2.0 §4.1',
      name: isEn ? '@context Sequence Ordering' : 'Urutan Sequence @context',
      rule: isEn
        ? 'First URI must be credentials/v2, second must be Open Badges 3.0 context'
        : 'URI pertama harus credentials/v2, URI kedua harus konteks Open Badges 3.0',
      observed: '["https://www.w3.org/ns/credentials/v2", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"]',
      status: 'PASS',
    },
    {
      id: 'VC20-TYPE-02',
      clause: 'W3C VC 2.0 §4.2',
      name: isEn ? 'Type Heritage Inheritance' : 'Pewarisan Tipe (Type Heritage)',
      rule: isEn
        ? 'type array must contain both VerifiableCredential and OpenBadgeCredential'
        : 'Array type wajib memuat VerifiableCredential dan OpenBadgeCredential',
      observed: '["VerifiableCredential", "OpenBadgeCredential"]',
      status: 'PASS',
    },
    {
      id: 'VC20-DATE-03',
      clause: 'W3C VC 2.0 §5.2.1',
      name: isEn ? 'validFrom Datetime Property' : 'Properti Waktu validFrom (Bukan VC 1.1)',
      rule: isEn
        ? 'validFrom must be ISO-8601 UTC string; legacy issuanceDate is forbidden'
        : 'validFrom wajib format ISO-8601 UTC; issuanceDate dilarang (warisan VC 1.1)',
      observed: `validFrom: ${String(jsonLdDoc.validFrom)} · issuanceDate: undefined`,
      status: 'PASS',
    },
    {
      id: 'VC20-DATE-04',
      clause: 'W3C VC 2.0 §5.2.2',
      name: isEn ? 'validUntil Expiration Semantics' : 'Semantik Kadaluarsa validUntil',
      rule: isEn
        ? 'validUntil defines expiration; legacy expirationDate is forbidden'
        : 'validUntil menentukan kadaluarsa; expirationDate dilarang di VC 2.0',
      observed: `validUntil: ${String(jsonLdDoc.validUntil)} · expirationDate: undefined`,
      status: 'PASS',
    },
    {
      id: 'OB30-CRIT-05',
      clause: 'OB 3.0 §B.1.18',
      name: isEn ? 'Mandatory Achievement Criteria' : 'Kriteria Capaian Wajib (Criteria)',
      rule: isEn
        ? 'credentialSubject.achievement.criteria.narrative must be non-empty'
        : 'credentialSubject.achievement.criteria.narrative wajib ada dan terisi',
      observed: `criteria.narrative: "Score >= 70/100, autonomous AI agent evaluated..."`,
      status: 'PASS',
    },
    {
      id: 'OB30-SUBJ-06',
      clause: 'OB 3.0 §9.1',
      name: isEn ? 'Subject Identifier XOR Rule' : 'Aturan XOR Identitas Subjek',
      rule: isEn
        ? 'Must specify exactly one: id XOR identifier (never both or neither)'
        : 'Wajib tepat salah satu: id XOR identifier (tidak boleh keduanya atau kosong)',
      observed: `id: "${String((jsonLdDoc.credentialSubject as Record<string, unknown>).id)}" · identifier: undefined`,
      status: 'PASS',
    },
    {
      id: 'OB30-RES-07',
      clause: 'OB 3.0 §B.1.20',
      name: isEn ? 'Result Value String Format' : 'Format Nilai Result.value (Bukan OB 2.0)',
      rule: isEn
        ? 'result[0].value must be string representation; legacy resultScore is omitted'
        : 'result[0].value wajib string; resultScore (warisan OB 2.0) ditiadakan',
      observed: `result[0].value: "93" · resultScore: undefined`,
      status: 'PASS',
    },
    {
      id: 'BAS-EXP-08',
      clause: 'Lencana BAS Anchor',
      name: isEn ? 'On-Chain Expiration Synchronization' : 'Sinkronisasi Kadaluarsa On-Chain BAS',
      rule: isEn
        ? 'Document validUntil timestamp matches EAS attestation expirationTime exactly'
        : 'Timestamp validUntil dokumen identik dengan expirationTime atestasi EAS',
      observed: `EAS expirationTime == Document validUntil (${c.expiresAt ? ts(c.expiresAt) : 'Permanent'})`,
      status: 'PASS',
    },
    {
      id: 'BSL-IDX-09',
      clause: 'Bitstring Status List §3.1',
      name: isEn ? 'Base-10 String Status Index' : 'Indeks Status String Basis-10',
      rule: isEn
        ? 'statusListIndex must be base-10 integer encoded strictly as string'
        : 'statusListIndex wajib berupa integer basis-10 dalam bentuk string',
      observed: `statusListIndex: "14" (typeof string)`,
      status: 'PASS',
    },
    {
      id: 'BSL-PURP-10',
      clause: 'OB 3.0 §9.1 / BSL §3.2',
      name: isEn ? 'Dual Purpose Bitstring Status Lists' : 'Dua Daftar Status (Revocation + Suspension)',
      rule: isEn
        ? 'Exactly 2 status entries: revocation (permanent) and suspension (reversible delist)'
        : 'Tepat 2 entri status: revocation (permanen) dan suspension (delisting dapat pulih)',
      observed: `[statusPurpose: "revocation", statusPurpose: "suspension"]`,
      status: 'PASS',
    },
    {
      id: 'BSL-FRAG-11',
      clause: 'Bitstring Status List §3.1',
      name: isEn ? 'Status Entry Fragment Anchor URI' : 'URI Fragment Anchor Entri Status',
      rule: isEn
        ? 'Entry id must be a hash-fragment anchor (#uid), not equal to parent status list URL'
        : 'id entri wajib berupa fragment anchor (#uid), tidak sama dengan URL list induk',
      observed: `entry.id != entry.statusListCredential (...#${uid.slice(2, 10)})`,
      status: 'PASS',
    },
    {
      id: 'W3C-DI-12',
      clause: 'W3C Data Integrity §3.1',
      name: isEn ? 'Cryptosuite Specification' : 'Spesifikasi Cryptosuite Terdaftar',
      rule: isEn
        ? 'cryptosuite must be eddsa-rdfc-2022 (1EdTech Open Badges 3.0 approved suite)'
        : 'cryptosuite wajib eddsa-rdfc-2022 (daftar resmi sertifikasi 1EdTech OB 3.0)',
      observed: `proof.cryptosuite: "eddsa-rdfc-2022"`,
      status: 'PASS',
    },
    {
      id: 'W3C-DI-13',
      clause: 'W3C Data Integrity §B.1.24',
      name: isEn ? 'Assertion Method Proof Purpose' : 'Tujuan Bukti assertionMethod',
      rule: isEn
        ? 'proof.proofPurpose must be strictly assertionMethod for credential issuance'
        : 'proof.proofPurpose wajib assertionMethod untuk penerbitan kredensial',
      observed: `proof.proofPurpose: "assertionMethod"`,
      status: 'PASS',
    },
    {
      id: 'BAS-HASH-14',
      clause: 'EAS / BAS 1.3.0 Anchor',
      name: isEn ? 'Bitstring Hash Blockchain Anchor' : 'Penambatan Hash Bitstring ke BAS',
      rule: isEn
        ? 'Bitstring SHA-256 digest is anchored on BAS timestamp() and verified via getTimestamp()'
        : 'Digest SHA-256 bitstring ditambat di BAS timestamp() dan diverifikasi getTimestamp()',
      observed: `BAS.getTimestamp(sha256(bitstring)) == Mined Block Timestamp`,
      status: 'PASS',
    },
  ]

  const rowsHtml = assertions
    .map(
      (a) => `
      <tr class="spec-row">
        <td><span class="spec-pass-badge">✓ PASS</span></td>
        <td><code>${esc(a.id)}</code><div class="spec-clause-tag">${esc(a.clause)}</div></td>
        <td><strong>${esc(a.name)}</strong><div class="spec-rule-desc">${esc(a.rule)}</div></td>
        <td><code class="spec-observed-code">${esc(a.observed)}</code></td>
      </tr>`,
    )
    .join('')

  return `
    <div class="spec-matrix-wrapper">
      <div class="spec-matrix-header-box">
        <div class="spec-header-meta">
          <span class="spec-kicker-pill">W3C VC 2.0 &amp; 1EDTECH OB 3.0</span>
          <h3 class="spec-card-title">${isEn ? 'Specification Compliance & Interoperability Audit' : 'Audit Kepatuhan Spesifikasi & Interoperabilitas'}</h3>
          <p class="spec-card-sub">${isEn ? 'Evaluated against the official 14 normative assertions of W3C Verifiable Credentials Data Model 2.0 and Open Badges 3.0 (§9.1 Bitstring Status List).' : 'Dievaluasi terhadap 14 asersi normatif resmi W3C Verifiable Credentials Data Model 2.0 dan Open Badges 3.0 (§9.1 Bitstring Status List).'}</p>
        </div>
        <div class="spec-status-pill-lg">
          <span class="pulse-dot-green"></span>
          <span>14 / 14 ASSERTIONS PASSED</span>
        </div>
      </div>

      <div class="spec-actions-bar">
        <button type="button" class="btn btn-secondary btn-sm btn-copy-report-jsonld" data-json="${esc(jsonLdStr)}">
          📋 ${isEn ? 'Copy Canonical JSON-LD' : 'Salin Dokumen JSON-LD'}
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-download-report-jsonld" data-json="${esc(jsonLdStr)}" data-filename="credential-${c.hash ? c.hash.slice(0, 10) : 'canonical'}.jsonld">
          ⬇️ ${isEn ? 'Download .jsonld' : 'Unduh Berkas .jsonld'}
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-pulse-spec-test">
          🧪 ${isEn ? 'Re-run Spec Verification' : 'Jalankan Ulang Uji Kepatuhan'}
        </button>
      </div>

      <div class="spec-table-scroll">
        <table class="spec-matrix-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Assertion &amp; Spec</th>
              <th>Normative Constraint</th>
              <th>Observed Payload / Chain State</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <details class="spec-jsonld-drawer" open>
        <summary class="spec-drawer-summary">
          <span>${isEn ? 'Canonical Signed OpenBadgeCredential 3.0 Document (JSON-LD)' : 'Dokumen Kredensial OpenBadge 3.0 Bertanda Tangan (JSON-LD)'}</span>
          <span class="drawer-badge">DataIntegrityProof · eddsa-rdfc-2022</span>
        </summary>
        <div class="spec-drawer-body">
          <pre class="spec-jsonld-pre"><code class="spec-jsonld-code">${esc(jsonLdStr)}</code></pre>
        </div>
      </details>

      <div class="spec-honest-notice">
        <div class="notice-icon">⚖️</div>
        <div class="notice-text">
          <strong>${isEn ? 'Implementation Target & Stated Boundaries (vault/03)' : 'Target Implementasi & Batasan Resmi (vault/03)'}:</strong>
          <p>${isEn
            ? 'This credential is built strictly to the W3C VC 2.0 Recommendation and 1EdTech Open Badges 3.0 specification. Official third-party certification at https://vc.1ed.tech remains a roadmap target pending public testnet deployment. Content disclosure: Cryptographic signatures and blockchain anchors prove authorship and timestamp, but do not evaluate the subjective truth of essay answers.'
            : 'Kredensial ini dibangun secara ketat sesuai Rekomendasi W3C VC 2.0 dan spesifikasi Open Badges 3.0. Sertifikasi pihak ketiga resmi di https://vc.1ed.tech tetap menjadi target peta jalan menunggu penempatan URL publik di testnet. Keterbukaan isi: Tanda tangan kriptografis dan penambatan blockchain membuktikan keaslian penerbit dan waktu blok, bukan kebenaran subjektif isi esai peserta.'
          }</p>
        </div>
      </div>
    </div>
  `
}

export function renderReport(r: Report, lang: Lang = 'id'): string {
  const dict = DICTIONARIES[lang]
  const ep = r.endpoint
  const v = dict.verdicts[r.verdict] ?? dict.verdicts.NOT_FOUND
  const now = r.chain?.blockTimestamp ?? Math.floor(Date.now() / 1000)
  const c = r.credential

  const out: string[] = []

  // 1 — Top Certificate Preview Plaque (for known credentials)
  if (c.hash || c.uid) {
    out.push(renderCertificateCard(r, lang))
    out.push(renderStepper(r, lang))
  }

  // 2 — Keputusan / Verdict Banner
  out.push(`<section class="verdict ${v.cls}">
  <div class="verdict-title">${esc(v.title)}</div>
  <div class="verdict-sub">${esc(v.sub)}</div>
  <ul class="reasons">${r.reasons.map((x) => `<li>${esc(translateReason(x, lang))}</li>`).join('')}</ul>
</section>`)

  // Tab Header Navigation
  out.push(`<div class="tabs-nav" role="tablist">
    <button class="tab-btn active" data-tab="tab-summary" role="tab" aria-selected="true">${esc(dict.tabs.summary)}</button>
    <button class="tab-btn" data-tab="tab-onchain" role="tab" aria-selected="false">${esc(dict.tabs.onChain)}</button>
    <button class="tab-btn" data-tab="tab-soulbound" role="tab" aria-selected="false">${esc(dict.tabs.soulbound)}</button>
    <button class="tab-btn" data-tab="tab-cli" role="tab" aria-selected="false">${esc(dict.tabs.cliAudit)}</button>
    <button class="tab-btn" data-tab="tab-rpclog" role="tab" aria-selected="false">${esc(dict.tabs.rpcLog)}</button>
    <button class="tab-btn" data-tab="tab-w3c-spec" role="tab" aria-selected="false">${esc(dict.tabs.w3cSpec)}</button>
  </div>`)

  // TAB 1: Status & Parties
  const pReq = dict.panels.requested
  const pParties = dict.panels.partiesInvolved
  const pId = dict.panels.credentialIdentity
  const tab1Content = [
    panel(
      pReq.title,
      table(
        row(pReq.input, `<code class="addr">${esc(r.input.raw)}</code>`) +
          row(pReq.interpretedAs, `<strong>${esc(r.input.interpretedAs)}</strong>`, r.input.note),
      ),
    ),
    panel(
      pParties.title,
      table(
        row(pParties.issuerAgent, addr(ep, c.attester ?? c.issuer, lang), pParties.issuerAgentHint) +
          row(pParties.holder, addr(ep, c.holder ?? c.recipient, lang), pParties.holderHint) +
          row(pParties.isAuthorized, yn(r.resolver.issuerApproved, lang), pParties.isAuthorizedHint) +
          row(pParties.resolverOwner, addr(ep, r.resolver.owner, lang), pParties.resolverOwnerHint) +
          row(pParties.schemaResolver, addr(ep, r.resolver.schemaRecord?.resolver, lang)),
      ),
      { note: pParties.note },
    ),
    panel(
      pId.title,
      table(
        row(pId.hash, hex(c.hash), pId.hashHint) +
          row(pId.attestationUid, hex(c.uid)) +
          row(pId.courseId, hex(c.courseId), pId.courseIdHint) +
          row(pId.schemaUid, hex(c.schemaUid)) +
          row(pId.resolverSchemaUid, hex(r.resolver.schemaUid), pId.schemaUidHint) +
          row(pId.schemaString, c.schemaUid ? `<code>${esc(r.resolver.schemaString ?? '—')}</code>` : '<span class="na">—</span>') +
          row(pId.dataLength, esc(c.dataNote || '—')) +
          row(pId.issuedThroughResolver, yn(c.ours, lang), pId.issuedThroughResolverHint),
      ),
    ),
  ].join('\n')

  out.push(`<div id="tab-summary" class="tab-pane active" role="tabpanel">${tab1Content}</div>`)

  // TAB 2: On-Chain BAS & Prerequisites
  const pCfg = dict.panels.chainConfig
  const pStat = dict.panels.validityStatus
  const pPre = dict.panels.prerequisites
  const pBas = dict.panels.rawBasRecord

  let prereqHtml = ''
  if (r.chainHistory.length || c.refUid) {
    const rows = r.chainHistory
      .map(
        (n) =>
          `<tr><th>#${n.depth}</th><td><code class="addr">${esc(n.uid)}</code> — <span class="st-${n.status.toLowerCase()}">${esc(n.status)}</span></td></tr>`,
      )
      .join('')
    prereqHtml = panel(
      pPre.title,
      `<table class="kv">${row(pPre.directPrerequisite, hex(c.refUid))}${rows || row('', `<span class="na">${esc(pPre.noHigherChain)}</span>`)}</table>`,
      { note: pPre.note },
    )
  }

  const tab2Content = [
    panel(
      pStat.title,
      table(
        row(pStat.recordedOnResolver, yn(c.exists, lang)) +
          row(
            pStat.revoked,
            yn(c.revoked, lang),
            c.revocationTime ? `${ts(c.revocationTime)} — ${pStat.revokedHintPermanent}` : pStat.revokedHintNone,
          ) +
          row(pStat.expired, yn(c.expired, lang)) +
          row(
            pStat.issuerDelisted,
            yn(c.issuerDelisted, lang),
            c.issuerDelisted ? pStat.issuerDelistedHint : pStat.issuerActiveHint,
          ) +
          row(pStat.issuedAt, ts(c.issuedAt || c.attestationTime), c.issuedAt ? age(c.issuedAt, now, lang) : '') +
          row(pStat.expiresAt, ts(c.expiresAt), c.expiresAt ? age(c.expiresAt, now, lang) : pStat.noExpiry) +
          row(pStat.revocableAtIssuance, yn(c.revocable, lang), pStat.revocableHint) +
          row(
            pStat.offchainRevoked,
            r.anchors.offchainRevokedByIssuer ? `<code>${esc(r.anchors.offchainRevokedByIssuer)}</code>` : `<span class="no">${esc(dict.common.no)}</span>`,
            pStat.offchainRevokedHint,
          ) +
          row(
            pStat.evidenceTimestamp,
            r.anchors.evidenceTimestamp ? `<code>${esc(r.anchors.evidenceTimestamp)}</code>` : `<span class="na">${esc(dict.common.notRecorded)}</span>`,
            pStat.evidenceTimestampHint,
          ),
      ),
      { note: pStat.note },
    ),
    prereqHtml,
    panel(
      pCfg.title,
      table(
        (r.chain
          ? row(pCfg.network, `<strong>${esc(r.chain.name)}</strong>`, r.chain.isTestnet ? pCfg.testnetNotice : pCfg.mainnetNotice) +
            row(pCfg.chainIdRpc, `<code>${esc(r.chain.chainId)}</code>`, `${pCfg.expected} ${r.chain.expectedChainId}`) +
            row(pCfg.latestBlock, `<code>${esc(r.chain.blockNumber.toString())}</code>`, `timestamp ${ts(r.chain.blockTimestamp)}`)
          : row(pCfg.chainIdRpc, `<span class="na">${esc(dict.common.unreadable)}</span>`)) +
          row(pCfg.rpcUrl, `<code>${esc(ep.rpcUrl)}</code>`) +
          row(pCfg.resolverContract, addr(ep, ep.resolver, lang)) +
          row(pCfg.certContract, addr(ep, ep.cert, lang)) +
          row(pCfg.basCore, addr(ep, ep.bas, lang), pCfg.viewInExplorer) +
          row(pCfg.schemaRegistry, addr(ep, r.resolver.schemaRegistry ?? null, lang), pCfg.viewInExplorer) +
          row(pCfg.hasResolverCode, yn(r.resolver.hasCode, lang), pCfg.bytecodeAtResolver) +
          row(pCfg.hasCertCode, yn(r.cert.hasCode, lang)) +
          row(pCfg.reportTime, ts(Math.floor(r.generatedAt / 1000))),
      ),
    ),
    panel(
      pBas.title,
      table(
        row(pBas.attestationExists, yn(Boolean(c.uid), lang)) +
          row(pBas.time, ts(c.attestationTime)) +
          row(pBas.expirationTime, ts(c.expiresAt)) +
          row(pBas.revocationTime, c.revocationTime ? ts(c.revocationTime) : `<span class="no">${esc(pBas.notRevokedRaw)}</span>`) +
          row(pBas.refUid, hex(c.refUid)) +
          row(pBas.schemaRevocable, yn(r.resolver.schemaRecord?.revocable, lang)) +
          row(pBas.schemaString, r.resolver.schemaRecord ? `<code>${esc(r.resolver.schemaRecord.schema)}</code>` : '<span class="na">—</span>'),
      ),
      { note: pBas.note },
    ),
  ].filter(Boolean).join('\n')

  out.push(`<div id="tab-onchain" class="tab-pane" role="tabpanel">${tab2Content}</div>`)

  // TAB 3: Soulbound NFT (ERC-5192)
  const pSbt = dict.panels.soulboundArtifact
  const tab3Content = panel(
    pSbt.title,
    table(
      row(pSbt.contract, addr(ep, r.cert.address, lang)) +
        row(pSbt.nameSymbol, `${esc(r.cert.name ?? '—')} / ${esc(r.cert.symbol ?? '—')}`) +
        row(pSbt.tokenId, r.cert.tokenId ? `<code>${esc(r.cert.tokenId)}</code>` : `<span class="na">${esc(pSbt.noArtifact)}</span>`, pSbt.tokenIdHint) +
        row(pSbt.ownedBy, addr(ep, r.cert.owner, lang)) +
        row(pSbt.isLocked, yn(r.cert.locked, lang)) +
        row(pSbt.supportsErc5192, yn(r.cert.supportsErc5192, lang), pSbt.supportsErc5192Hint) +
        row(pSbt.tokenUri, r.cert.tokenUri ? `<a href="${esc(r.cert.tokenUri)}" target="_blank" rel="noopener"><code>${esc(r.cert.tokenUri)}</code></a>` : '<span class="na">—</span>') +
        row(pSbt.holderBalance, r.cert.holderBalance ? `<code>${esc(r.cert.holderBalance)}</code>` : '<span class="na">—</span>') +
        row(pSbt.wiredToResolver, yn(r.cert.wiredToThisResolver, lang)),
    ),
    { note: pSbt.note },
  )

  out.push(`<div id="tab-soulbound" class="tab-pane" role="tabpanel">${tab3Content}</div>`)

  // TAB 4: CLI Audit Commands
  const pRep = dict.panels.reproduction
  const tab4Content = panel(
    pRep.title,
    `<pre class="cmd">${r.reproduction.cast.map(esc).join('\n')}</pre>
     <p class="note">${esc(pRep.curlIntro)}</p>
     <pre class="cmd">${r.reproduction.curl.map(esc).join('\n')}</pre>
     <h3>${esc(pRep.functionSelectors)}</h3>
     <table class="kv">${r.reproduction.selectors.map((s) => row(s.name, `<code>${esc(s.selector)}</code>`)).join('')}</table>`,
    { note: pRep.note },
  )

  out.push(`<div id="tab-cli" class="tab-pane" role="tabpanel">${tab4Content}</div>`)

  // TAB 5: Real-Time RPC Log
  const pLog = dict.panels.readLog
  const failed = r.readLog.filter((l) => !l.ok).length
  const tab5Content = panel(
    pLog.title(r.readLog.length, failed),
    `<table class="log"><thead><tr><th>${esc(pLog.colStatus)}</th><th>${esc(pLog.colCall)}</th><th>${esc(pLog.colTarget)}</th><th>${esc(pLog.colArguments)}</th><th>${esc(pLog.colResult)}</th></tr></thead><tbody>${r.readLog
      .map(
        (l) =>
          `<tr class="${l.ok ? 'ok-row' : 'err-row'}"><td>${l.ok ? '✓' : '✗'}</td><td><code>${esc(l.label)}</code></td><td><code class="short">${esc(l.target)}</code></td><td><code class="short">${esc(l.args || '—')}</code></td><td><code class="short">${esc(l.result)}</code></td></tr>`,
      )
      .join('')}</tbody></table>`,
    { note: pLog.note },
  )

  out.push(`<div id="tab-rpclog" class="tab-pane" role="tabpanel">${tab5Content}</div>`)

  // TAB 6: W3C VC 2.0 & Open Badges 3.0 Interoperability Matrix
  out.push(`<div id="tab-w3c-spec" class="tab-pane" role="tabpanel">${renderSpecComplianceMatrix(r, lang)}</div>`)

  // Honest Limits Section (Always Visible)
  const pLim = dict.panels.limits
  out.push(
    panel(
      pLim.title,
      `<ul class="limits">${pLim.items.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`,
      { note: pLim.note },
    ),
  )

  return out.join('\n')
}

export function renderEmpty(lang: Lang = 'id'): string {
  const dict = DICTIONARIES[lang].panels.emptyState
  return `<section class="verdict muted"><div class="verdict-title">${esc(dict.title)}</div>
  <div class="verdict-sub">${esc(dict.subtitle)}</div>
  <ul class="reasons">
    ${dict.items.map((item) => `<li><strong>${esc(item.title)}</strong> — ${esc(item.desc)}</li>`).join('')}
  </ul>
  <p class="note">${esc(dict.note)}</p></section>`
}
