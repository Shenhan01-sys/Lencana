# Status & Arsitektur Frontend Lencana (Frontend State Report)

Dokumen ini mendokumentasikan secara komprehensif seluruh arsitektur, status implementasi, alur rute, sistem autentikasi, integrasi smart contract/LMS, struktur kode, serta tata letak antarmuka pengguna (*Frontend*) proyek **Lencana**.

---

## 1. Ringkasan Eksekutif (Executive Summary)

* **Nama Modul:** Lencana Web Client (`web/`)
* **Branch Git Aktif:** `dex/lencana-ui` (Tersinkronisasi dengan `origin/dex/lencana-ui`)
* **Author Commit:** `agadape <agadape@gmail.com>`
* **Status Build & Typecheck:** 
  * `tsc --noEmit`: **0 Errors (Passed)**
  * `vite build`: **3.16s (Passed, production ready in `dist/`)**
  * `Local Dev Server`: **Running at `http://127.0.0.1:5173/` (Vite v7.3.6)**
* **Filosofi Desain & Stack:**
  * **Zero-Framework Overhead:** Ditulis murni menggunakan **Vanilla TypeScript + Standard HTML5 + Native CSS3**. Tidak ada dependensi React/Vue/Svelte yang memperberat bundle atau memunculkan isu hidrasi.
  * **Kepatuhan Desain & Vault:** Mengacu penuh pada spesifikasi di `vault/03-Frontend/` dan `vault/11-Refactoring/RF3 - Onboarding and Identity.md`.
  * **Prinsip Verifikasi Trustless:** Halaman verifikasi kredensial (`#/verify`) tidak membutuhkan backend maupun wallet — membaca *EAS Schema Resolver* dan *Soulbound Certificate* langsung via JSON-RPC `eth_call` (0 Gas, 0 Wallet).

---

## 2. Arsitektur Halaman & Hash Router (`src/main.ts`)

Aplikasi menggunakan *Client-side Hash Router* (`window.location.hash`) yang memisahkan area publik promosi, ruang belajar terautentikasi (LMS), dan pusat verifikasi on-chain:

```
                  ┌───────────────────────────────────────────────┐
                  │                 Lencana Router                │
                  └───────────────────────┬───────────────────────┘
                                          │
       ┌──────────────────┬───────────────┴──────────────┬──────────────────┐
       │ Public Layer     │                              │ Authenticated    │ Tooling / Trust
       ▼                  ▼                              ▼                  ▼
┌──────────────┐   ┌──────────────┐               ┌──────────────┐   ┌──────────────┐
│  Page: Home  │   │Page: Courses │               │ Page: Learn  │   │ Page: Verify │
│    (#/)      │   │ (#/courses)  │               │(#/learn,     │   │  (#/verify)  │
│              │   │              │               │ #/course/:id)│   │              │
│- Hero Video  │   │- Public      │               │- Interactive │   │- Direct RPC  │
│- Verifier    │   │  Catalog     │               │  Study Room  │   │- Zero Gas    │
│  Capsule     │   │- Dependency  │               │- Quiz & Essay│   │- Soulbound   │
│- 5176 Plate  │   │  Tree        │               │- EIP-191 Auth│   │  Check       │
└──────────────┘   └──────────────┘               └──────────────┘   └──────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │Page: Onboard │
                                                  │(#/onboarding)│
                                                  │- Privy Modal │
                                                  │- Email OTP   │
                                                  │- Google 1-Clk│
                                                  └──────────────┘
```

### Rincian Rute & Halaman:

| Rute Hash | Target Page ID / Mount | Deskripsi & Komponen Utama |
|---|---|---|
| `#/` | `#page-home` | **Landing Page Sinematik:** Full-bleed background video CloudFront, wordmark Lencana, interactive search capsule untuk verifikasi instan, chip sampel terverifikasi, chip onboarding Privy, dan showcase objek kredensial ERC-5176 dengan aksen *proof-plate* & rivet logam. |
| `#/courses` | `#page-courses` | **Katalog Publik Kursus:** Pohon prasyarat interaktif (*Prerequisite Dependency Tree: Stage 1 Web3 Dasar $\rightarrow$ Stage 2 Web3 Lanjut*), kartu silabus, estimasi waktu, tag kesulitan, dan tombol daftar (*Enroll*). |
| `#/learn` / `#/course/:id` | `#page-courses` (`#lms-mount`) | **Ruang Belajar LMS Terautentikasi:** Di-render secara dinamis oleh `src/lms.ts`. Menampilkan rekaman status belajar di penerbit, kartu identitas peserta, modul materi interaktif, kuis pilihan ganda, dan kotak esai dengan tombol uji instan. |
| `#/onboarding` / `#/login` | `#page-home` + `#wallet-modal` | **Alur Masuk Cepat Privy:** Membuka modal login langsung pada panel *Privy Embedded Wallet* (Google social login & Email OTP) tanpa menampilkan opsi dompet teknis terlebih dahulu. |
| `#/verify` | `#page-verify` | **Instant Verifier BNB Chain:** Kotak input hash attestation / alamat pembelajar, status node BSC Testnet (Chain ID 97), perincian EAS resolver, status pencabutan (*revocation*), dan penampil data JSON-LD. |
| `#/submit` | `#page-submit` | **AI Submission Studio:** Editor esai Web3 bernuansa IDE, rubrik evaluasi AI, dan simulator penilaian instan sebelum dicatat on-chain. |
| `#/portfolio` | `#page-portfolio` | **Portofolio Pembelajar:** Menampilkan kredensial *Soulbound* yang telah dicetak, sertifikat non-transferable ERC-5192, dan tautan bagikan ke LinkedIn / X. |
| `#/agent-hub` | `#page-agent-hub` | **Trust Center & Agent Governance:** Dasbor transparansi EAS Resolver, status list 2021 multibase bitstring registry untuk pemantauan pembekuan atau pencabutan kredensial. |

---

## 3. Sistem Autentikasi & Identitas Pembelajar (`src/privy.ts`, `src/learning.ts`)

Berdasarkan dokumen `vault/11-Refactoring/RF3 - Onboarding and Identity.md`, Lencana menerapkan sistem identitas tri-mode:

### 3.1. Mode 1: Privy Embedded Wallet (`kind: 'privy'`) — *Disarankan*
* **Teknologi:** Didukung oleh `@privy-io/js-sdk-core` (`v0.77.0`).
* **Metode Masuk:**
  1. **1-Click Google OAuth:** Masuk menggunakan akun Google tanpa perlu ekstensi browser.
  2. **Email OTP Verification:** Memasukkan alamat email $\rightarrow$ menerima 6 digit OTP $\rightarrow$ verifikasi instan.
* **Offline & Sandbox Fallback:**
  * Apabila aplikasi dijalankan di lingkungan offline, saat kuota API habis, atau tanpa konfigurasi API Key eksternal, sistem secara otomatis beralih ke *Local Deterministic Embedded Wallet* dengan kode default **`123456`**. Juri dan penilai tidak akan pernah gagal melakukan review.
* **Transparansi Kunci (Mandatory per RF3):**
  * Antarmuka secara transparan mencantumkan teks kepatuhan:
    > *"Catatan Kunci: Wallet kamu dibuatkan untukmu oleh infrastruktur Privy dan dapat diekspor kapan saja. Alamat EVM ini digunakan untuk mencatat progres belajarmu dan menerima bukti kredensial di BNB Chain."*
  * Sistem tidak pernah menggunakan klaim palsu seperti *"kami tidak pernah memegang kunci kamu"*.

### 3.2. Mode 2: Ekstensi Dompet Web3 Browser (`kind: 'dompet'`)
* Mendukung dompet EIP-1193: **MetaMask**, **Binance Web3 Wallet**, **Rabby**, dan **Trust Wallet**.
* Meminta izin koneksi (`eth_requestAccounts`) dan penandatanganan pesan otentikasi.

### 3.3. Mode 3: Kunci Tamu Perangkat (`kind: 'perangkat'`)
* Membuat pasangan kunci kriptografi sesi (*session private key*) sementara di `sessionStorage` (`lencana-learner-v1`).
* Berguna untuk pengujian kilat tanpa memasang ekstensi apa pun.

### Matriks Perbandingan Identitas:

| Fitur | Privy Embedded | Web3 Browser Extension | Kunci Tamu Perangkat |
|---|---|---|---|
| **Kebutuhan Ekstensi** | Tidak ada (0 Extension) | Perlu (MetaMask/Rabby) | Tidak ada |
| **Penyimpanan Kunci** | Enkripsi Privy / Session | Enkripsi Dompet Eksternal | `sessionStorage` lokal |
| **Karakter Kunci** | Tahan lama, dapat diekspor | Tahan lama milik user | Hangus saat tab ditutup |
| **Penandatanganan EIP-191** | Otomatis via privat key internal | Prompt interaktif di ekstensi | Otomatis via kunci lokal |
| **Dukungan Menerbitkan Ijazah** | Ya (Alamat EVM valid) | Ya (Alamat EVM valid) | Ya (untuk sesi aktif) |

---

## 4. Mesin Pembelajaran & Integrasi Signer (`src/lms.ts`, `src/learning.ts`)

Lapisan LMS (`src/lms.ts`) bertugas memuat silabus kursus dari `src/content.ts` dan menghubungkannya dengan backend penerbit:

```
[UI LMS / Lesson] ──(Klik Selesai / Kirim Kuis)──> [src/learning.ts]
                                                           │
                                             Buat Pesan EIP-191:
                                             - Kursus ID
                                             - Nonce Acak
                                             - Timestamp ISO
                                                           │
                                                           ▼
                                            [Tanda Tangan Kriptografis]
                                            (Privy / Dompet / Perangkat)
                                                           │
                                                           ▼
                                        POST /progress, /enroll, /grade
                                            ke Endpoint Penerbit
                                                           │
                                                           ▼
                                            [Pembaruan Status On-Chain]
```

* **Sinkronisasi Otomatis:** Begitu rute kursus dibuka (`#/course/:id`), LMS secara non-blocking membaca status rekaman terkini dari endpoint penerbit melalui `syncCourse(id)`.
* **Ketahanan Jaringan (Resilience):** Jika backend penerbit (*Signer Service*) sedang tidak aktif, data materi lokal tetap dapat dibaca dan dikerjakan. Halaman menandai status sebagai catatan lokal tanpa memutus pengalaman belajar pengguna.

---

## 5. Sistem Desain & Visual UI (`src/style.css`)

* **Tipografi:**
  * **Geist** (`--font-sans`): Tipografi modern, presisi mekanis tinggi, dan keterbacaan tajam pada display text maupun UI controls.
  * **Silkscreen**: Tipografi bergaya retro-terminal beresolusi tinggi, digunakan khusus pada angka metrik hero (`42,500+`).
  * **JetBrains Mono** (`--font-mono`): Angka tabular (`tabular-nums`) untuk hash keccak256, alamat hex 0x, nilai ujian, dan blok kode.
* **Palet Warna & Kontras:**
  * Latar Belakang: `--bg-app: #0B0E11`, `--bg-card: #181A20`, `--bg-input: #1E2329`.
  * Aksen Utama BNB Chain: `--bnb-gold: #F0B90B`, `--bnb-gold-hover: #FCD535`.
  * Status Indicators: Sukses (`#0ECB81`), Gagal/Dicabut (`#F6465D`), Peringatan (`#F0B90B`), Ditangguhkan (`#FF8E1D`).
* **Glassmorphism & Depth:**
  * Menghindari flat design monoton dengan menambahkan highlight border 1px (`inset 0 1px 0 rgba(255, 255, 255, 0.08)`).
  * Efek *frosted glass* halus menggunakan `backdrop-filter: blur(16px)` pada bilah navigasi dan kartu modal.
* **Aksesibilitas & Interaksi:**
  * Indikator fokus keyboard terstandarisasi (`:focus-visible`).
  * Umpan balik taktil pada tombol (`:active { transform: scale(0.98); }`).
  * Header seimbang (`text-wrap: balance`) dan paragraf rapi (`text-wrap: pretty`).

---

## 6. Lokalisasi Bilingual (`src/i18n.ts`)

Aplikasi dilengkapi dengan sistem alih bahasa instan tanpa me-reload peramban:
* **Bahasa yang Didukung:** Bahasa Indonesia (`id`) & English (`en`).
* **Penyimpanan Preferensi:** Tersimpan di `localStorage.getItem('lencana_lang')`.
* **Cakupan Kamus:** Menerjemahkan 100% komponen UI termasuk:
  * Tombol navigasi dan switcher bahasa.
  * Dialog onboarding Privy, instruksi OTP, dan teks transparansi kunci.
  * Kartu status penerbit dan istilah teknis blockchain.
  * Dialog pencetakan sertifikat Soulbound dan ijazah eksekutif.

---

## 7. Inventaris Berkas Frontend (`web/`)

| Berkas | Ukuran / Baris | Tanggung Jawab Utama |
|---|---|---|
| [`web/index.html`](file:///C:/Project_Dave/lencana/web/index.html) | ~2,400 baris | Struktur DOM utama seluruh halaman, dialog modal Privy, modal sertifikat Soulbound, audio/video player, dan template statis. |
| [`web/src/main.ts`](file:///C:/Project_Dave/lencana/web/src/main.ts) | ~3,050 baris | Orkestrator utama, hash router, event listener DOM, integrasi alur onboarding Privy, dan pembaruan teks dinamis. |
| [`web/src/privy.ts`](file:///C:/Project_Dave/lencana/web/src/privy.ts) | 142 baris | Adapter autentikasi Privy SDK, manajemen session embedded wallet, handler OTP email, dan fallback offline sandbox. |
| [`web/src/learning.ts`](file:///C:/Project_Dave/lencana/web/src/learning.ts) | 260 baris | Manajemen state pembelajar, pembuatan identitas tri-mode (`privy`/`dompet`/`perangkat`), dan penandatanganan EIP-191. |
| [`web/src/lms.ts`](file:///C:/Project_Dave/lencana/web/src/lms.ts) | 791 baris | Komponen penampil kursus interaktif, rendering materi, kuis, pengiriman esai, dan banner rekaman di penerbit. |
| [`web/src/content.ts`](file:///C:/Project_Dave/lencana/web/src/content.ts) | 480 baris | Basis data silabus kursus lokal (Web3 Dasar, Keamanan Smart Contract & Reentrancy). |
| [`web/src/verify.ts`](file:///C:/Project_Dave/lencana/web/src/verify.ts) | 650 baris | Mesin verifikasi kriptografis murni (bebas-DOM) via RPC call viem terhadap smart contract di BNB Smart Chain Testnet. |
| [`web/src/i18n.ts`](file:///C:/Project_Dave/lencana/web/src/i18n.ts) | ~1,700 baris | Definisi kamus terjemahan Bahasa Indonesia dan English untuk seluruh string aplikasi. |
| [`web/src/style.css`](file:///C:/Project_Dave/lencana/web/src/style.css) | ~14,200 baris | Seluruh aturan styling desain sistem, tema gelap, glassmorphism, responsive breakpoint, dan animasi mikro. |

---

## 8. Verifikasi Kualitas & Status Uji (QA Checklist)

- [x] **Lint & Type Safety:** Tidak ada error tipe TypeScript (`tsc --noEmit` lolos bersih).
- [x] **Kompilasi Bundle:** Berhasil dibuild dengan Vite tanpa kegagalan modul.
- [x] **Server Lokal Aktif:** Berjalan di `http://127.0.0.1:5173/` dengan response code 200 OK.
- [x] **Alur Onboarding Privy:** Input email, simulasi kirim kode OTP, verifikasi, aktivasi embedded address, dan auto-redirect ke kelas berjalan lancar.
- [x] **Kepatuhan Git & Repository:** Berada di branch `dex/lencana-ui`, author `agadape <agadape@gmail.com>`, commit bersih tanpa mencemari branch `main`.

---

*Laporan status ini disusun secara otomatis untuk dokumentasi arsitektur dan kesiapan rilis frontend Lencana.*
