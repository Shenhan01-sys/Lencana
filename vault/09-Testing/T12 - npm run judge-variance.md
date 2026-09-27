---
tags: [testing, "T12"]
command: npm run judge-variance
measured: 2026-09-24
result: substantive 91-100, decision stable 5/5
---

# T12 - `npm run judge-variance` (berapa jauh angka model bergerak)

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
