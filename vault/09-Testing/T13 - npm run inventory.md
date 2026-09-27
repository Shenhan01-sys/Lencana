---
tags: [testing, "T13"]
command: npm run inventory
measured: 2026-09-26
result: 2 courses, 7 modules, 24 lessons, 412 min
---

# T13 - `npm run inventory` (ukuran permukaan belajar, dicetak dari data)

**Perintah:** `cd web && npm run inventory` (= `npx tsx scripts/inventory.ts`).
**Terakhir dijalankan:** 26 Sep 2026.

```
2 kursus · 7 modul · 24 lesson · 34 halaman · 412 menit · 28 soal kuis · 2 esai bernilai rubrik
per jenis: bacaan 9 (133 mnt) · esai 2 (95) · praktik 4 (85) · kuis 5 (47) · kasus 2 (34) · referensi 2 (18)
```

Kenapa perintah ini ada: semua angka itu **sebelumnya diketik** di dokumen, dan satu di antaranya
salah — blurb flagship menulis "Seratus sembilan puluh menit" sementara datanya 307 untuk kursus itu
(412 untuk katalog). Blurb masuk ke `achievement.description` di setiap kredensial tersign, jadi
satu angka yang salah menjadi salah di dokumen yang tidak bisa dikoreksi ([[00-Overview/04 - Corrections]]).

Aturan yang sekarang dijaga mesin: `auditCourse` **menolak** durasi yang ditulis di teks (`menit`),
dan `probe.ts` menuntut keenam jenis lesson benar-benar dipakai. Angka materi datang dari materi,
bukan dari penulis.

**Lihat juga:** [[05-Course-Content/K1 - The content model]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
