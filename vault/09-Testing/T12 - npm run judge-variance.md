---
tags: [testing, "T12"]
command: npm run judge-variance
measured: 2026-09-24
result: substantive 91-100, decision stable 5/5
---

# T12 - `npm run judge-variance` (berapa jauh angka model bergerak)

**Hub:** [[09-Testing/00 - Hub Testing]] · **AC:** kriteria P5 di [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Bagian:** [[04-Signer-Service/S5 - Grading and the model judge]] · **Pasangan:** [[09-Testing/T11 - npm run judge]]

**Perintah:** `cd signer && npm run judge-variance`. **Terakhir dijalankan:** 24 Sep (5 run per fixture).

| fixture | rentang skor | spread | keputusan |
|---|---|---|---|
| substantif | **91 - 100** | 9 | LULUS pada 5/5 run |
| hollow (lancar, kosong) | **2 - 3** | 1 | TIDAK_LULUS pada 5/5 run |

Kalimat yang boleh dipakai: **"keputusannya stabil, angkanya punya rentang"**. Yang tidak boleh:
"nilainya persis sama setiap kali" — `temperature 0` tidak membuat LLM deterministik, dan klaim
determinisme di sini akan mudah dipatahkan orang yang mencobanya.

Konsekuensi desain: angka model tidak pernah berdiri sendiri di dokumen. Yang tercetak di
kredensial adalah `rubricRef` + (sejak 28 Sep) model penilainya, dan hasil akhirnya adalah komposisi
dari bukti mekanis + penilaian — lihat [[05-Course-Content/K4 - Scoring without the platform deciding]].

**Lihat juga:** [[04-Signer-Service/S5 - Grading and the model judge]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
## Run 30 Sep (5x, temperature 0, `openai/gpt-oss-120b`)

· substantif `100 100 100 100 100` → spread **0**, rata-rata 100,0
· fasih-tapi-kosong `4 2 5 2 2` → spread **3**, rata-rata **3,0**
· jarak antar kelas **97,0 poin**; ambang lulus kursus **70**; keputusan **benar di 5/5 run**
· 6 panggilan `HTTP 429` ditangani retry bertingkat (2s→12s) — kuota Groq, bukan kegagalan produk

Yang boleh dikutip: **3,0** dan **97,0**. Yang tidak: menyebut rata-rata substantif 100 sebagai
"penilainya akurat" — angka 100 tidak membuktikan apa-apa sampai angka 3,0 itu ada di kalimat yang sama.

## Kenapa run ini pernah tidak bisa dijalankan sama sekali (B110)

`judge-check.js` dan berkas di balik perintah ini adalah satu-satunya harness yang tidak memuat
`app/.env`, jadi `npm run judge-variance` mati dengan "GROQ_API_KEY missing from the
environment" meski kuncinya ada di repo sendiri — dan pesan kesalahannya menyuruh memakai perkakas
di luar `app/`. Kelas yang sama dengan B43/B53/B56/B62: bukti yang cuma hidup di satu mesin.
Diperbaiki 30 Sep, ditandai marker `Lencana-B110 status=SELESAI` di kedua berkas (kala itu masih berbentuk kurung siku; dipindah oleh B112 opsi A). Lihat juga [[09-Testing/T11 - npm run judge]].
