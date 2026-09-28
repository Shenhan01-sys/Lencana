---
tags: [hub, frontend, open-items]
status: active
updated: 2026-09-28
---

# 00 - Hub Open Items

The items live in one document so Dave can read them in a single pass:
**[[10-Contributors/Open-Items-for-Dave]]**. This hub is only the index.

| item | one line |
|---|---|
| OI-1 | the page builds a credential that was never signed, for courses we do not have |
| OI-2 | the payment console targets a route that does not exist; the real one is `POST /verify` |
| OI-3 | the bitstring visualizer shows a simulation and is labelled as our list |
| OI-4 | fake EVM revert strings typed by hand |
| OI-5 | invented metrics and an invented person |
| OI-6 | 20 URLs on `lencana.io`, a domain the project does not hold (`main.ts` 17, `render.ts` 1, `index.html` 2) |
| OI-7 | the money the product does not actually move (tBNB pricing) |
| OI-8 | hero claims that outrun the four scenes |
| OI-9 | `file:///C:/Project_Dave/…` links that resolve on exactly one machine |
| OI-10 | a preset labelled "BSC Testnet (97) — target submission" that carries addresses that are not ours |
| OI-11 | `main.ts` contains no `fetch(`: the paid panel is timers, while the same repo settles real payments |
| OI-12 | the shown document still uses the two-entry `credentialStatus` the OB 3.0 schema rejects |
| OI-13 | a button that prints "14/14 Tests Passed (12ms)" from a `setTimeout` — an invented pass result, not just an invented flow |
| OI-14 | `package.json` calls a tool that lives outside the repo, so `npm run probe:rpc` is dead in anyone else's clone (in-repo copy already added; one-line patch offered) |
| OI-15 | a banner a visitor can still open says "lapis on-chain kami belum disiarkan" with a stale test count — the same false sentence I just removed from `verify.ts` |

**Tiga dari daftar ini membuat yang lain terlihat lebih buruk, dan itu alasannya ditutup lebih dulu:**
OI-15 (halaman berkata produknya belum disiarkan), OI-13 (hasil uji yang direkayasa) dan OI-12
(dokumen yang ditolak validator). Ketiganya menyentuh kalimat penjualan kita sendiri — "klaim yang
tidak bisa diperiksa adalah kenapa platform lama gagal" — dan ketiganya ada di halaman yang akan
dibuka juri.

One item per file is deliberately **not** done: each item is a section with a patch, and splitting them
would leave seven files that a reader has to reassemble. If an item needs quoting in a pull request, the
section heading is the anchor.

**Related:** [[03-Frontend/FE6 - Quirks and open defects]] · [[10-Contributors/00 - Hub Contributors]]
