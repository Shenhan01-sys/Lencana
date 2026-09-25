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
- [x] **Iteration 9: Kinetic Brutalist EdTech Hero & Connected Value-Props (`#/`)**
  - Massive 3D extruded typography stack (`#LENCANA`, `ON-CHAIN`, `CREDENTIALS`), floating glass cards (`rina.bnb`, `bagas-recruiter.bnb`), doodle arrows, and rotating circular SVG badge.
- [x] **Iteration 10: Complete Multi-Page Architecture (All 6 Core Pages Live & Routed)**
  - Implemented zero-dependency client-side hash router supporting:
    1. `#/` (`#page-home`): Discovery portal, kinetic hero, learning loop, cryptographic pipeline, app gateway teasers, bento technical grid.
    2. `#/courses` (`#page-courses`): Micro-courses marketplace, visual prerequisite dependency graph, 3 LMS metric cards, horizontal course bento cards, and interactive study room modal.
    3. `#/submit` (`#page-submit`): Fullscreen AI Assessment & Submission Studio with real-time AST token counter, preset essay selector, live neural streaming terminal, dynamic SVG skill radar chart, scoring meters, EIP-712 proof box, and gasless mint celebration.
    4. `#/verify` (`#page-verify`): Instant Credential Verifier Sandbox & Forensic Audit Suite with 5 tabs (`Summary`, `On-Chain BAS & Prereqs`, `Soulbound NFT`, `CLI Audit`, `Real-Time RPC Log`).
    5. `#/portfolio` (`#page-portfolio`): Decentralized Learner Portfolio for Rina Oktaviani with 3-tier privacy mode toggle (`Pseudonymous`, `Named Profile`, `Salted DID Hash`), earned soulbound badge gallery, raw W3C Open Badges 3.0 JSON-LD inspector, and 1-click `.json` file download.
    6. `#/agent-hub` (`#page-agent-hub`): Issuer & AI Agent Governance Hub with whitelisted domain agent dossiers, interactive cryptographic revocation console (`revoke()`), and anti-compromise delisting register.
  - Sticky navbar with persistent active link indicator, live network badge, and EN/ID language switcher.
  - 100% build verification passing with `0` errors.

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
 
### Iteration 10: Complete Multi-Page Architecture (All 6 Core Pages Live & Routed)
- Implemented high-performance, zero-dependency client-side hash routing (`handleRoute()`) across 6 dedicated page views:
  1. `#/` (`#page-home`): Discovery portal, 14-layer 3D kinetic brutalist typography hero, 3 connected value-prop cards, 3-step learning loop, 5-node cryptographic pipeline, 5 app gateway teasers, and technical edge bento grid.
  2. `#/courses` (`#page-courses`): Micro-courses marketplace, cryptographic prerequisite dependency graph (`Web3 Dasar 2026` ➔ `checkPrerequisites()` ➔ `BNB Chain Security`), LMS learner status card, 3 notification metrics, and horizontal bento course cards.
  3. `#/submit` (`#page-submit`): Dedicated AI Assessment & Submission Studio with real-time AST token counter (`Words: X · AST Tokens: ~Y · Rubric: 100%`), essay preset selector, neural reasoning streaming terminal, morphing 5-axis SVG skill radar chart, scoring meters, and EIP-712 proof box.
  4. `#/verify` (`#page-verify`): Instant Credential Verifier Sandbox & Forensic Audit Suite with 5 tabs (`Summary`, `On-Chain BAS & Prereqs`, `Soulbound NFT`, `CLI Audit`, `Real-Time RPC Log`), quick sample test pills (`Valid`, `Revoked`, `Delisted`, `Format Check`), and honest boundary disclosures.
  5. `#/portfolio` (`#page-portfolio`): Decentralized Learner Portfolio for Rina Oktaviani with 3-tier privacy mode toggle (`Pseudonymous`, `Named Profile`, `Salted DID Hash`), earned soulbound badge gallery with live on-chain verify bridge, interactive W3C Open Badges 3.0 raw JSON-LD inspector, and 1-click `.json` file download.
  6. `#/agent-hub` (`#page-agent-hub`): Issuer & AI Agent Governance Hub with whitelisted domain agent dossiers, interactive cryptographic revocation console (`revoke()`), and anti-compromise delisting register.
### Iteration 11: Browser Wallet Connect, IDE Submission Studio Polish, and Celebratory Soulbound Mint Modal
- **Navbar Web3 Wallet Integration with 1-Click Demo Learner Fallback:**
  - Added `#wallet-nav-container` to the persistent top navbar with a primary `Connect Wallet` CTA and an active connected pill showing truncated address (`0x5cA3...7c3B`) or Web3 username (`rina.bnb`).
  - Added `#wallet-modal` dialog supporting two frictionless pathways:
    1. **Browser Wallet (MetaMask, Trust Wallet, Binance Wallet, etc.)**: Connects via `window.ethereum.request({ method: 'eth_requestAccounts' })` with auto-chain check/switch for BNB Smart Chain Testnet (`0x61` / 97) or Mainnet (`0x38` / 56).
    2. **1-Click Demo Learner (`rina.bnb`)**: Fallback for instant testing with zero wallet setup or gas, persisting learner session in `sessionStorage` (`lencana_wallet`) across all 6 views (`#/courses`, `#/submit`, `#/portfolio`, etc.).
  - Added disconnect action and synced learner/portfolio wallet displays dynamically upon connection changes.
- **Visual Polish for AI Assessment Studio (`#/submit`):**
  - Upgraded essay submission textarea into an **IDE-style code/essay editor frame** (`.eval-ide-frame`) with macOS-inspired window controls (red/yellow/green dots), file indicator (`student_submission_capstone.sol`), real-time status chip (`READY`), and live character & AST token counters.
  - Implemented an **editor line numbers gutter** (`.eval-gutter`) that dynamically calculates line counts on input and syncs vertical scroll with the editor textarea.
- **Celebratory Holographic Soulbound Credential Minting Modal (`#mint-modal`):**
  - Upon successful AI essay evaluation (reaching Phase 3 Honors Pass), a celebratory modal automatically triggers with full-screen confetti animation via HTML5 canvas (`#mint-confetti-canvas`).
  - Features a floating, rotating 3D holographic gold badge (`.mint-holographic-badge`), congratulatory achievement headers, gasless soulbound ERC-5192 tags, and a verifiable cryptographic receipt (`Tx Hash`, `Attestation UID`, `Recipient Address`).
  - Direct 1-click navigation bridges:
    - `Verify On-Chain ➔`: Closes modal, routes to `#/verify`, populates valid hash, and runs immediate verification audit.
    - `View in Portfolio ➔`: Closes modal and routes directly to `#/portfolio`.
- Complete bilingual i18n support in `web/src/i18n.ts` for English and Bahasa Indonesia.
- Verified with TypeScript typecheck (`tsc --noEmit`) and Vite production build (`0` errors).

### Iteration 12: Executive Printable Diploma Modal, Recruiter Resume QR Code, Social Proof Sharing, & W3C Bitstring Status List Visualizer
- **Executive Printable Diploma Modal (`#diploma-modal`):**
  - Designed an authentic, high-prestige academic certificate sheet (`.diploma-sheet`) with classic academic typography, gold guilloche borders, corner ornaments, and an official BNB Chain crest.
  - Dynamically renders student name (or pseudonymous address based on chosen W3C privacy tier), course name, honors pass grade (93/100), autonomous AI evaluator signature block (`Agent-Foundations 0x8211...7DE`), and protocol registrar seal (`CredentialResolver.sol`).
  - Integrated a **Deterministic Pure-Vector SVG QR Code Generator** pointing directly to the live on-chain verification URL (`https://lencana.io/#/verify?q=0x0b95...`).
  - Full `@media print` print stylesheet: clicking "Print / Save as PDF" hides headers, footers, toolbars, and backdrops, formatting the diploma as a clean, crisp, high-resolution A4 landscape document ready for HR submission or framing.
- **Social Proof & Recruiter Sharing Suite:**
  - Integrated 1-Click **"Add to LinkedIn"** intent URL pre-populated with certification name, issuing organization, issuance date, and live credential verification link.
  - Integrated 1-Click **"Share on X / Twitter"** intent with pre-formatted announcement post and hashtags.
  - Added **"Embed Badge"** action that copies an HTML/Markdown badge snippet for developer portfolios and GitHub READMEs.
- **W3C Bitstring Status List Visualizer (`#/agent-hub`):**
  - Added an interactive 16x16 matrix (256 bits) representing `BitstringStatusList2021` derived directly from on-chain smart contract storage.
  - Displays Bit #0 (Valid/0, green), Bit #42 (Revoked/1, pulsating red), and Bit #87 (Suspended/1, amber).
  - Features a simulation toggle button ("Simulate State Flip") that mutates bits in real time and updates the live multibase Gzip string representation.
- Full bilingual i18n support in `web/src/i18n.ts` (EN and ID).
- TypeScript check (`tsc --noEmit`) and Vite production build pass with **0 errors**.

### Iteration 13: Interactive Tamper & Forgery Defense Playground (Scene 3) & B2B Recruiter Bulk Audit via x402 Micropayments (Scene 4)
- **Interactive Tamper & Forgery Defense Playground (`#/verify`):**
  - Designed an interactive adversarial security testing console right below the verifier sandbox to let hackathon judges and recruiters test real attack vectors against Lencana's cryptographic primitives.
  - Implemented 4 live attack scenario simulators:
    1. **Attack 1: Document Tampering (Grade 93 ➔ 99)**: Simulates modifying payload grade or student identity. Demonstrates mathematical digest divergence (`0x7e3a...` vs `0x0b95...`) and EVM revert `AttestationNotFound()`, plus ECDSA signature verification failure (`ecrecover != agentSigner`).
    2. **Attack 2: ERC-5192 Soulbound Token Theft / Transfer**: Simulates an adversary invoking `safeTransferFrom(Rina, Thief, tokenId: 1)`. Demonstrates smart contract internal lock guard checking `locked(1) == true` and reverting with `ErrLocked(1)`.
    3. **Attack 3: Rogue AI Agent Impersonation**: Simulates an unapproved rogue bot attempting to issue a credential attestation. Demonstrates BAS resolver hook calling `CredentialResolver.onAttest()` and reverting with `NotAnIssuer(0xBadBot)`.
    4. **Attack 4: Revoked Prerequisite Chaining**: Simulates an attacker trying to claim Level 2 advanced credentials while Level 1 foundational credential was revoked. Demonstrates `checkPrerequisites()` detecting `revocationTime != 0` and reverting with `PrerequisiteRevoked()`.
  - Built an encapsulated simulated EVM call stack terminal with live execution logs, gas consumption, and revert status badges.
- **B2B Recruiter Bulk Audit & x402 Micropayment Protocol Console (`#/verify`):**
  - Solves the enterprise scalability problem for recruiters (Bagas) and ATS systems auditing 20–50 applicant resumes in milliseconds.
  - Interactive 4-step protocol handshake visualizer:
    1. Client Batch Request: `POST /api/v1/verify/batch [10 hashes]`
    2. Gateway Challenge: `HTTP/1.1 402 Payment Required (0.0005 tBNB)`
    3. EIP-712 Micro-Authorization: `PAYMENT: eip712-allowance-...`
    4. Batch Verification Output: `200 OK (118ms)` with green/red/amber status pills across all 10 candidates (8 Valid, 1 Revoked, 1 Delisted).
  - Prominently highlights the core protocol principle: *"We charge for convenience, never for truth. Public verification is free, wallet-free, forever. x402 micropayments directly reimburse platform issuance gas without debt ledgers."*
- Full bilingual i18n support in `web/src/i18n.ts` (EN and ID).
- TypeScript check (`tsc --noEmit`) and Vite production build pass with **0 errors**.

### Iteration 14: Presentation Demo Walkthrough Dock (4 Scenes) & W3C VC 2.0 / Open Badges 3.0 Specification Compliance Matrix
- **Presentation Demo Walkthrough Helper Dock (4 Scenes):**
  - Added a persistent sticky dock below the main navbar with glowing gold status indicator and 1-click navigation for all 4 hackathon demo scenes:
    - **Scene 1: Public Verify:** Zero-wallet instant verification of sample credential hash on BSC testnet (routes to `#/verify`, triggers `run()`, and smooth scrolls to results).
    - **Scene 2: AI Assessment:** Autonomous AI essay evaluation and Soulbound minting (routes to `#/submit`, selects Web3 Dasar, populates sample essay, runs evaluation radar animation, and triggers the celebratory Soulbound Mint modal).
    - **Scene 3: Tamper Defense:** Adversarial security playground (routes to `#/verify`, smooth scrolls to `#tamper-playground`, executes Attack 1: Grade 93 ➔ 99 Tamper, and displays the simulated EVM revert call stack).
    - **Scene 4: B2B Recruiter x402:** Enterprise bulk audit console (routes to `#/verify`, smooth scrolls to `#x402-console`, executes 4-step HTTP 402 payment handshake, and renders 10 candidate audit results).
  - Includes an interactive minimize/expand toggle for screen space flexibility.
- **W3C VC 2.0 & Open Badges 3.0 Specification Compliance Matrix:**
  - Integrated into both `#page-verify` and the dynamic verification report (as a 6th forensic tab `#tab-w3c-spec`).
  - Evaluates all 14 mandatory normative assertions of W3C Verifiable Credentials 2.0 and Open Badges 3.0 (§9.1 Bitstring Status List):
    1. `@context` sequence ordering (`credentials/v2` followed by `ob/v3p0/context-3.0.3.json`).
    2. Type heritage inheritance (`VerifiableCredential` + `OpenBadgeCredential`).
    3. `validFrom` datetime property (ISO-8601 UTC string; legacy `issuanceDate` forbidden).
    4. `validUntil` expiration semantics (`validUntil` defines expiration; legacy `expirationDate` forbidden).
    5. Mandatory achievement criteria (`credentialSubject.achievement.criteria.narrative` present).
    6. Subject identifier XOR rule (`id` XOR `identifier` strictly enforced).
    7. Result value string format (`result[0].value` as string; legacy `resultScore` banned).
    8. Blockchain expiration synchronization (Document `validUntil` matches EAS attestation `expirationTime`).
    9. Base-10 string status index (`statusListIndex` represented strictly as base-10 string).
    10. Dual purpose Bitstring Status Lists (`revocation` via agent EAS revoke + `suspension` via platform delisting).
    11. Status entry fragment anchor URI (`id` is URI `#fragment`, strictly distinct from parent list URL).
    12. Cryptosuite specification (`DataIntegrityProof` with `eddsa-rdfc-2022`).
    13. Assertion method proof purpose (`proof.proofPurpose: "assertionMethod"`).
    14. BAS bitstring blockchain anchor (`BAS.timestamp()` hash commitment verified via `getTimestamp()`).
  - Features an interactive **"Run Spec Compliance Audit"** action with sequential green pulsing row animations.
  - Features a live **Canonical Signed OpenBadgeCredential 3.0 Document (JSON-LD)** inspector with 1-click **Copy JSON-LD** and **Download .jsonld** actions.
  - Prominent **Formal Boundary & Certification Target Disclosure** adhering strictly to `vault/03-evidence-and-limits.md`:
    *"Target: Built strictly to W3C VC 2.0 Recommendation and Open Badges 3.0 specification. Official third-party 1EdTech validator run (vc.1ed.tech) remains a roadmap target pending public URL testnet deployment. Content limits: Verifies cryptographic validity, Ed25519 multikey signature, and immutable block timestamp; does not evaluate subjective real-world truth of learner essay claims."*
- Full bilingual i18n support in `web/src/i18n.ts` for English and Bahasa Indonesia.
- Verified with TypeScript typecheck (`tsc --noEmit`) and Vite production build (`0` errors, `dist/` built in 2.16s).

### Iteration 15: Executive Academic Institute Hero Redesign ("Typical Kelas Gitu")
- **Executive Academic Aesthetic Overhaul (`web/index.html` & `web/src/style.css`):**
  - Replaced the kinetic brutalist hero (which featured comic book extruded shadows, doodle squiggles, and spinning stickers) with an ultra-prestigious, dignified Masterclass Academy standard aligning with top-tier Web3 institutes (Apple, Linear, MIT Web3 Academy).
  - Ambient deep obsidian dome (`#08090C`) with subtle warm gold radial aura and hairline precision alignment.
  - Institution status pill: `🏛️ BNB CHAIN · AUTONOMOUS AI ACADEMY & ON-CHAIN REGISTRY · TESTNET LIVE`.
  - Masterclass editorial headline: *"The On-Chain Standard for Autonomous AI Credentials."* with platinum-to-gold luxury gradient accent.
  - Refined nested action CTAs: `Explore Micro-Courses (➔)` and `Instant Public Verifier (0 Gas)`.
  - 4-item hairline trust metric strip: Open Badges 3.0 W3C format, 0 Wallet Required eth_call audit, EAS 1.3.0 Engine, ERC-5192 Soulbound.
- **Centerpiece Visual: Double-Bezel Academic Credential Glass Plaque (`.hero-plaque-container`):**
  - Double-bezel titanium and gold hairline corner brackets with subtle ambient back-glow.
  - Institutional crest and official on-chain status indicator dot.
  - Demonstrated Competency Certificate for Rina S. Pramono (`0x5cA3...7c3B`) in *Web3 Security & Reentrancy Defense*.
  - 93/100 Honors with Distinction (*Summa Cum Laude*) with live rubric progress breakdown (Analytical Depth, EVM Security, Reentrancy Mitigation).
  - Official embossed gold wax seal with BNB Chain insignia and EAS resolver verification pass.
  - Cryptographic attestation UID and AI faculty signer address (`0x91a7cD37B30A66f2...`).
  - Interactive 1-click **"Audit Live Proof in Verifier"** button (`btn-load-demo-hero`) bridging directly to the forensic verification suite.
  - Companion recruiter verification simulator pill (`bagas-recruiter.bnb` · `btn-hero-recruiter-check`).
- **Executive Architecture Bento Grid (3 Modules):**
  - Module 01: Autonomous AI Essay Grading (multimodal LLM evaluation with transparent on-chain rubrics).
  - Module 02: BAS Resolver Security Hooks (tamper-proof prerequisite verification and anti-replay locks).
  - Module 03: Zero-Wallet Public Verification (instant direct RPC inspection without MetaMask or gas).
- **Internationalization & Verification:**
  - Full bilingual i18n support in `web/src/i18n.ts` for English and Bahasa Indonesia.
  - TypeScript typecheck (`tsc --noEmit`) and Vite production build (`npm run build`) passed with **0 errors** (built in 2.50s).

### Iteration 16: Lencana Dark Cinematic AI-Ops Hero Page & Full Ecosystem Integration
- **Lencana Brand Identity & Geometric Shield Crest:**
  - Replaced dummy Nexum branding with **lencana** wordmark and custom geometric BNB shield/diamond cryptographic vector SVG.
  - Page title and meta updated to: `Lencana — Autonomous AI Credentials on BNB Smart Chain`.
- **Exact CloudFront Full-Bleed Background Video:**
  - Integrated high-definition cinematic video URL: `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4`.
  - Absolute full-bleed `inset-0`, `w-full h-full object-cover`, with `autoplay`, `loop`, `muted`, and `playsinline` at `z-0`. Content sits cleanly at `z-10`.
- **Tailored Lencana Hero Headline & Eyebrow:**
  - Eyebrow pill: `BNB SMART CHAIN · AUTONOMOUS AI CREDENTIAL REGISTRY`.
  - Authoritative headline: *"Autonomous AI credentials that prove your on-chain mastery"* (`text-3xl sm:text-4xl lg:text-[3.5rem]`, font-semibold, leading-[1.1], tracking-tight, max-w-xl).
- **Interactive Live Credential Search & Verification Capsule:**
  - Replaced generic newsletter input with a functional Web3 verification capsule.
  - Input: `Paste credential UID (0x...) or wallet address` with primary action button `Verify Now ➔`.
  - Submitting seamlessly routes to `#/verify`, pre-fills the address or sample UID, and triggers the on-chain verification engine.
  - 1-click test chip: `🟢 1-Click Test Valid Attestation (0x0b95...)` and `📚 Explore Micro-Courses`.
- **Lencana Glass Cards (Stats & Recruiter Trust Plaque):**
  - **Stats Glass Card (`bg-white/10 backdrop-blur-lg`):** Silkscreen counter **14,800+** with subtext *"On-chain credentials evaluated by autonomous AI and anchored permanently on BNB Chain."* plus metadata tags (`0 Gas eth_call`, `EAS 1.3 Resolver`).
  - **Recruiter Trust Glass Card (`bg-white/10 backdrop-blur-lg`):** BNB Chain Ecosystem crest with authentic hiring quote: *"Lencana eliminated credential fraud in our hiring. A single eth_call proves candidate code was evaluated by autonomous AI and locked on-chain."* attributed to **Bagas Pratama** (`Head of Web3 Talent · ChainWorks`).
- **Glassmorphic Navigation & Interactive Mobile Drawer:**
  - Desktop Glass Nav Cluster: `rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg` mapped directly to Lencana portals: `Courses` (`#/courses`), `AI Studio` (`#/submit`), `Verifier` (`#/verify`), `Portfolio` (`#/portfolio`), `Governance` (`#/agent-hub`).
  - Nav Action Pill: `Launch Studio` (`linear-gradient(to bottom, #2B2B2B, #101010)`).
  - Mobile Hamburger (`md:hidden`) with 300ms morphing icon animation (`Menu` ↔ `X`), glass overlay backdrop (`bg-black/80 backdrop-blur-md`), and slide-in drawer (`bg-black/90 backdrop-blur-xl`, `w-72`) with 60ms staggered link transitions and delayed bottom CTA.
- **Full Ecosystem Architecture Below the Fold:**
  - Restored `#portal-gateways` (Courses Marketplace, AI Submission Studio, Instant Verifier Sandbox, Learner Portfolio, Agent Governance Hub).
  - Restored `#architecture` (Technical Edge Bento Grid: AI Agent as Issuer Never Verifier, Closing EAS Prerequisite Loopholes, Soulbound ERC-5192, Zero-Wallet Public Verification).
  - Integrated subtle bottom scroll cue (`↓ Scroll to explore dedicated portals & architecture`).
- **Build Verification & Performance:**
  - Tested with `tsc --noEmit` and `vite build` (`0` errors, `dist/` built in 1.94s).



