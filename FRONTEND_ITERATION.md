# Frontend UI/UX Master Iteration Tracker

> **CRITICAL RULE**: FRONTEND ONLY / UI/UX ONLY.  
> Under NO circumstances should any backend files, smart contracts (`contracts/`), deployment scripts (`script/`), contract tests (`test/`), or signer services (`signer/`) be touched or modified.  
> All work is strictly confined to the `web/` directory.

---

## 1. Project Context & Objectives

**Lencana** is a decentralized learning credential verification platform on BNB Smart Chain (BSC).  
The front-facing web application allows anyone—recruiters, employers, students, and hackathon judges—to verify learning credentials with:
- **No crypto wallet required**
- **No login or account creation**
- **Zero reliance on a proprietary backend server** (direct client-side `eth_call` queries to the blockchain)
- Complete transparency: every verdict displays exact on-chain parameters, hashes, block timestamps, and reproducible `cast` commands.

### Target Audiences & Personas
1. **Recruiters & HR Specialists (Bagas)**: Needs immediate, high-trust visual proof within 3 seconds of validity, issuing AI agent legitimacy, course criteria, and learner address.
2. **Learners & Certificate Holders (Rina)**: Wants an elegant, proud visual certificate/badge to share on LinkedIn or portfolios with instant shareable links (`?q=...&lang=...`).
3. **Hackathon Judges & Technical Auditors**: Demands transparent on-chain evidence, raw RPC call logs, non-mocked data, and reproducible CLI commands (`cast call` and `curl`).

---

## 2. Official BNB Chain Design System & Color Palette

The visual design is grounded strictly in the **official BNB Chain ecosystem color tokens**:

| Token Name | Hex Code | Purpose & Usage |
|---|---|---|
| **BNB Yellow (Primary)** | `#F0B90B` | Brand logo, primary buttons, active highlights, key badges |
| **BNB Yellow Hover** | `#FCD535` | Interactive hover states for primary buttons and links |
| **BNB Dark Canvas** | `#0B0E11` | Root page background (obsidian deep space) |
| **BNB Card Surface** | `#181A20` | Primary container cards, plaques, and inspection panels |
| **BNB Elevated / Input** | `#2B313A` | Textarea, input fields, dropdowns, and borders |
| **BNB Text Primary** | `#EAECEF` | Main headings, certificate titles, and high-contrast text |
| **BNB Text Muted** | `#848E9C` | Secondary labels, descriptions, and metadata hints |
| **BNB Text Sub** | `#B7BDC6` | Table contents, address subtext, and code highlights |
| **BNB Green (Valid)** | `#0ECB81` | Active, valid, approved credentials and verified checkmarks |
| **BNB Red (Revoked)** | `#F6465D` | Revoked credentials, permanent cancellations, failed calls |
| **BNB Orange (Delisted)** | `#FF8E1D` / `#F0B90B` | Issuer delisted by platform, temporary suspension |

---

## 3. UI/UX Component Blueprint

### A. Navigation & Hero Search Bar
- **App Header**:
  - Lencana logo with BNB diamond motif.
  - Subtitle: *Verifiable Credentials on BNB Smart Chain*.
  - Network Indicator pill: Live network badge (e.g. `BSC Testnet · 97`).
  - Language Switcher: Pill toggle (`EN` | `ID`) persisted in `localStorage`.
- **Search & Input Bar**:
  - Monospace input for `credentialHash` (0x...), `UID`, `tokenId`, or `address`.
  - Primary "Verify" action with keyboard shortcut (`Ctrl+Enter` / `Cmd+Enter`).
  - **Quick Sample Pills** for 1-click live demo testing:
    - 🟢 *Valid Credential*
    - 🔴 *Revoked Credential*
    - 🟠 *Delisted Issuer*
    - ⚪ *Format Sample*

### B. The Showcase: Digital Credential Plaque (Certificate Card)
- Elevated card with BNB gold emblem and soft status glow.
- Achievement / Course Title (e.g., *Web3 Dasar 2026*).
- Issuing AI Agent address with verified whitelist indicator.
- Recipient learner address (pseudonymous by default).
- Issuance timestamp & Expiration date.
- Soulbound NFT badge: `🔒 Soulbound ERC-5192 (Locked · Non-transferable)`.
- Big, unambiguous Verdict Badge:
  - `VALID` (Green `#0ECB81`)
  - `REVOKED` (Red `#F6465D`)
  - `ISSUER DELISTED` (Orange `#FF8E1D`)
  - `EXPIRED` (Amber `#F0B90B`)

### C. Visual Verification Stepper (4-Step Trust Pipeline)
Visual breadcrumb breaking down the on-chain verification sequence:
1. **Document Integrity**: Open Badges 3.0 / W3C VC keccak256 hash valid.
2. **BAS Attestation**: Anchored on BNB Attestation Service.
3. **Whitelist & Prerequisites**: Issuing agent is approved; prerequisite course is unrevoked.
4. **Soulbound Artifact**: ERC-5192 minted to learner and non-transferable.

### D. Tabbed Forensic Deep-Dive (Technical Audit)
Clean tabs/accordions to prevent endless scrolling:
- **Tab 1: Credential & Parties**: Issuer Agent, Recipient, Expiry, Course Details.
- **Tab 2: On-Chain Proof & Prerequisite Chain**: Attestation UID, Schema UID, Prerequisite tree.
- **Tab 3: Soulbound NFT (ERC-5192)**: Token ID, tokenURI, balance, contract link on BscScan.
- **Tab 4: Independent Audit**: Exact `cast call` and `curl` JSON-RPC commands so anyone can verify without our UI.
- **Tab 5: Transparency Read Log**: Table of every single `eth_call` made by the browser with execution latency.
- **Known Limits Section**: Clear disclosure of cryptographic boundaries.

---

## 4. Iteration Roadmap

- [x] **Iteration 1: i18n Foundation & Language Toggle**
  - Created `web/src/i18n.ts` supporting English (`en`) and Indonesian (`id`).
  - Maintained 100% test compatibility with `web/scripts/probe.ts`.
- [x] **Iteration 2: Setup BNB Chain Color System & Base Components**
  - Configured BNB Chain palette tokens (`#F0B90B`, `#0B0E11`, `#181A20`, `#0ECB81`, `#F6465D`).
  - Base certificate card, stepper, and sample pills implemented.
- [x] **Iteration 3: Tabbed Layout & Interactive Polish**
  - Grouped deep inspection panels into responsive, modern tabs (`#tab-summary`, `#tab-onchain`, `#tab-soulbound`, `#tab-cli`, `#tab-rpclog`).
  - Added interactive tab switching with delegation on `#out`.
  - Added sample test pills for 1-click verification of all cryptographic states (`VALID`, `REVOKED`, `ISSUER DELISTED`).
- [x] **Iteration 4: EdTech Micro-Course Platform Transformation**
  - Integrated `Leonxlnx/taste-skill` design principles (high typography hierarchy, viewport stability, no wrapped CTAs).
  - Designed split-screen Hero with live interactive credential plaque and quick-verify CTA.
  - Implemented 3-step Learning Loop section (Study -> AI Evaluation -> BAS On-Chain Anchor).
  - Created Featured Micro-Courses catalog (Web3 Dasar 2026 & BNB Chain Security) with transparent grading rubrics, domain agents, and prerequisite tags.
  - Built "Why Lencana is Technically Differentiable" Bento Grid highlighting EAS loophole fixes, deterministic verification, and Soulbound ERC-5192.
  - Sticky BNB navbar with smooth scrolling anchor navigation, live network indicator, and persistent EN/ID language switcher.
- [x] **Iteration 5: Review & Build Verification**
  - Verified 0 TypeScript errors via `npm run typecheck`.
  - Built optimized client bundle via `npm run build`.
  - Verified local dev server runtime at `http://127.0.0.1:5173/`.
- [x] **Iteration 6: Visual AI Engine, Interactive Simulator & Agent Roster**
  - Added live AI Evaluator Mesh status ticker in Hero with emerald pulse animation.
  - Built 5-node Cryptographic Pipeline flow diagram with animated signal pulses.
  - Implemented interactive AI Agent Evaluation Sandbox: essay preset tabs, live neural terminal streaming, animated criterion scoring meters, and EIP-712 signature generator.
  - Built Autonomous Evaluator Agent Roster with cyberpunk agent dossiers, radar animations, signer keys, and consensus statistics.
  - Connected generated evaluation outputs directly into the instant verifier sandbox.

---

## 5. Iteration Changelog

### Iteration 1 & 2: i18n Foundation & Initial BNB Styling (Completed)
- Documented official BNB Chain color palette and component blueprint.
- Implemented `web/src/i18n.ts` with complete EN/ID dictionary.
- Integrated `renderCertificateCard` and `renderStepper` into `web/src/render.ts`.
- Added quick sample pills and language switcher in `web/index.html` and `web/src/main.ts`.

### Iteration 3 & 4: Full EdTech Landing Page & Forensic Audit Tabs (Completed)
- Converted Lencana from a plain single-card input into a comprehensive Web3 EdTech platform landing page.
- Created sticky top navigation with live BSC Testnet indicator and instant EN/ID language toggling.
- Added Split-screen Hero with glowing BNB plaque preview, live "Verify This Certificate Live" button, and trust statistics.
- Added 3-step Learning Loop highlighting AI domain agents grading essays against transparent rubrics.
- Added Course Catalog cards with assessment rubrics, domain agent labels, and enroll CTAs.
- Added 5-tab forensic audit layout (`Summary`, `On-Chain BAS & Prerequisites`, `Soulbound NFT`, `CLI Audit`, `Real-Time RPC Log`).
- Added Bento Grid displaying the architectural differentiation (closing EAS prerequisite loophole, AI as issuer never verifier, zero-wallet verification).
- Tested and confirmed 100% build compatibility with zero errors.

### Iteration 6: Visual AI Engine & Agent Roster (Completed)
- Added live AI Evaluator Mesh status ticker in Hero with emerald pulse animation.
- Implemented the 5-node Cryptographic Learning Pipeline with animated traveling photon beams.
- Built the Interactive AI Evaluation Sandbox with live terminal logging, multi-stage rubric score animations, EIP-712 signature generation, and 1-click on-chain verification bridge.
- Created Cyberpunk Autonomous Evaluator Agent Roster cards (`Agent-Foundations`, `Agent-Security`, `Agent-Infrastructure`) with radar-sweep HUD reticles, signer keys, and consensus metrics.

