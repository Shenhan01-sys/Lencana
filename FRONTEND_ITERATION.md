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

## 3.1 Comprehensive Page Architecture (Derived from Vault Specifications)

Following a rigorous analysis of [`vault/01-briefing.md`](file:///C:/Project_Dave/lencana/vault/01-briefing.md), [`vault/02-architecture.md`](file:///C:/Project_Dave/lencana/vault/02-architecture.md), and [`vault/05-status-and-tasks.md`](file:///C:/Project_Dave/lencana/vault/05-status-and-tasks.md), Lencana requires **6 core pages/views** to fully realize the end-to-end user journeys for **Rina (Learner)**, **Training Institutions (Issuers)**, **Bagas (HR Recruiter)**, and **Hackathon Judges**:

| Page / Route | Primary Persona | Purpose & Vault Requirement | Key Features & Visual Elements |
|---|---|---|---|
| **1. Landing Page & Discovery Portal**<br>`#/` or `index.html` | Everyone (Learners, HR, Judges) | Brand storefront, high-converting EdTech value prop, and live demonstration sandbox | • Split-screen Hero with cybernetic credential badge plaque (`ai_badge.jpg`)<br>• 3-Step Learning Loop with visual micro-mockups (Code editor, Neural equalizer, SBT seal)<br>• Live Cryptographic Pipeline (5-node signal track)<br>• Interactive AI Evaluator preview with dynamic SVG Radar Chart<br>• Whitelisted Agent Roster with radial consensus gauges<br>• Technical Edge Bento Grid (closing EAS loopholes) |
| **2. Micro-Courses Catalog & Study Room**<br>`#/courses` & `#/courses/:id` | **Rina (Learner, 24)** | Course discovery, syllabus progression, and interactive study modules | • Course catalog cards with difficulty, duration, and prerequisite badges<br>• **Visual Prerequisite Tree**: Graphical unlock map (*Web3 Dasar* ➔ *BNB Chain Security*)<br>• Interactive lesson player (markdown modules + code snippets)<br>• Assessment prompt & rubric criteria weights preview |
| **3. AI Evaluator & Student Submission Workspace**<br>`#/submit` or `#/courses/:id/eval` | **Rina (Learner)** & **AI Agents** | Dedicated open-ended essay submission and real-time autonomous grading | • Focused essay submission editor with live AST tokenization<br>• **Live Neural Rubric Engine**: Real-time criterion grading (Depth, EVM, Architecture)<br>• **Dynamic Pentagonal SVG Skill Radar Chart** morphing live<br>• EIP-712 signature generation from domain agent key<br>• Gasless attestation broadcast via platform relayer<br>• Soulbound badge mint celebration modal |
| **4. Instant Public Verifier & Forensic Audit Suite**<br>`#/verify` or `#/verify?q=...` | **Bagas (HR Recruiter)** & **Judges** | 0-wallet, 0-account, 0-server trust public verification against live BNB node | • Fast search input for `credentialHash`, `UID`, `tokenId`, or `address`<br>• 1-Click quick sample pills (`VALID`, `REVOKED`, `EXPIRED`, `ISSUER_DELISTED`)<br>• 5-Tab technical inspection (`Summary`, `On-Chain BAS & Prereqs`, `Soulbound NFT`, `CLI Audit`, `RPC Log`)<br>• Copyable `cast call` and `curl JSON-RPC` commands<br>• Prominent Honest Limits panel |
| **5. Learner Portfolio & Credential Showcase**<br>`#/portfolio` or `#/portfolio/:address` | **Rina (Learner)** | Personal career showcase, credential export, and privacy management | • Gallery of earned Soulbound ERC-5192 credentials with holographic shine<br>• W3C Open Badges 3.0 JSON-LD viewer & 1-click export `.json`<br>• **Privacy Disclosure Controller**: 3 privacy tiers (**Pseudonymous address**, **Named profile**, **Named + Provable salted email hash**)<br>• Shareable LinkedIn badge links & QR codes |
| **6. Issuer & AI Agent Governance Hub**<br>`#/agent-hub` or `#/issuer` | **Institutions & Agent Operators** | Monitor agent whitelisting, rubric enforcement, and cryptographic revocation | • Whitelisted AI Agent monitor (signing keys, nonces, consensus radial gauges)<br>• Rubric management and score convergence telemetry<br>• Cryptographic revocation console (`revoke()` or `revokeOffchain()` on EAS)<br>• Platform Delist/Relist monitor (demonstrating anti-compromise failsafe) |

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
- [x] **Iteration 7: High-Impact Visual Assets, Dynamic Radar Chart & Micro-Mockups (Taste-Skill Mastery)**
  - Embedded high-fidelity cybernetic visual assets (`ai_badge.jpg`, `agent_foundations.jpg`, `agent_security.jpg`, `agent_infra.jpg`).
  - Added holographic scanline animation and ERC-5192 locked seal tags to the Hero Certificate plaque.
  - Reduced text density across sections; transformed Learning Loop cards into interactive visual micro-mockups (code editor with syntax highlighting, neural cluster with live bouncing equalizer bars, and Soulbound NFT lock badge).
  - Built a dynamic SVG Skill Radar Chart that morphs its 5-axis polygon on live evaluation, paired with a real-time Token Scanner Matrix with sequential glowing illumination.
  - Added SVG radial consensus gauges (99.8%, 99.9%, 100%) and compute activity equalizers to the Agent Roster.
  - Added visual infographics to all 4 Bento Grid cards (evaluation comparison pipeline, prerequisite checkmark matrix, transfer rejection circuit, and direct browser-to-node RPC bridge).
- [x] **Iteration 8: LMS Learner Dashboard, Bento Course Cards & Interactive Study Room (`#courses`)**
  - Designed LMS Learner Header card (Learner Persona: Rina Oktaviani, BSC Testnet 97, zero gas tag, interactive W3C Privacy Mode toggle: Pseudonymous vs Named Profile).
  - Integrated 3 quick notification and metric cards matching modern smart LMS UI (Enrolled Courses, Soulbound Badges, AI Domain Agents).
  - Created high-impact horizontal Bento Course cards with custom AI-generated artwork thumbnails (`course_foundations.jpg`, `course_security.jpg`), rubric chips, and evaluator agent badges.
  - Built full Interactive Study Room modal (`#study-modal`) with modular lesson tab switching, rich code snippets, and direct 1-click bridge to the AI Essay Evaluator sandbox.
- [ ] **Iteration 9: Fullscreen AI Assessment & Submission Studio (`#/submit`)**
  - Dedicated student submission terminal with real-time word/AST token count.
  - Live Neural grading view with animated criteria score convergence and dynamic radar morphing.
  - EIP-712 typed data signing simulation and BAS attestation broadcast.
  - Soulbound ERC-5192 mint celebration modal.
- [ ] **Iteration 10: Learner Portfolio & Credential Showcase (`#/portfolio`)**
  - Personal credential gallery with cybernetic plaque view for Rina.
  - W3C Open Badges 3.0 raw JSON-LD viewer & export `.json`.
  - Privacy Disclosure Controller: Pseudonymous (Address only) vs Named (Profile IRI + Salted email hash) with explicit immutable address warning.
  - Shareable public verification links & QR codes.
- [ ] **Iteration 11: Issuer & AI Agent Governance Hub (`#/agent-hub`)**
  - Whitelisted AI domain agent roster monitor (keys, nonces, consensus gauges).
  - Cryptographic revocation testing console (`revoke()` / `revokeOffchain()`).
  - Platform Delist/Relist monitor illustrating anti-compromise defense.

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

### Iteration 7: High-Impact Visual Assets, Dynamic Radar Chart & Micro-Mockups (Completed)
- Cut explanatory paragraph text density by ~60% in favor of rich micro-diagrams and widgets.
- Integrated generated visual assets into `web/public/assets/` and styled with cybernetic borders, scanlines, and glow filters.
- Implemented SVG Pentagonal Skill Radar Chart with real-time morphing data polygon and vertex dots upon evaluation.
- Added sequential glowing Token Scanner Matrix (`EAS 1.3.0`, `keccak256`, `EIP-712`, `secp256k1`, `ERC-5192`, `Resolver 0xe01a`).
- Embedded SVG circular radial gauges for agent consensus and real-time frequency equalizer bars.
- Integrated micro-diagrams into Bento cards: Subjective-to-Deterministic flow, prerequisite checkmark matrix, ERC-5192 revert circuit, and browser-to-node RPC cable.
- Verified 100% TypeScript type safety and production build output (`0` errors).

### Iteration 8: LMS Learner Dashboard, Bento Course Cards & Interactive Study Room (Completed)
- Adapted HSE Digital Smart LMS reference architecture:
  - Designed the **Learner Profile Card** for Persona Rina Oktaviani with online status indicator, wallet-free 0 gas tag, and interactive **W3C Privacy Mode toggle** (`Pseudonymous` address-only vs `Named Profile` with DID & salted identity hash).
  - Integrated **3 Quick Metric Cards** (`Active Courses [2]`, `Soulbound Badges [2]`, `AI Domain Agents Online [3]`) in BNB Gold, Emerald, and Cyber-Purple hues.
  - Implemented **Horizontal Bento Course Cards** featuring high-definition generated artwork thumbnails (`course_foundations.jpg`, `course_security.jpg`) on the left, rubric weight tags, assigned AI Domain Agent chips, and completion stats.
  - Built the **Interactive Study Room Modal** (`#study-modal`) featuring modular syllabus tabs (Module 1: Primitives/Defense, Module 2: Attestations/Resolver, Module 3: Capstone Essay), readable specifications, code snippets, and a direct 1-click bridge (`Proceed to AI Essay Evaluation ➔`) that loads the course essay and smooth-scrolls to the evaluation sandbox.
- Single-source i18n support in `web/src/i18n.ts` for English and Bahasa Indonesia.
- 100% responsive layout across mobile and desktop breakpoints with zero layout shift.
- Verified with TypeScript typecheck (`tsc --noEmit`) and Vite production build (`0` errors).

### Iteration 9: Kinetic Brutalist EdTech Hero & Connected Value-Prop Features (Completed)
- Adapted high-impact kinetic brutalist design to Lencana and BNB Chain ecosystem:
  - **Massive 3D Typography Stack:** `#LENCANA` (BNB Gold with 14-layer extruded bronze shadow), `ON-CHAIN` (Crisp White with 14-layer extruded charcoal shadow), and `CREDENTIALS` rendered at fluid `clamp(4rem, 13vw, 155px)`.
  - **Floating Glassmorphism Showcase Cards:**
    - Card 1 (`rina.bnb`): Learner persona with gold avatar, `0x5cA3...7c3B`, `93/100 Honors Pass`, and smooth floating keyframe animation (`@keyframes floatCardRina`). Clicking triggers 1-click credential verification.
    - Card 2 (`bagas-recruiter.bnb`): HR & recruiter persona with emerald avatar, `Live eth_call Audit`, `0 Gas Verification`, and smooth floating keyframe animation (`@keyframes floatCardRecruiter`).
  - **Hand-Drawn Doodle SVG Accents:** Custom curved vector doodle arrows (`ArrowGoldLeft` and `ArrowEmeraldRight`) connecting headline typography to floating cards.
  - **Rotating Circular SVG Badge:** Continuous spin animation (`@keyframes spinBadge`) with curved text path (`VERIFY ON BNB CHAIN • ZERO WALLET REQUIRED • OPEN BADGES 3.0 •`) and central arrow, smoothly linking down to the Verifier Sandbox.
  - **Connected 3-Card Value-Prop Section:** Curved elevated surface (`rounded-t-[2.5rem]`) with 3 cards connected by doodle arrows:
    1. `AUTONOMOUS AI ESSAY GRADING` with live AI Agent chip (`Agent-Foundations` · `93/100 HONORS`).
    2. `BAS ATTESTATION RESOLVER HOOKS` with resolver schema chip (`CredentialResolver.sol` · `100% LOCKED`).
    3. `ZERO-WALLET PUBLIC PROOF` with verification speed bubble (`0.42s · 0 GAS`).
- Preserved 100% pure vanilla/Vite/TS/CSS performance without external framework bloat or React rerenders.
- Full bilingual dictionary support in `web/src/i18n.ts` (`en` & `id`).
- Verified with `npm run typecheck` (`tsc --noEmit`) and `npm run build` with **0 errors**.



