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
