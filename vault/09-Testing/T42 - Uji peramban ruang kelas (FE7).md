---
tags: [testing, "T42", frontend]
status: active
updated: 2026-10-01
command: signer lokal (origin=test) + vite dev 127.0.0.1:5173 + Chromium headless (MCP stealth-browser), langkah di bawah
measured: 2026-10-01
result: alur ruang kelas di peramban sungguhan — gerbang tamu, kunci perangkat → enroll bertanda tangan, tandai selesai → POST /progress, kuis → POST /grade + pembahasan server, esai → POST /essay tanpa angka, rute lama, #/me + baca chain; 11 rute tanpa error konsol. Menemukan B122 (preflight CORS 405 di 7 rute) + dua bug halaman yang ikut terbawa dari lms.ts
---

# T42 - Uji peramban ruang kelas (FE7, 1 Okt malam)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Merge:** [[03-Frontend/FE7 - Merge cabang FE 1 Okt]] · **Backlog:** B122 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B122 - Preflight CORS]] ·
**Summary:** [[08-Results/B122 - Executive Summary]]

Kenapa ada: halaman kelas baru (`pages/class.ts`, `pages/landing.ts`, `new-app.ts`) adalah kode DOM, dan probe web
(`npm run probe`) hanya menguji `learning.ts` di Node dengan `fetch` palsu. Satu-satunya cara tahu halaman benar-benar
bekerja adalah menjalankannya di peramban terhadap signer sungguhan. **Ini uji manual-otomatis satu kali, bukan harness**:
langkahnya dijalankan lewat MCP peramban dan keluarannya ditempel apa adanya.

## Setup

- `cd signer && LANCENA_ORIGIN=test npm run serve` (baris uji `origin=test`, dihapus `npm run cleanup -- --apply` sesudahnya)
- `cd web && npx vite --host 127.0.0.1 --port 5173`
- Chromium headless 1440×900, sesi baru (storage kosong)

## Langkah dan keluaran

| # | langkah | keluaran yang terbaca dari DOM/state |
|---|---|---|
| 1 | buka `#/` | `page-new-app` tampil; 2 kartu: `#/class/web3-dasar-2026` "307 MINUTES · 5 MODULES · 19 LESSONS", `#/class/web3-lanjut-2026` "105 MINUTES · 2 MODULES · 5 LESSONS"; hero = teks yang dikoreksi; tautan sumber = repo proyek |
| 2 | nav tamu | **sebelum perbaikan:** `nav-agent-hub` dan `nav-publishers` *hidden* (penjaga FE menganggap semua `#/…` rute peserta); sesudah: keduanya tampil, `nav-classroom`/`submit`/`portfolio` tetap tersembunyi |
| 3 | buka `#/class/web3-dasar-2026` tanpa sesi | kembali ke `#/`, `lencana_enroll_target = web3-dasar-2026`, modal `wallet-modal` terbuka, `.class-shell` tidak dirender |
| 4 | modal → kunci perangkat | rute jadi `#/class/web3-dasar-2026` (lewat `#/course/…` → pemetaan rute lama); 5 modul, 19 lesson, tautan `#/class/web3-dasar-2026/m1/…` |
| 5 | rekaman penerbit | **macet di "Menghubungi penerbit…"** — state `pending:false, error:"Failed to fetch"`. Sebab: `OPTIONS /enroll` → **405** (semua rute tulis). `fetch` GET dari halaman yang sama → 404 normal. → **B122** |
| 6 | sesudah preflight diperbaiki + kotak tidak lagi membeku | kotak menulis "Failed to fetch" apa adanya; klik "Baca/mulai rekaman di penerbit" → "Rekaman di penerbit" (enroll bertanda tangan kunci perangkat sampai); topbar "0% di penerbit" |
| 7 | kuis `m1/kuis-keselamatan`, 5 soal, pilihan pertama semua | **sebelum perbaikan:** "Penerbit tidak menilai: course "" is not in the publisher catalogue" (tombol kuis tanpa `data-course` — bug sejak `lms.ts`). Sesudah: "Dinilai penerbit: 0/5 benar = 0 · terbaik 0 · ambang 80 · belum cukup … referensi `0xe79f5b92ca2548da…`"; tiap soal "✗ Belum tepat." + alasan dari server; pilihan tetap terpilih dan terkunci; **opsi yang benar tidak ditandai**; tidak ada `answer`/`data-answer` di DOM; kotak: "1 usaha dinilai · skor terbaik 0" |
| 8 | rute lama `#/course/web3-dasar-2026/l/kenapa-tanpa-kepercayaan` | dialihkan ke `#/class/web3-dasar-2026/m1/kenapa-tanpa-kepercayaan` (bukan modul "l"); rail: "On This Page" + "External References" milik lesson itu |
| 9 | "Tandai selesai" | "Mencatat ke penerbit…" → "Lesson tercatat di penerbit."; topbar **5% di penerbit**; sidebar ✓ dengan judul "tercatat selesai di penerbit"; kotak 1/19 |
| 10 | `#/me` + baca chain `0xcaFb252D04eCd25ed6bf3eb8C40B32b7D43fa3f9` | kartu belajar menaut `#/class/…`; "Di penerbit: 1/19 lesson selesai · 1 usaha dinilai."; tabel chain: `0x2d90e94083… BERLAKU` (kertas T40) |
| 11 | esai `m4/esai-batas-bukti`, 436 kata | penghitung kata hidup (436); "Terkirim ke penerbit 1/5 tanda mekanis terpenuhi · 436 kata · `0x794679d1f394…`" + catatan tanpa angka; "usaha dinilai" tetap 1 |
| 12 | 11 rute berturut-turut (`#/`, `#catalog`, kelas lanjut, lesson lanjut, `#/verify`, `#/publishers`, `#/agent-hub`, `#/me`, kuis m2, kursus tak ada, lesson tak ada) | **0** error konsol, 0 exception, 0 penolakan promise; rute tak dikenal → halaman "not found" |

## Yang tidak diuji di sini

- **Login email Privy sungguhan**: mengirim kode ke kotak masuk orang tanpa izin tidak dilakukan; tetap uji builder (B82).
- Tampilan di ponsel, mode terang, dan bahasa EN penuh — teks templat lapisan belajar masih bahasa Indonesia saja.
- Praktik: formulir `POST /praktik` belum ada di halaman (OI-20); halaman menampilkan catatan jujurnya.

## Kebersihan

`npm run cleanup -- --apply` sesudah uji: 4 enrollment `origin=test` (peserta uji ini + sisa harness sesudah baterai
pertama) beserta usahanya dihapus; kueri ulang `origin=test → 0`. Signer dan vite dimatikan; tidak ada pendengar tersisa.
