/**
 * Lencana i18n — Single source of truth for all UI strings.
 *
 * Requirements:
 * - Complete EdTech & LMS + Credential Verification portal strings.
 * - Default language: English ('en').
 * - Support Indonesian ('id') for local HR staff, educators, and learners.
 * - Persist choice in localStorage.
 * - Keep on-chain addresses, hashes, and verbatim specification citations untranslated.
 */

export type Lang = 'en' | 'id'

export const DEFAULT_LANG: Lang = 'en'
const STORAGE_KEY = 'lencana_lang'

export function getSavedLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'id') return saved
  } catch {
    // ignore
  }
  return DEFAULT_LANG
}

export function saveLanguage(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  } catch {
    // ignore
  }
}

export interface TranslationDictionary {
  appName: string
  tagline: string
  description: string
  nav: {
    courses: string
    howItWorks: string
    evaluator: string
    agents: string
    verifier: string
    techEdge: string
  }
  hero: {
    eyebrow: string
    titleLine1: string
    titleLine2: string
    subtitle: string
    btnExplore: string
    btnVerify: string
    statCourses: string
    statCoursesLabel: string
    statVerification: string
    statVerificationLabel: string
    statStandard: string
    statStandardLabel: string
    kineticWord1: string
    kineticWord2: string
    kineticWord3: string
    badgeText: string
    feat1Heading: string
    feat1Sub: string
    feat2Heading: string
    feat2Sub: string
    feat3Heading: string
    feat3Sub: string
  }
  aiEvaluator: {
    sectionTitle: string
    sectionSub: string
    tabWeb3: string
    tabSecurity: string
    tabCustom: string
    rubricPreviewLabel: string
    rubricWeight1: string
    rubricWeight2: string
    rubricWeight3: string
    btnRunEval: string
    agentHeaderTitle: string
    agentStatusOnline: string
    terminalTitle: string
    crit1Name: string
    crit2Name: string
    crit3Name: string
    totalScoreLabel: string
    honorsPass: string
    eip712Title: string
    btnVerifyLive: string
  }
  agentRoster: {
    sectionTitle: string
    sectionSub: string
    whitelistedPill: string
    agent1Name: string
    agent1Role: string
    agent1Desc: string
    agent1Stat: string
    agent2Name: string
    agent2Role: string
    agent2Desc: string
    agent2Stat: string
    agent3Name: string
    agent3Role: string
    agent3Desc: string
    agent3Stat: string
  }
  visualPipeline: {
    sectionTitle: string
    sectionSub: string
    node1: string
    node2: string
    node3: string
    node4: string
    node5: string
  }
  learningLoop: {
    sectionTitle: string
    sectionSub: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
  }
  coursesSection: {
    sectionKicker: string
    sectionTitle: string
    sectionSub: string
    learnerProfileName: string
    learnerSubInfo: string
    privacyLabel: string
    privacyPseudo: string
    privacyNamed: string
    stat1Title: string
    stat1Desc: string
    stat2Title: string
    stat2Desc: string
    stat3Title: string
    stat3Desc: string
    availableHeading: string
    activeCoursesTag: string
    badgeLevelBeginner: string
    badgeLevelAdvanced: string
    badgeSoulbound: string
    badgePrereqRequired: string
    badgeUnlocked: string
    course1Title: string
    course1Desc: string
    course1Rubric: string
    course2Title: string
    course2Desc: string
    course2Rubric: string
    courseIssuerAgent: string
    btnOpenStudy: string
    btnViewSyllabus: string
    btnEnroll: string
    studyModalKicker: string
    studyModalProceed: string
  }
  bentoSection: {
    sectionTitle: string
    sectionSub: string
    card1Title: string
    card1Desc: string
    card2Title: string
    card2Desc: string
    card3Title: string
    card3Desc: string
    card4Title: string
    card4Desc: string
  }
  tabs: {
    summary: string
    onChain: string
    soulbound: string
    cliAudit: string
    rpcLog: string
  }
  bannerNotDeployed: {
    title: string
    body: string
    hint: string
    honestNote: string
  }
  inputSection: {
    sectionTitle: string
    sectionSub: string
    label: string
    placeholder: string
    btnVerify: string
    btnClear: string
    btnShare: string
    btnSample: string
    sampleValid: string
    sampleRevoked: string
    sampleDelisted: string
    statusReading: string
    statusFailed: string
    statusSummary: (verdict: string, totalCalls: number, failedCalls: number, durationMs: number, blockNumber: string | number) => string
    linkCopied: string
  }
  configSection: {
    summary: string
    presetLabel: string
    rpcUrlLabel: string
    resolverLabel: string
    certLabel: string
    basLabel: string
    chainIdLabel: string
    displayNameLabel: string
    btnApply: string
    note: string
  }
  verdicts: Record<string, { title: string; sub: string; cls: string }>
  panels: {
    requested: { title: string; input: string; interpretedAs: string }
    chainConfig: {
      title: string
      network: string
      testnetNotice: string
      mainnetNotice: string
      chainIdRpc: string
      expected: string
      latestBlock: string
      rpcUrl: string
      resolverContract: string
      certContract: string
      basCore: string
      schemaRegistry: string
      hasResolverCode: string
      hasCertCode: string
      reportTime: string
      viewInExplorer: string
      bytecodeAtResolver: string
    }
    credentialIdentity: {
      title: string
      hash: string
      hashHint: string
      attestationUid: string
      courseId: string
      courseIdHint: string
      schemaUid: string
      resolverSchemaUid: string
      schemaUidHint: string
      schemaString: string
      dataLength: string
      issuedThroughResolver: string
      issuedThroughResolverHint: string
    }
    validityStatus: {
      title: string
      note: string
      recordedOnResolver: string
      revoked: string
      revokedHintPermanent: string
      revokedHintNone: string
      expired: string
      issuerDelisted: string
      issuerDelistedHint: string
      issuerActiveHint: string
      issuedAt: string
      expiresAt: string
      noExpiry: string
      revocableAtIssuance: string
      revocableHint: string
      offchainRevoked: string
      offchainRevokedHint: string
      evidenceTimestamp: string
      evidenceTimestampHint: string
    }
    partiesInvolved: {
      title: string
      note: string
      issuerAgent: string
      issuerAgentHint: string
      holder: string
      holderHint: string
      isAuthorized: string
      isAuthorizedHint: string
      resolverOwner: string
      resolverOwnerHint: string
      schemaResolver: string
    }
    prerequisites: {
      title: string
      note: string
      directPrerequisite: string
      noHigherChain: string
      depthHeader: string
    }
    soulboundArtifact: {
      title: string
      note: string
      contract: string
      nameSymbol: string
      tokenId: string
      tokenIdHint: string
      noArtifact: string
      ownedBy: string
      isLocked: string
      supportsErc5192: string
      supportsErc5192Hint: string
      tokenUri: string
      holderBalance: string
      wiredToResolver: string
    }
    rawBasRecord: {
      title: string
      note: string
      attestationExists: string
      time: string
      expirationTime: string
      revocationTime: string
      notRevokedRaw: string
      refUid: string
      schemaRevocable: string
      schemaString: string
    }
    reproduction: {
      title: string
      note: string
      curlIntro: string
      functionSelectors: string
    }
    readLog: {
      title: (total: number, failed: number) => string
      note: string
      colStatus: string
      colCall: string
      colTarget: string
      colArguments: string
      colResult: string
    }
    limits: {
      title: string
      note: string
      items: string[]
    }
    emptyState: {
      title: string
      subtitle: string
      items: { title: string; desc: string }[]
      note: string
    }
  }
  footer: string
  common: {
    yes: string
    no: string
    unreadable: string
    notRecorded: string
    today: string
    daysAgo: (d: number) => string
    daysAhead: (d: number) => string
    copy: string
    copied: string
  }
}

export const DICTIONARIES: Record<Lang, TranslationDictionary> = {
  en: {
    appName: 'Lencana',
    tagline: 'AI-Powered Web3 Micro-Courses & Verifiable Credentials',
    description:
      'Learn high-demand Web3 skills evaluated by autonomous AI agents. Earn Open Badges 3.0 credentials anchored to BNB Smart Chain with zero wallet friction.',
    nav: {
      courses: 'Courses',
      howItWorks: 'How It Works',
      evaluator: 'AI Studio',
      agents: 'Agent Hub',
      verifier: 'Verifier',
      techEdge: 'Architecture',
    },
    hero: {
      eyebrow: 'BNB CHAIN · NEXT-GEN WEB3 EDTECH',
      titleLine1: 'Master Web3 Skills.',
      titleLine2: 'Earn Verifiable Credentials.',
      subtitle: 'Autonomous AI credentials that prove your on-chain mastery.',
      btnExplore: 'Explore Micro-Courses',
      btnVerify: 'Verify a Credential',
      statCourses: 'Open Badges 3.0',
      statCoursesLabel: 'W3C Standard Format',
      statVerification: '0 Wallet Required',
      statVerificationLabel: 'Instant Recruiter Verification',
      statStandard: 'EAS 1.3.0 Fork',
      statStandardLabel: 'BNB Attestation Service',
      kineticWord1: 'Proof you',
      kineticWord2: 'can hold.',
      kineticWord3: 'Verifiable credentials',
      badgeText: 'VERIFY ON BNB CHAIN • ZERO WALLET REQUIRED • OPEN BADGES 3.0 • ',
      feat1Heading: 'AI evaluates the work',
      feat1Sub: 'Transparent rubrics turn practice into an earned result.',
      feat2Heading: 'Proof stays intact',
      feat2Sub: 'The result is locked to its learner and cannot quietly change.',
      feat3Heading: 'Anyone can verify',
      feat3Sub: 'Open the proof in a browser. No wallet or account required.',
    },
    aiEvaluator: {
      sectionTitle: 'See how a score is made.',
      sectionSub: 'Choose a response, run the evaluator, and watch each part of the rubric become a signed result.',
      tabWeb3: 'Essay 1: Web3 Primitives',
      tabSecurity: 'Essay 2: Reentrancy Defense',
      tabCustom: 'Essay 3: Custom Essay',
      rubricPreviewLabel: 'Active Assessment Rubric',
      rubricWeight1: 'Analytical Depth (40%)',
      rubricWeight2: 'EVM Technical Precision (30%)',
      rubricWeight3: 'Critical Reasoning (30%)',
      btnRunEval: 'Run AI Agent Evaluation',
      agentHeaderTitle: 'Agent-Demo-EVM (0x8211...7DE)',
      agentStatusOnline: 'ONLINE · WHITELISTED',
      terminalTitle: 'Autonomous Neural Reasoning Console',
      crit1Name: 'Analytical Depth',
      crit2Name: 'EVM Technical Precision',
      crit3Name: 'Critical Architecture Reasoning',
      totalScoreLabel: 'Overall Score',
      honorsPass: 'HONORS PASS (93/100)',
      eip712Title: 'EIP-712 Cryptographic Signature',
      btnVerifyLive: 'Verify This Credential Live on BNB Chain',
    },
    agentRoster: {
      sectionTitle: 'Autonomous Evaluator Agent Roster',
      sectionSub:
        'Specialized domain agents whitelisted directly on CredentialResolver to grade essays and sign on-chain attestations.',
      whitelistedPill: 'WHITELISTED ON RESOLVER',
      agent1Name: 'Agent-Foundations',
      agent1Role: 'EVM Architecture & Blockchain Primitives',
      agent1Desc:
        'Grades essay submissions on cryptographic primitives, state transitions, and verifiable credentials. Authorized signer for Web3 Dasar 2026.',
      agent1Stat: '1,420 Essays Evaluated · 99.8% Consensus',
      agent2Name: 'Agent-Security',
      agent2Role: 'Smart Contract Defense & Prerequisite Integrity',
      agent2Desc:
        'Analyzes vulnerability mitigations, reentrancy guards, and prerequisite tree dependencies. Signs advanced security certifications.',
      agent2Stat: '856 Audits Evaluated · 99.9% Consensus',
      agent3Name: 'Agent-Infrastructure',
      agent3Role: 'BAS Resolvers & ERC-5192 Soulbound Locks',
      agent3Desc:
        'Validates on-chain attestation schema parameters and enforces soulbound non-transferability rules before badge minting.',
      agent3Stat: '640 Badges Anchored · 100% Lock Rate',
    },
    visualPipeline: {
      sectionTitle: 'What makes the proof permanent.',
      sectionSub:
        'Behind one simple link, five checks turn submitted work into a credential that cannot quietly change.',
      node1: 'Work submitted',
      node2: 'Rubric applied',
      node3: 'Result signed',
      node4: 'Status anchored',
      node5: 'Proof stays yours',
    },
    learningLoop: {
      sectionTitle: 'From work to proof.',
      sectionSub: 'Three moments. One credential you can take anywhere.',
      step1Title: 'Do the work',
      step1Desc: 'Complete a practical task that shows what you understand.',
      step2Title: 'See how it was judged',
      step2Desc: 'Every score comes from a visible rubric, not a black box.',
      step3Title: 'Share the proof',
      step3Desc: 'One public link lets anyone check the result.',
    },
    coursesSection: {
      sectionKicker: 'LMS LEARNER DASHBOARD',
      sectionTitle: 'Micro-Courses Marketplace & Study Room',
      sectionSub: 'Curated modular courses evaluated by autonomous AI domain agents with on-chain rubrics.',
      learnerProfileName: 'Rina Oktaviani',
      learnerSubInfo: 'Web3 Architecture Track · BSC Testnet',
      privacyLabel: 'W3C Privacy Mode:',
      privacyPseudo: '🔒 Pseudonymous',
      privacyNamed: '👤 Named Profile',
      stat1Title: 'Active Enrolled Courses',
      stat1Desc: 'Web3 Dasar 2026 & BNB Security. Final essays awaiting evaluation.',
      stat2Title: 'Soulbound Badges Earned',
      stat2Desc: 'W3C Open Badges 3.0 attested on BAS and locked as ERC-5192 NFTs.',
      stat3Title: 'AI Domain Agents Online',
      stat3Desc: 'Whitelisted signers: Foundations, Security, Infrastructure.',
      availableHeading: 'Available Micro-Courses',
      activeCoursesTag: '2 Active Courses',
      badgeLevelBeginner: '2 Hours · Modular',
      badgeLevelAdvanced: '4 Hours · Advanced',
      badgeSoulbound: 'Soulbound Badge',
      badgePrereqRequired: '🔒 Prerequisite: Web3 Dasar',
      badgeUnlocked: '✓ UNLOCKED',
      course1Title: 'Web3 Dasar 2026: Foundations & Architecture',
      course1Desc:
        'Understand blockchain primitives, EVM execution, and verifiable credentials. Complete an analytical essay comparing centralized certificates with on-chain attestations.',
      course1Rubric: 'Rubric: Analytical depth (40%), Technical precision (30%), Critical reasoning (30%). Passing score: 70/100.',
      course2Title: 'BNB Chain Security & Prerequisite Integrity',
      course2Desc:
        'Master access control, resolver hooks, and prerequisite validation chains on BNB Smart Chain. Requires Web3 Dasar 2026 completion to unlock.',
      course2Rubric: 'Rubric: Vulnerability analysis (50%), Architecture defense (30%), Clarity (20%). Passing score: 75/100.',
      courseIssuerAgent: 'AI Agent: Agent-Foundations',
      btnOpenStudy: 'Open Study Room ➔',
      btnViewSyllabus: 'View Syllabus',
      btnEnroll: 'Start Course',
      studyModalKicker: 'STUDY ROOM · INTERACTIVE LESSON',
      studyModalProceed: 'Proceed to AI Essay Evaluation ➔',
    },
    bentoSection: {
      sectionTitle: 'Why Lencana is Technically Differentiable',
      sectionSub: 'Closing real industry loopholes with deliberate cryptographic architecture.',
      card1Title: 'AI Agent as Issuer, Never Verifier',
      card1Desc:
        'AI agents provide subjective, rich grading on essays. Verification remains 100% deterministic and static: math and hashes only, never probabilistic AI.',
      card2Title: 'Closing EAS Prerequisite Loopholes',
      card2Desc:
        'Plain EAS only checks if a prerequisite attestation exists. Lencana enforces that prerequisites are alive, unrevoked, unexpired, and belong to the same learner.',
      card3Title: 'Soulbound ERC-5192 Artifacts',
      card3Desc:
        'The verifiable credential is the signed JSON document; the Soulbound NFT is the learner’s showcase artifact. Transfer, approval, and burning are strictly rejected.',
      card4Title: 'Zero-Wallet Public Verification',
      card4Desc:
        'Recruiters do not need crypto, MetaMask, or accounts. A single browser eth_call checks the live chain directly, independent of our backend.',
    },
    tabs: {
      summary: 'Status & Parties',
      onChain: 'BAS Attestation & Prerequisites',
      soulbound: 'Soulbound NFT (ERC-5192)',
      cliAudit: 'CLI Reproduction Commands',
      rpcLog: 'Real-Time RPC Log',
    },
    bannerNotDeployed: {
      title: 'Our on-chain layer is not yet broadcast to this public chain.',
      body: '47 offline/fork tests pass on chain 97 and 56 against officially deployed BAS, but the CredentialResolver and SoulboundCert addresses are empty on this preset.',
      hint: 'Configure addresses in Reader Configuration once deployed.',
      honestNote: 'This dApp deliberately refuses mock data: fake green indicators are worse than an honest empty result.',
    },
    inputSection: {
      sectionTitle: 'Instant Credential Verifier Sandbox',
      sectionSub: 'Paste any credential identifier below or click a quick sample to run live verification against BNB Smart Chain.',
      label: 'Input Identifier',
      placeholder: '0x… (credentialHash or attestation UID), decimal number (tokenId), or 0x… (address)',
      btnVerify: 'Verify',
      btnClear: 'Clear',
      btnShare: 'Copy Share Link',
      btnSample: 'Load Sample Format',
      sampleValid: 'Valid Credential',
      sampleRevoked: 'Revoked Credential',
      sampleDelisted: 'Delisted Issuer',
      statusReading: 'Querying blockchain node…',
      statusFailed: 'Verification failed: ',
      statusSummary: (verdict, total, failed, ms, block) =>
        `${verdict} · ${total} on-chain calls${failed ? `, ${failed} failed` : ''} · ${ms} ms · block ${block}`,
      linkCopied: 'Link copied to clipboard!',
    },
    configSection: {
      summary: 'Reader Configuration (RPC & Contract Addresses)',
      presetLabel: 'Network Preset',
      rpcUrlLabel: 'RPC URL',
      resolverLabel: 'CredentialResolver Address',
      certLabel: 'SoulboundCert Address',
      basLabel: 'BAS Core (EAS 1.3.0 deployment)',
      chainIdLabel: 'Expected Chain ID',
      displayNameLabel: 'Display Network Name',
      btnApply: 'Apply & Re-verify',
      note: 'The chain ID returned by the RPC is always checked against the expected chain ID. If mismatched, results are strictly rejected — reading another chain is zero evidence.',
    },
    verdicts: {
      VALID: {
        title: 'VALID',
        sub: 'Credential is active, whitelisted, and cryptographically verified on-chain',
        cls: 'ok',
      },
      REVOKED: {
        title: 'REVOKED',
        sub: 'Was once issued, but revoked by the original issuer — revocation is permanent',
        cls: 'bad',
      },
      EXPIRED: {
        title: 'EXPIRED',
        sub: 'Validity period has elapsed on-chain without any human alteration',
        cls: 'warn',
      },
      ISSUER_DELISTED: {
        title: 'ISSUER DELISTED',
        sub: 'The platform revoked the issuer agent from the whitelist — attestation itself remains unrevoked on BAS',
        cls: 'bad',
      },
      NOT_FOUND: {
        title: 'NOT FOUND',
        sub: 'Never issued through this credential resolver or unrecognized input',
        cls: 'bad',
      },
      WRONG_CHAIN: {
        title: 'CHAIN ID MISMATCH',
        sub: 'Refusing to display results from an unexpected network',
        cls: 'bad',
      },
      NOT_CONFIGURED: {
        title: 'NOT CONFIGURED',
        sub: 'Contract addresses are missing in the active configuration preset',
        cls: 'muted',
      },
      UNREACHABLE: {
        title: 'RPC UNREACHABLE',
        sub: 'Addresses are configured, but the RPC endpoint is not responding',
        cls: 'warn',
      },
    },
    panels: {
      requested: {
        title: 'Query Input',
        input: 'Raw Input',
        interpretedAs: 'Interpreted As',
      },
      chainConfig: {
        title: 'Chain & Reader Configuration',
        network: 'Network',
        testnetNotice: 'Testnet — numbers here hold no economic value',
        mainnetNotice: 'Mainnet Production',
        chainIdRpc: 'Chain ID (from RPC)',
        expected: 'expected',
        latestBlock: 'Latest Block',
        rpcUrl: 'RPC Endpoint',
        resolverContract: 'CredentialResolver (Our Contract)',
        certContract: 'SoulboundCert (Our Contract)',
        basCore: 'BAS Core (BNB Attestation Service)',
        schemaRegistry: 'BAS SchemaRegistry',
        hasResolverCode: 'Resolver Code Deployed?',
        hasCertCode: 'Certificate Code Deployed?',
        reportTime: 'Verification Time',
        viewInExplorer: 'open in explorer',
        bytecodeAtResolver: 'bytecode at resolver address',
      },
      credentialIdentity: {
        title: 'Credential Identity',
        hash: 'credentialHash',
        hashHint: 'keccak256 hash of the off-chain credential document',
        attestationUid: 'Attestation UID (BAS)',
        courseId: 'Course Identifier',
        courseIdHint: 'Slug or hash representing the course module',
        schemaUid: 'Schema UID',
        resolverSchemaUid: 'Resolver Schema UID',
        schemaUidHint: 'Must match the attestation schema UID',
        schemaString: 'Schema Definition',
        dataLength: 'Attestation Data Payload',
        issuedThroughResolver: 'Issued via this Resolver?',
        issuedThroughResolverHint: 'Distinguishes between arbitrary BAS attestations and our verified credentials',
      },
      validityStatus: {
        title: 'Validity Status',
        note: 'Revocation, Expiration, and Issuer Delisting are three distinct mechanics. The first two are facts regarding the credential itself from the issuer or time; the third is a platform status on the issuer. An auditor requires the precise distinction.',
        recordedOnResolver: 'Recorded in Resolver',
        revoked: 'Revoked',
        revokedHintPermanent: 'permanent — no unrevoke function exists on EAS',
        revokedHintNone: 'EAS attestation has no revocation rollback path',
        expired: 'Expired',
        issuerDelisted: 'Issuer Delisted',
        issuerDelistedHint: 'Platform delisted the issuer; revocationTime remains 0 on chain, and can be reinstated via relistIssuer',
        issuerActiveHint: 'Issuer is approved on the platform whitelist',
        issuedAt: 'Issued At',
        expiresAt: 'Valid Until',
        noExpiry: 'No expiration date',
        revocableAtIssuance: 'Revocable (at genesis)',
        revocableHint: 'If false, revocation would be impossible forever',
        offchainRevoked: 'Revoked Off-chain by Issuer?',
        offchainRevokedHint: 'IEAS.revokeOffchain bound to (revoker, hash)',
        evidenceTimestamp: 'Timestamp Proof Anchor',
        evidenceTimestampHint: 'IEAS.timestamp(hash) — write-once anchor',
      },
      partiesInvolved: {
        title: 'Addresses Involved',
        note: 'Schema UID is calculated from keccak256(schemaString, resolverAddress, revocable). Thus, the resolver address is immutable to the schema.',
        issuerAgent: 'Issuer (Attester Agent)',
        issuerAgentHint: 'The attester column in BAS. Matches the issuer field in Open Badges 3.0 document.',
        holder: 'Holder (Learner Recipient)',
        holderHint: 'Blockchain wallet address of the recipient learner',
        isAuthorized: 'Issuer Authorized on Whitelist?',
        isAuthorizedHint: 'Revoking issuer authorization does not delete historically issued credentials',
        resolverOwner: 'Resolver Admin',
        resolverOwnerHint: 'Platform governance address managing issuer whitelisting',
        schemaResolver: 'Resolver Bound to Schema',
      },
      prerequisites: {
        title: 'Prerequisite Attestation Chain',
        note: 'What our resolver proves on-chain: before issuing an advanced certificate, the prerequisite must be alive, not revoked, not expired, and belong to the same learner. Raw EAS only checks that the refUID exists.',
        directPrerequisite: 'Direct Prerequisite UID',
        noHigherChain: 'No additional prerequisite links above this entry',
        depthHeader: 'Depth',
      },
      soulboundArtifact: {
        title: 'Soulbound Artifact (ERC-5192)',
        note: 'The soulbound token is an artifact, NOT the credential itself. The verifiable credential is the signed Open Badges JSON document. Revoked credentials retain their on-chain NFT as an immutable historical record.',
        contract: 'NFT Contract',
        nameSymbol: 'Name / Symbol',
        tokenId: 'Token ID',
        tokenIdHint: 'tokenId is derived from the credentialHash; duplicate mints are rejected',
        noArtifact: 'No artifact minted for this credential',
        ownedBy: 'Owned by',
        isLocked: 'locked() Status',
        supportsErc5192: 'ERC-5192 Compliant?',
        supportsErc5192Hint: 'Interface 0xb45a3c0e — recognized by wallets as non-transferable',
        tokenUri: 'Token Metadata URI',
        holderBalance: 'Holder Total Balance',
        wiredToResolver: 'NFT Wired to Active Resolver?',
      },
      rawBasRecord: {
        title: 'Raw Record on BAS (Immutable Third-Party Layer)',
        note: 'All rows here are read straight from the public BNB Attestation Service. None of it comes from our database — because we do not have one.',
        attestationExists: 'Attestation Found?',
        time: 'Attestation Block Time',
        expirationTime: 'Expiration Time',
        revocationTime: 'Revocation Time',
        notRevokedRaw: '0 (Not revoked)',
        refUid: 'Reference UID (refUID)',
        schemaRevocable: 'Schema Revocable Flag',
        schemaString: 'Registered Schema String',
      },
      reproduction: {
        title: 'Reproduce Independently (Without this UI)',
        note: 'The phrase "publicly verifiable" is meaningless if verification depends solely on our UI. Copy and run these commands directly against the node.',
        curlIntro: 'Or with raw JSON-RPC (without Foundry / cast):',
        functionSelectors: 'Contract Function Selectors Used',
      },
      readLog: {
        title: (total, failed) => `On-Chain Calls Executed (${total}${failed ? `, ${failed} failed` : ', 0 failed'})`,
        note: 'If a call fails (marked ✗), the corresponding panel displays "unreadable". No failed read is ever concealed.',
        colStatus: 'Status',
        colCall: 'Call',
        colTarget: 'Contract Target',
        colArguments: 'Arguments',
        colResult: 'Return Value',
      },
      limits: {
        title: 'Known Boundaries & Limitations',
        note: 'This section is not a legal disclaimer and cannot be dismissed. We prioritize technical honesty over artificial marketing.',
        items: [
          'What is proven here: an ADDRESS signed and its status on-chain. What is NOT proven: that the human in front of the screen is the legitimate owner of that address.',
          'Soulbound NFTs do not prevent screenshots, image copying, or local PDF downloads.',
          "A revoked credential REMAINS forever readable as 'revoked'. This is deliberate: history cannot be scrubbed.",
          'Expiration is not revocation. Both have their own distinct rows and must not be conflated.',
          'Issuers in this system are third-party agents: they deploy, hold keys, and are responsible for content. In EAS only the original attester may revoke (attestation.attester != revoker -> AccessDenied), so we CANNOT cancel their credentials. All we can do is withdraw support (delisting) and halt future issuances — and we display that as its own verdict, never disguised as revoked.',
        ],
      },
      emptyState: {
        title: 'AWAITING IDENTIFIER',
        subtitle: 'Paste any of the following identifiers into the input above',
        items: [
          {
            title: 'credentialHash',
            desc: '0x followed by 64 hex characters. The strongest form: status can be verified without disclosing the document itself.',
          },
          {
            title: 'Attestation UID',
            desc: '0x + 64 hex characters from BNB Attestation Service; automatically distinguished from credentialHash.',
          },
          {
            title: 'Artifact tokenId',
            desc: 'Decimal integer corresponding to the learner’s Soulbound NFT artifact.',
          },
          {
            title: 'Issuer or Recipient Address',
            desc: '0x + 40 hex characters; inspects issuer authorization or learner artifact balances.',
          },
        ],
        note: 'Zero steps on this page require a crypto wallet, user login, or access to any proprietary database.',
      },
    },
    footer:
      'Contracts: CredentialResolver (issuer whitelist + prerequisite validation) and SoulboundCert (ERC-5192 soulbound badge) deployed on top of BAS (BNB Attestation Service, a fork of EAS 1.3.0). The credential itself is an Open Badges 3.0 / W3C Verifiable Credential signed off-chain; the blockchain enforces immutable issuer registries, non-repudiable status lists, and cryptographic proof of time.',
    common: {
      yes: 'yes',
      no: 'no',
      unreadable: 'unreadable',
      notRecorded: 'none',
      today: 'today',
      daysAgo: (d) => `${d} days ago`,
      daysAhead: (d) => `in ${d} days`,
      copy: 'Copy',
      copied: 'Copied!',
    },
  },
  id: {
    appName: 'Lencana',
    tagline: 'Micro-Course Web3 Berbasis AI & Kredensial Terverifikasi',
    description:
      'Kuasai keterampilan Web3 berstandar industri yang dinilai oleh Agen AI otonom. Dapatkan kredensial Open Badges 3.0 tertambat di BNB Smart Chain tanpa kerumitan wallet.',
    nav: {
      courses: 'Katalog Kursus',
      howItWorks: 'Cara Kerja',
      evaluator: 'Studio AI',
      agents: 'Hub Agen',
      verifier: 'Verifikator',
      techEdge: 'Arsitektur',
    },
    hero: {
      eyebrow: 'BNB CHAIN · EDTECH WEB3 GENERASI BARU',
      titleLine1: 'Kuasai Keterampilan Web3.',
      titleLine2: 'Raih Kredensial Terverifikasi.',
      subtitle: 'Kredensial AI otonom yang membuktikan penguasaanmu secara on-chain.',
      btnExplore: 'Jelajahi Kursus',
      btnVerify: 'Verifikasi Sertifikat',
      statCourses: 'Open Badges 3.0',
      statCoursesLabel: 'Standar Industri W3C',
      statVerification: 'Tanpa Wallet',
      statVerificationLabel: 'Verifikasi Instan Perekrut',
      statStandard: 'Fork EAS 1.3.0',
      statStandardLabel: 'BNB Attestation Service',
      kineticWord1: 'Bukti yang',
      kineticWord2: 'bisa dibawa.',
      kineticWord3: 'Kredensial terverifikasi',
      badgeText: 'VERIFIKASI DI BNB CHAIN • TANPA DOMPET CRYPTO • OPEN BADGES 3.0 • ',
      feat1Heading: 'AI menilai hasilnya',
      feat1Sub: 'Rubrik transparan mengubah praktik menjadi pencapaian yang benar-benar diraih.',
      feat2Heading: 'Bukti tetap utuh',
      feat2Sub: 'Hasilnya terkunci pada pemiliknya dan tidak dapat diam-diam diubah.',
      feat3Heading: 'Siapa pun bisa memeriksa',
      feat3Sub: 'Buka buktinya di browser. Tidak perlu wallet atau akun.',
    },
    aiEvaluator: {
      sectionTitle: 'Lihat bagaimana skor dibuat.',
      sectionSub: 'Pilih jawaban, jalankan evaluator, lalu lihat setiap bagian rubrik berubah menjadi hasil bertanda tangan.',
      tabWeb3: 'Esai 1: Fondasi Web3',
      tabSecurity: 'Esai 2: Pertahanan Reentrancy',
      tabCustom: 'Esai 3: Esai Bebas',
      rubricPreviewLabel: 'Rubrik Penilaian Aktif',
      rubricWeight1: 'Kedalaman Analisis (40%)',
      rubricWeight2: 'Ketepatan Teknis EVM (30%)',
      rubricWeight3: 'Penalaran Kritis (30%)',
      btnRunEval: 'Jalankan Evaluasi Agen AI',
      agentHeaderTitle: 'Agent-Demo-EVM (0x8211...7DE)',
      agentStatusOnline: 'AKTIF · TERDAFTAR WHITELIST',
      terminalTitle: 'Konsol Penalaran Neural AI',
      crit1Name: 'Kedalaman Analisis',
      crit2Name: 'Ketepatan Teknis EVM',
      crit3Name: 'Penalaran Arsitektur Kritis',
      totalScoreLabel: 'Nilai Akhir',
      honorsPass: 'LULUS DENGAN PUJIAN (93/100)',
      eip712Title: 'Tanda Tangan Kriptografis EIP-712',
      btnVerifyLive: 'Verifikasi Kredensial Ini Langsung di BNB Chain',
    },
    agentRoster: {
      sectionTitle: 'Daftar Agen AI Penilai Otonom',
      sectionSub:
        'Agen domain terspesialisasi yang terdaftar di whitelist CredentialResolver untuk menilai esai dan menandatangani atestasi on-chain.',
      whitelistedPill: 'TERDAFTAR DI WHITELIST RESOLVER',
      agent1Name: 'Agent-Foundations',
      agent1Role: 'Arsitektur EVM & Primitif Blockchain',
      agent1Desc:
        'Menilai kiriman esai tentang primitif kriptografi, transisi state, dan kredensial terverifikasi. Penandatangan resmi untuk Web3 Dasar 2026.',
      agent1Stat: '1.420 Esai Dinilai · 99.8% Konsensus',
      agent2Name: 'Agent-Security',
      agent2Role: 'Pertahanan Smart Contract & Integritas Prasyarat',
      agent2Desc:
        'Menganalisis mitigasi kerentanan, reentrancy guards, dan rantai ketergantungan prasyarat. Menandatangani sertifikasi keamanan lanjutan.',
      agent2Stat: '856 Audit Dinilai · 99.9% Konsensus',
      agent3Name: 'Agent-Infrastructure',
      agent3Role: 'Resolver BAS & Kunci Soulbound ERC-5192',
      agent3Desc:
        'Memvalidasi parameter skema atestasi on-chain dan menegakkan aturan non-transferabilitas soulbound sebelum pencetakan lencana NFT.',
      agent3Stat: '640 Lencana Tertambat · 100% Rasio Terkunci',
    },
    visualPipeline: {
      sectionTitle: 'Apa yang membuat bukti ini permanen.',
      sectionSub:
        'Di balik satu tautan sederhana, lima pemeriksaan mengubah tugas menjadi kredensial yang tidak bisa diam-diam diubah.',
      node1: 'Tugas dikirim',
      node2: 'Rubrik diterapkan',
      node3: 'Hasil ditandatangani',
      node4: 'Status ditambatkan',
      node5: 'Bukti tetap milikmu',
    },
    learningLoop: {
      sectionTitle: 'Dari karya menjadi bukti.',
      sectionSub: 'Tiga momen. Satu kredensial yang dapat dibawa ke mana saja.',
      step1Title: 'Kerjakan tantangannya',
      step1Desc: 'Selesaikan tugas praktis yang menunjukkan apa yang benar-benar kamu pahami.',
      step2Title: 'Lihat cara hasilmu dinilai',
      step2Desc: 'Setiap skor berasal dari rubrik yang terlihat, bukan kotak hitam.',
      step3Title: 'Bagikan buktinya',
      step3Desc: 'Satu tautan publik memungkinkan siapa pun memeriksa hasilnya.',
    },
    coursesSection: {
      sectionKicker: 'DASHBOARD BELAJAR SISWA',
      sectionTitle: 'Katalog Micro-Course & Ruang Belajar',
      sectionSub: 'Kursus modular praktis yang dinilai langsung oleh Agen AI terspesialisasi dengan rubrik on-chain.',
      learnerProfileName: 'Rina Oktaviani',
      learnerSubInfo: 'Jalur Arsitektur Web3 · BSC Testnet',
      privacyLabel: 'Mode Privasi W3C:',
      privacyPseudo: '🔒 Pseudonim',
      privacyNamed: '👤 Profil Bernama',
      stat1Title: 'Kursus Aktif Diikuti',
      stat1Desc: 'Web3 Dasar 2026 & Keamanan BNB. Esai akhir siap dinilai agen AI.',
      stat2Title: 'Lencana Soulbound Diraih',
      stat2Desc: 'W3C Open Badges 3.0 tertambat di BAS dan terkunci sebagai NFT ERC-5192.',
      stat3Title: 'Agen AI Penilai Aktif',
      stat3Desc: 'Penandatangan whitelist: Foundations, Security, Infrastructure.',
      availableHeading: 'Katalog Kursus Tersedia',
      activeCoursesTag: '2 Kursus Aktif',
      badgeLevelBeginner: '2 Jam · Modular',
      badgeLevelAdvanced: '4 Jam · Lanjutan',
      badgeSoulbound: 'Lencana Soulbound',
      badgePrereqRequired: '🔒 Prasyarat: Web3 Dasar',
      badgeUnlocked: '✓ TERBUKA',
      course1Title: 'Web3 Dasar 2026: Fondasi & Arsitektur',
      course1Desc:
        'Pahami primitif blockchain, eksekusi EVM, dan kredensial terverifikasi. Selesaikan tugas esai komparasi antara sertifikat database vs attestation on-chain.',
      course1Rubric: 'Rubrik: Kedalaman analisis (40%), Ketepatan teknis (30%), Penalaran kritis (30%). Nilai lulus: 70/100.',
      course2Title: 'Keamanan BNB Chain & Integritas Prasyarat',
      course2Desc:
        'Kuasai kontrol akses resolver dan rantai prasyarat di BNB Chain. Memerlukan kelulusan Web3 Dasar 2026 untuk membuka akses materi.',
      course2Rubric: 'Rubrik: Analisis kerentanan (50%), Pertahanan arsitektur (30%), Kejelasan (20%). Nilai lulus: 75/100.',
      courseIssuerAgent: 'Agen AI: Agent-Foundations',
      btnOpenStudy: 'Buka Ruang Belajar ➔',
      btnViewSyllabus: 'Lihat Silabus',
      btnEnroll: 'Mulai Belajar',
      studyModalKicker: 'RUANG BELAJAR · MODUL INTERAKTIF',
      studyModalProceed: 'Lanjut ke Evaluasi Esai AI ➔',
    },
    bentoSection: {
      sectionTitle: 'Keunggulan Arsitektur Lencana',
      sectionSub: 'Menutup celah nyata industri dengan rekayasa kriptografi yang terukur.',
      card1Title: 'AI Agent sebagai Penerbit, Bukan Verifier',
      card1Desc:
        'Agen AI memberikan evaluasi kaya dan objektif atas esai. Proses verifikasi tetap 100% deterministik dan statis: hanya matematika dan hash, bukan tebakan AI.',
      card2Title: 'Menutup Celah Prasyarat EAS',
      card2Desc:
        'EAS bawaan hanya memeriksa apakah prasyarat ADA. Lencana memastikan prasyarat masih aktif, belum dicabut, belum kedaluwarsa, dan milik peserta yang sama.',
      card3Title: 'Artefak Soulbound ERC-5192',
      card3Desc:
        'Kredensial adalah dokumen JSON bertanda tangan; NFT Soulbound adalah artefak kebanggaan peserta. Fungsi transfer, approval, dan burn ditolak secara permanen.',
      card4Title: 'Verifikasi Publik Tanpa Wallet',
      card4Desc:
        'Perekrut tidak butuh crypto, MetaMask, atau akun. Satu panggilan eth_call dari browser langsung memeriksa rantai secara mandiri tanpa bergantung ke server kita.',
    },
    tabs: {
      summary: 'Status & Pihak Terlibat',
      onChain: 'Attestasi BAS & Prasyarat',
      soulbound: 'NFT Soulbound (ERC-5192)',
      cliAudit: 'Perintah Replikasi CLI',
      rpcLog: 'Log Real-Time RPC',
    },
    bannerNotDeployed: {
      title: 'Lapis on-chain kami belum disiarkan ke chain.',
      body: '47 test lulus di fork chain 97 dan 56 terhadap BAS yang benar-benar ter-deploy, tapi address CredentialResolver / SoulboundCert masih kosong di preset ini.',
      hint: 'Isi address-nya di panel Konfigurasi pembacaan begitu kontrak selesai di-deploy.',
      honestNote: 'Halaman ini sengaja tidak memakai data contoh: angka palsu yang terlihat bagus lebih buruk daripada halaman yang kosong dan jujur.',
    },
    inputSection: {
      sectionTitle: 'Kotak Uji Verifikasi Kredensial',
      sectionSub: 'Tempel pengidentifikasi kredensial apa pun di bawah ini atau klik contoh cepat untuk memeriksa bukti langsung di BNB Smart Chain.',
      label: 'Masukan',
      placeholder: '0x… (credentialHash atau UID attestation), angka decimal (tokenId), atau 0x… (address)',
      btnVerify: 'Periksa',
      btnClear: 'Kosongkan',
      btnShare: 'Salin tautan',
      btnSample: 'Isi contoh bentuk',
      sampleValid: 'Kredensial Valid',
      sampleRevoked: 'Kredensial Dicabut',
      sampleDelisted: 'Penerbit Didelisting',
      statusReading: 'Membaca chain…',
      statusFailed: 'Gagal total: ',
      statusSummary: (verdict, total, failed, ms, block) =>
        `${verdict} · ${total} panggilan chain${failed ? `, ${failed} gagal` : ''} · ${ms} ms · blok ${block}`,
      linkCopied: 'Tautan disalin ke papan klip!',
    },
    configSection: {
      summary: 'Konfigurasi pembacaan (RPC & address kontrak)',
      presetLabel: 'Preset chain',
      rpcUrlLabel: 'URL RPC',
      resolverLabel: 'CredentialResolver',
      certLabel: 'SoulboundCert',
      basLabel: 'BAS core (milik BAS, bukan kami)',
      chainIdLabel: 'chainId yang diharapkan',
      displayNameLabel: 'Nama tampilan',
      btnApply: 'Terapkan & periksa ulang',
      note: 'chainId dari RPC selalu dibandingkan dengan nilai yang kamu harapkan. Kalau tidak cocok, halaman menolak menampilkan hasil — pembacaan dari chain lain bukan bukti apa pun.',
    },
    verdicts: {
      VALID: {
        title: 'VALID',
        sub: 'Kredensial aktif dan terverifikasi di chain',
        cls: 'ok',
      },
      REVOKED: {
        title: 'DICABUT',
        sub: 'Pernah terbit, lalu dicabut — jejaknya permanen',
        cls: 'bad',
      },
      EXPIRED: {
        title: 'KEDALUWARSA',
        sub: 'Waktu berlakunya habis, tanpa ada yang menyentuh',
        cls: 'warn',
      },
      ISSUER_DELISTED: {
        title: 'PENERBIT DILISTING',
        sub: 'Platform menarik dukungannya dari penerbit — attestation-nya sendiri belum dicabut',
        cls: 'bad',
      },
      NOT_FOUND: {
        title: 'TIDAK DIKENALI',
        sub: 'Tidak pernah diterbitkan lewat sistem ini',
        cls: 'bad',
      },
      WRONG_CHAIN: {
        title: 'CHAIN TIDAK COCOK',
        sub: 'Kami menolak menampilkan hasil dari chain lain',
        cls: 'bad',
      },
      NOT_CONFIGURED: {
        title: 'BELUM DIKONFIGURASI',
        sub: 'Address kontrak belum diisi',
        cls: 'muted',
      },
      UNREACHABLE: {
        title: 'RPC TIDAK MENJAWAB',
        sub: 'Konfigurasi terisi, node-nya yang tidak terhubung',
        cls: 'warn',
      },
    },
    panels: {
      requested: {
        title: 'Yang kamu minta',
        input: 'Masukan',
        interpretedAs: 'Ditafsirkan sebagai',
      },
      chainConfig: {
        title: 'Chain & konfigurasi pembacaan',
        network: 'Network',
        testnetNotice: 'Testnet — angka di sini tidak punya nilai ekonomi',
        mainnetNotice: 'Mainnet',
        chainIdRpc: 'chainId (dari RPC)',
        expected: 'diharapkan',
        latestBlock: 'Blok terbaru',
        rpcUrl: 'RPC',
        resolverContract: 'CredentialResolver (milik kami)',
        certContract: 'SoulboundCert (milik kami)',
        basCore: 'BAS core (pihak ketiga)',
        schemaRegistry: 'BAS SchemaRegistry (pihak ketiga)',
        hasResolverCode: 'BAC code ada?',
        hasCertCode: 'Artefak code ada?',
        reportTime: 'Waktu laporan',
        viewInExplorer: 'buka di explorer',
        bytecodeAtResolver: 'bytecode pada address resolver',
      },
      credentialIdentity: {
        title: 'Identitas kredensial',
        hash: 'credentialHash',
        hashHint: 'keccak256 dari dokumen kredensial',
        attestationUid: 'UID attestation (BAS)',
        courseId: 'courseId',
        courseIdHint: 'ID kursus, bukan nama peserta',
        schemaUid: 'Schema UID',
        resolverSchemaUid: 'UID schema resolver',
        schemaUidHint: 'harus sama dengan di atas',
        schemaString: 'String schema',
        dataLength: 'Panjang data attestation',
        issuedThroughResolver: 'Diterbitkan lewat resolver ini?',
        issuedThroughResolverHint: 'perbedaan antara "ada attestation di chain" dan "kredensial kami"',
      },
      validityStatus: {
        title: 'Status keberlakuan',
        note: 'Dicabut, kedaluwarsa, dan penerbit dilisting adalah TIGA hal berbeda dan ditampilkan terpisah. Dua yang pertama adalah fakta tentang kredensialnya dan berasal dari attester atau dari waktu; yang ketiga adalah penilaian platform tentang penerbitnya dan bisa dipulihkan. Ketiganya berarti "jangan diterima", tapi sebabnya berbeda — dan sebab itulah yang dicari auditor.',
        recordedOnResolver: 'Tercatat di resolver',
        revoked: 'Dicabut',
        revokedHintPermanent: 'permanen — tidak ada jalur pembatalan',
        revokedHintNone: 'tidak ada jalur untuk membatalkan pencabutan',
        expired: 'Kedaluwarsa',
        issuerDelisted: 'Penerbit dilisting',
        issuerDelistedHint: 'platform menarik dukungannya; revocationTime di chain tetap 0, dan bisa dipulihkan lewat relistIssuer',
        issuerActiveHint: 'penerbitnya masih diakui platform',
        issuedAt: 'Diterbitkan',
        expiresAt: 'Berlaku sampai',
        noExpiry: 'tanpa expiry',
        revocableAtIssuance: 'Dapat dicabut (sejak terbit)',
        revocableHint: 'kalau false, pencabutan mustahil selamanya — itu bukan fitur di sini',
        offchainRevoked: 'Dicabut off-chain oleh penerbit?',
        offchainRevokedHint: 'jalur IEAS.revokeOffchain, terikat pasangan (pencabut, hash)',
        evidenceTimestamp: 'Anchor bukti waktu terpisah',
        evidenceTimestampHint: 'IEAS.timestamp(hash) — write-once',
      },
      partiesInvolved: {
        title: 'Alamat yang terlibat',
        note: 'Schema UID dihitung dari keccak256(string schema, alamat resolver, revocable) — jadi alamat resolver ikut menentukan dan tidak bisa dipindah-pindah tanpa membuat schema baru.',
        issuerAgent: 'Issuer — agen penerbit',
        issuerAgentHint: 'kolom `attester` di attestation BAS. Namanya "Issuer" karena itu memang nama field-nya di dokumen kredensial',
        holder: 'Pemegang (recipient)',
        holderHint: 'alamat, bukan identitas manusia',
        isAuthorized: 'Masih berizin menerbitkan?',
        isAuthorizedHint: 'izin menerbitkan ≠ pembatalan kredensial lama',
        resolverOwner: 'Admin resolver',
        resolverOwnerHint: 'bisa menambah/mencabut izin penerbit',
        schemaResolver: 'Resolver terpasang di schema',
      },
      prerequisites: {
        title: 'Rantai prasyarat',
        note: 'Yang dibuktikan di lapis ini: saat sertifikat lanjutan diterbitkan, prasyaratnya masih hidup, belum dicabut, dan milik pemegang yang sama. EAS mentah hanya mengecek prasyaratnya ADA — empat penolakan sisanya adalah kerja kami.',
        directPrerequisite: 'Prasyarat langsung',
        noHigherChain: 'tidak ada mata rantai lagi di atasnya',
        depthHeader: 'Tingkat',
      },
      soulboundArtifact: {
        title: 'Artefak yang dimiliki peserta (soulbound)',
        note: 'Artefak BUKAN kredensial dan BUKAN bukti keberlakuan. Kredensialnya dokumen JSON bertanda tangan; status kebenarannya di panel atas. Artefak yang kredensialnya sudah dicabut tetap ada sebagai catatan sejarah.',
        contract: 'Kontrak',
        nameSymbol: 'Nama / simbol',
        tokenId: 'tokenId',
        tokenIdHint: 'tokenId = angka dari credentialHash, jadi tidak bisa ada dua artefak',
        noArtifact: 'tidak ada artefak untuk ini',
        ownedBy: 'Dimiliki oleh',
        isLocked: 'locked()',
        supportsErc5192: 'Mendukung ERC-5192',
        supportsErc5192Hint: 'interfaceId 0xb45a3c0e — wallet bisa melihat ini sebagai token tak terpindahtangankan',
        tokenUri: 'tokenURI',
        holderBalance: 'Jumlah artefak milik pemegang',
        wiredToResolver: 'Artefak menunjuk resolver ini?',
      },
      rawBasRecord: {
        title: 'Rekaman mentah di BAS (pihak ketiga, tidak bisa kami ubah)',
        note: 'Semua baris di halaman ini bisa dibaca langsung dari chain oleh siapa pun. Tidak ada satu pun yang bersumber dari basis data kami — karena memang tidak ada.',
        attestationExists: 'Attestation ada?',
        time: 'time',
        expirationTime: 'expirationTime',
        revocationTime: 'revocationTime',
        notRevokedRaw: '0 = belum dicabut',
        refUid: 'refUID',
        schemaRevocable: 'Schema record: revocable',
        schemaString: 'Schema record: isi',
      },
      reproduction: {
        title: 'Ulangi sendiri, tanpa halaman ini',
        note: 'Klaim "terverifikasi publik" tidak berarti apa-apa kalau satu-satunya cara memeriksanya adalah alat dari kami. Salin perintah di atas dan jalankan.',
        curlIntro: 'atau tanpa Foundry, panggilan mentah JSON-RPC:',
        functionSelectors: 'Selector fungsi yang dipakai',
      },
      readLog: {
        title: (total, failed) => `Panggilan yang dilakukan halaman ini (${total}${failed ? `, ${failed} gagal` : ', 0 gagal'})`,
        note: 'Kalau sebuah baris di atas ✗, panelnya tetap muncul dan menulis "tidak terbaca". Tidak ada angka yang dipalsukan oleh kegagalan.',
        colStatus: 'status',
        colCall: 'panggilan',
        colTarget: 'terhadap',
        colArguments: 'argumen',
        colResult: 'hasil',
      },
      limits: {
        title: 'Batas yang harus kamu ketahui',
        note: 'Bagian ini bukan formalitas hukum dan tidak bisa ditutup. Kami lebih memilih halaman yang mengatakan apa yang tidak dibuktikannya.',
        items: [
          'Yang dibuktikan di sini: sebuah ALAMAT menandatangani dan statusnya di chain. Yang TIDAK dibuktikan: bahwa orang yang berdiri di depan layar adalah pemilik alamat itu.',
          'Soulbound tidak mencegah screenshot, penyalinan gambar, atau penyimpanan PDF.',
          'Kredensial yang dicabut TETAP SELAMANYA terbaca sebagai "dicabut". Itu disengaja: riwayat tidak boleh bisa dibersihkan.',
          'Kedaluwarsa bukan pencabutan. Keduanya punya baris sendiri dan tidak boleh digabung.',
          'Penerbit di sistem ini adalah agen pihak ketiga: mereka yang men-deploy, memegang kunci, dan bertanggung jawab atas isinya. Di EAS hanya attester asal yang boleh mencabut (`attestation.attester != revoker -> AccessDenied`), jadi kami TIDAK BISA membatalkan kredensial mereka. Yang bisa kami lakukan hanyalah menarik dukungan (delisting) dan menghentikan penerbitan berikutnya - dan itu kami tampilkan sebagai verdict sendiri, bukan disamarkan menjadi "dicabut".',
        ],
      },
      emptyState: {
        title: 'MENUNGGU MASUKAN',
        subtitle: 'Tempel salah satu dari ini di kolom di atas',
        items: [
          {
            title: 'credentialHash',
            desc: '0x lalu 64 karakter hex. Bentuk paling kuat: dokumen kredensial tidak perlu bisa dilihat untuk diperiksa statusnya.',
          },
          {
            title: 'UID attestation',
            desc: '0x + 64 hex; halaman mengenali mana yang hash dan mana yang UID.',
          },
          {
            title: 'tokenId artefak',
            desc: 'angka decimal dari koleksi NFT peserta.',
          },
          {
            title: 'address penerbit atau peserta',
            desc: '0x + 40 hex; untuk memeriksa izin penerbit dan jumlah sertifikat seseorang.',
          },
        ],
        note: 'Tidak ada satu pun pemeriksaan di halaman ini yang memerlukan wallet, login, atau izin baca basis data.',
      },
    },
    footer:
      'Kontrak: CredentialResolver (whitelist penerbit + rantai prasyarat) dan SoulboundCert (artefak ERC-5192), di atas BAS — fork EAS 1.3.0 yang sudah ter-deploy di BNB Smart Chain. Kredensialnya sendiri adalah dokumen Open Badges 3.0 / W3C Verifiable Credential yang ditandatangani penerbit; chain hanya menyimpan registry penerbit, status yang tidak bisa disembunyikan, dan bukti waktu.',
    common: {
      yes: 'ya',
      no: 'tidak',
      unreadable: 'tidak terbaca',
      notRecorded: 'tidak ada',
      today: 'hari ini',
      daysAgo: (d) => `${d} hari lalu`,
      daysAhead: (d) => `${d} hari lagi`,
      copy: 'Salin',
      copied: 'Tersalin!',
    },
  },
}
