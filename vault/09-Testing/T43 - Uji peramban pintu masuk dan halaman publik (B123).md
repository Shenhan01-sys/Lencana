---
tags: [testing, B123, browser]
status: active
updated: 2026-10-02
---

# T43 - Uji peramban pintu masuk dan halaman publik (B123)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B123 · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B123 - Pintu masuk satu akun dan permukaan publik tanpa simulasi]] ·
**Summary:** [[08-Results/B123 - Executive Summary]]

**Alat:** vite dev server `:5173` + Chromium headless (MCP stealth-browser), 1440×900 dan 500×900. Signer lokal tidak
dinyalakan — langkah di bawah tidak menulis ke penerbit. Tanggal: 2 Okt.

| # | langkah | hasil |
|---|---|---|
| 1 | beranda sebagai tamu | landing baru (`#page-new-app > .landing-shell`), nav tamu: Courses · Check Proof · Trust Center · Publishers; `#wallet-modal` lama tidak ada; 0 pesan konsol |
| 2 | klik "Sign in" (1440×900) | dialog terbelah terbuka, fokus di kolom email, tombol Google tersembunyi, 0 kata "privy" di teksnya; "bukan-email" → "That is not an email address." (merah) |
| 3 | dialog di 500×900 | form menjadi kartu kaca di atas ilustrasi; kartu LENCANA + laurel terlihat di atasnya (sesudah ilustrasi dinaikkan ke 44% atas kartu — tangkapan pertama menutupinya) |
| 4 | tamu membuka `#/submit`, `#/portfolio`, `#/class/web3-dasar-2026` | ketiganya berakhir di `#/` dengan dialog terbuka dan subjudul "Sign in first to open that page."; `lencana_enroll_target = web3-dasar-2026` |
| 5 | `#/verify` | tanpa `#tamper-playground` dan `#x402-console`; 0 kemunculan "simulat"; kalimat pengantar alat audit tidak lagi menyebut "attack simulations" |
| 6 | `#/agent-hub` → tombol delisting | matriks bitstring tidak ada; 0 "simulat"; tombol "Check a credential from a delisted issuer" → verifier `0xaa379627…` → "No longer valid — issuer not trusted" (dibaca dari chain 97) |
| 7 | peramban yang pernah login (penanda `lencana-privy-v1` dipasang, tanpa sesi yang bisa dipulihkan), muat ulang | landing baru, nav 4 item, dialog tertutup, 0 pesan konsol |

**Yang tidak diuji di sini:** login sungguhan lewat dialog baru (kode ke email) dan login Google (`google_oauth: false`) —
AC-B123#9.

**Insiden selama pengerjaan (dicatat, bukan dirapikan):** dua kali builder melihat landing lama ("rollback") karena
`main.ts` sempat gagal jalan di dev server: pertama impor `startDemoLearnerSession` yang sudah dibuang dari `learning.ts`,
kedua panggilan `applyPrivyModeLabels` yang tertinggal sesudah fungsinya dibuang. Saat `main.ts` gagal, `index.html` statis
menampilkan `page-home` lama dengan navbarnya sendiri (Study Room, AI Studio, Portfolio, Governance, Launch Studio). Keduanya
ditutup dalam beberapa menit dan diverifikasi ulang di langkah 1 dan 7.
