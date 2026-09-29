# Lencana vault — instructions for AI agents working in this folder

This vault is the **documentation layer** for Lencana. The source of truth for behaviour is the code
next to it (`../contracts/`, `../web/`, `../signer/`, `../script/`, `../test/`) — read it, do not
edit it from here, and do not answer from memory when a file is one `Read` away.

## Mandatory for every change you make in this vault

**0. Jangan balik urutannya: penuhi standar umum e-course lebih dulu, baru jual pembeda kita.**
Baca [[00-Overview/11 - Product Bar]] sebelum memilih pekerjaan. Kerangka 12 elemennya ada di
[[12-LMS-References/L7 - What an e-course must have]], kekurangan kita yang sudah diurutkan ada di
[[12-LMS-References/L8 - Lencana vs LMS]] §C, dan keputusan penyimpanan (Supabase/PostgreSQL untuk
state belajar; chain tetap tempat yang dipercaya publik) ada di halaman yang sama. Menonjolkan
kredensial sambil kerangka belajar bolong membuat produk terbaca sebagai demo — yaitu kegagalan yang
kita dokumentasikan untuk platform orang lain.

1. **Never state a number you have not just produced.** Test counts, check counts, gas, addresses,
   page counts, dates. Run the command (or read the run log inside `app/`) and cite it in the note.
   If you cannot run it, write `_unmeasured_` next to the figure instead of deleting the row. This is
   the single rule that most protects the submission: judges re-run things.
2. **Per-item documents use hub + one file per item** (acceptance criteria, test records, executive
   summaries, open items for the frontend maintainer). A hub holds the **document map** — one row per
   item. Do not pile several items into one file: it is what makes context get lost mid-task.
3. **Every per-item file starts with a map line** to its siblings
   (`**Backlog:** … · **AC:** … · **Testing:** … · **Summary:** …`) and links both ways. Add the map
   row in the hub in the same edit.
4. **Reuse stable IDs.** Decisions `D#`, backlog `P#`, open items `OI-#`, criteria `P#<letter>#<n>`.
   New ID → update the map, or it is a defect.
5. **Cite code as `path/file.ext:line`** (inline code, repo-relative). Wikilinks are for `.md` only.
   Absolute local paths (`file:///C:/…`) are forbidden — they are broken for every other reader.
6. **Claims must be reproducible from inside `app/`.** If the only proof lives outside this
   repository, the claim does not belong here. Check anything you write about what the product
   "does" against [[10-Contributors/Claims-Cheat-Sheet]] — several phrasings are deliberately
   forbidden because they would overstate what was measured.
7. After editing: `powershell -ExecutionPolicy Bypass -File scripts\sync-vault.ps1` and then
   `scripts\check-links.ps1` → **`Broken: 0`** (both kinds now: `[[wikilinks]]` **and** relative
   markdown links across every `.md` in the repo — a guard that only knows one syntax reports green
   over half the corpus), `scripts\check-mermaid.ps1` → **`Hazards: 0`**, `scripts\check-lang.ps1` →
   **`CJK tokens: 0`**, and `scripts\check-paste.ps1` → **`PASTE HIJAU`** (the submission field holds
   5,600 characters; the artifact crept four past that on 28 Sep while every other gate was green).
   (a literal `;` inside a `sequenceDiagram` makes the whole block fail to render, and prose review
   cannot see it). Module-Guide stubs created by the script must be filled, not left as `TODO`.
8. Superseded files: move the content and delete the file in one commit, or keep it under an
   `⚠️ ARCHIVED — see <note>` banner. Corrections stay visible; do not tidy away a wrong claim that
   was already pushed.
9. Language: **Indonesian is fine here** — decided by the builder on 28 Sep, which also closes B79.
   Write whatever the reader of that page needs; `web/` UI copy stays Indonesian-first. What still
   counts as a defect is not the language but an unsourced number or a claim without a command.
   (Former rule said English-only; keeping it would have made a rule we break every session, which is
   how rules stop meaning anything.)
10. Frontend files (`../web/index.html`, `../web/src/main.ts`, `render.ts`, `style.css`, `i18n.ts`)
    belong to the frontend maintainer. Read [[10-Contributors/00 - Hub Contributors]] before
    touching them; if you must, keep the mount points and run typecheck + build + probe afterwards.

11. **Jangan berhenti karena memperkirakan ruang konteks — dan jangan menunda pencatatan.**
    Sesi ini bisa dipangkas otomatis kapan saja; itu tidak masalah **asal** state penting sudah
    tertulis di vault sebelum pemangkasan terjadi. Jadi: (a) kerjakan item sampai gerbang hijaunya,
    jangan berhenti di tengah karena menebak sisa ruang; (b) begitu menemukan keputusan, blocker, atau
    angka yang belum tercatat, tulis ke vault **saat itu juga** (baris backlog + halaman terkait dalam
    suntingan yang sama), bukan "nanti"; (c) kalau memang harus berhenti, alasannya ditulis sebagai
    baris `⏸️` dengan sebab + perintah yang tersisa, bukan "konteks hampir penuh"; (d) angka yang
    dikutip wajib dari run hari itu — kalau pemangkasan membuat angka lama tak terverifikasi, jalankan
    ulang perintahnya, jangan kutip dari ingatan.
    (Aturan ini lahir 29 Sep: saya menolak mengerjakan B81 dengan alasan ruang, padahal pemakaian
    konteks baru 46,7% dan tenggat masih 21 jam. Kesalahan jenisnya sama dengan B43/B53/B56 — menyimpulkan
    tanpa mengukur, lalu bertindak berdasarkan kesimpulan itu.)

12. **Selesai berarti vault ikut selesai — bukan kode saja.** Setiap item (develop, refactor,
    bugfix, angka baru) yang kunyatakan beres wajib menutup loop di [[WORKFLOW]] sampai gerbangnya
    hijau: angka dari run hari itu → halaman harness/hasil + baris backlog dalam SUNTINGAN yang sama
    → kekunoan ditulis sebagai koreksi terlihat, bukan ditimpa → commit lokal (dorong hanya atas kata
    builder). Alasannya diukur: 29 Sep vault tertinggal dari angkanya sendiri di enam berkas
    (`START-HERE`, `01 - Backlog`, `T21`, `T22`, `T24`, `Quick-Reference`)
    dan baru ketahuan karena digrep setelah ditanyakan — lihat baris **B93** di
    [[07-Backlog/03 - Findings and Tasks 2026-09-26]]. Kalau ruang sesi tinggal sedikit: tulis dulu
    keadaan penting ke vault, baru berhenti (aturan 11). Kekunoan vault adalah klaim yang salah
    pelan-pelan.
13. **Dilarang menyunting berkas lewat perintah shell inline.** (ditulis setelah insiden nyata 29 Sep)
    Menyisipkan satu baris ke `package.json` dengan `node -e` meninggalkan **koma ganda** →
    `EJSONPARSE` → **setiap `npm run` di `signer/` mati**, dan berkas rusak itu ikut **terdorong ke
    repo publik** (`3395b27`, baru diperbaiki `17da549`). Perintah inline yang sama meninggalkan berkas
    sampah `signer/new` dan merusak karakter non-ASCII di tengah string. Aturan kerjanya:
    - sunting berkas dengan **tool editor** (`edit` / `write_file`). Kalau perlu skrip, tulis skripnya
      sebagai **berkas** (`.mjs`), jalankan, lalu baca keluarannya — bukan satu baris di shell.
    - setelah menyentuh berkas konfigurasi: **validasi dengan memakainya**, bukan dengan membaca
      teksnya (`node -e "require('./package.json')"` + satu `npm run` sungguhan). Berkas yang bisa
      di-parse belum tentu bisa dijalankan.
    - **jangan dorong suntingan config sebelum satu perintah nyata berhasil darinya.**
14. **Alat baru wajib dijalankan di SEMUA jalurnya sebelum dipercaya.** (tertukis tiga kali pada hari
    yang sama) `sync:numbers` lolos di jalur kumpulkan tapi mati di jalur `--verify`
    (`JSON.parse(...).numbers` padahal berkas ditulis `{capturedAt, items}`); sesudah itu `--verify`
    melaporkan **BEDA untuk halaman yang benar** karena polanya menuntut `**8/0**` sedang halaman
    menulis `**8/0 · 19 dari 19**`; dan `audit` versi pertama menghasilkan **dua tembakan palsu**
    (ia melabeli address dari regex bentuk alamat, bukan dari nama variabel, jadi `BAS_ADDRESS` —
    EAS pihak ketiga, 18.881 byte, memang tanpa `schemaUID()` — dilaporkan sebagai "resolver kedua
    yang mati"). Penjaga berpola salah lebih berbahaya daripada tidak ada penjaga: ia **melatih orang
    mengabaikan barisnya.** Jadi: tulis alat → jalankan tiap mode-nya → kalau merah, buktikan dulu
    apakah yang salah alatnya atau dunianya (`Conventions` #5, dan B59/B85/B86 adalah contoh yang
    sudah lewat).
15. **Jangan menulis ulang riwayat publik seorang diri.** Insiden aturan 13 sudah lewat: perbaiki
    keadaannya, tulis kejadiannya (commit + vault), dan minta keputusan sebelum `--force-push`.
    Commit yang sudah pernah dilihat orang dibiarkan apa adanya kecuali builder memerintahkan
    sebaliknya — termasuk typo di badan commit: itu jejak, bukan aib yang layak menghapus riwayat.

Full rules: [[Conventions]] · Orientation: [[START-HERE]] · Document maps:
[[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · [[09-Testing/00 - Hub Testing]] ·
[[08-Results/00 - Hub Results]] · [[10-Contributors/Open-Items/00 - Hub Open Items]]
