# QWEN.md — aturan kerja di repo ini (Lencana)

**Jangan balik urutannya: penuhi standar umum e-course lebih dulu, baru jual pembeda kita.**

- Kerangka 12 elemen (diturunkan dari kode 6 LMS nyata): `vault/12-LMS-References/L7 - What an e-course must have.md`
- 10 kekurangan kita, sudah diurutkan: `vault/12-LMS-References/L8 - Lencana vs LMS.md` §C
- Aturan main + keputusan penyimpanan + apa yang boleh dijual: `vault/00-Overview/11 - Product Bar.md`
- Aturan klaim (angka harus punya perintah + tanggal; "compatible 1EdTech"/"certified"/"tamper-proof" dilarang):
  `vault/10-Contributors/Claims-Cheat-Sheet.md`
- Ritual sebelum commit: `vault/AGENTS.md` (termasuk `check-paste.ps1` — kolom submission punya batas
  5.600 karakter)

**Penyimpanan:** state belajar (enrollment, progres, attempt, order) pergi ke **Supabase / PostgreSQL**
(keputusan builder 28 Sep; project ref ada di `vault/00-Overview/11 - Product Bar.md`). Yang harus
dipercaya publik **tetap di chain**: attestation, dua Bitstring Status List, anchor BAS. Service key /
token **tidak pernah** masuk repo, `.env`, argv, atau commit — hanya lewat lingkungan proses.

**Tenggat 30 Sep 23:59 WIB.** Kalau lingkup tidak muat: potong lingkupnya, jangan potong kejujurannya,
dan tulis yang dipotong ke `vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md`.

## 5. Selesai = vault ikut selesai (bukan cuma kode)

Setiap item beres (develop, refactor, bugfix, angka baru) wajib menutup loop
`app/vault/WORKFLOW.md`: angka dari run hari itu → halaman harness/hasil + baris backlog
dalam suntingan yang sama → kekunoan ditulis sebagai koreksi terlihat → commit lokal, dorong hanya
atas kata builder. Aturannya di `app/vault/AGENTS.md` #12; yang mengukurnya: 29 Sep vault
tinggal di angkanya sendiri di enam berkas dan baru ketahuan karena digrep setelah ditanyakan
(baris **B93**).
