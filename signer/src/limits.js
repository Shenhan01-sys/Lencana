// Lencana-B155 status=TERBUKA 2026-10-05 — pemberian dari dompet deployer di server publik dibatasi per IP (24 jam bergulir) dan kuota global harian per jalur (faucet koin uji, gas pemilik agen); IP klien dari X-Forwarded-For hanya di belakang proxy tepercaya. Buktikan ulang: npm run verify:limits. JANGAN dibalik/diulang tanpa membuka kembali baris B155 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `limits.js` — batas pemberian dari dompet deployer (B155).
 *
 * Kenapa ada: di server publik `POST /faucet` hanya dibatasi sekali per ALAMAT per jendela, dan `POST /owner/gas` terbuka
 * untuk akun yang memilih peran Agent Owner — alamat baru gratis dibuat, jadi tanpa batas lain siapa pun bisa menghabiskan
 * saldo testnet deployer, dan saldo itu yang membayar bayar-kelas, anchor, dan penerbitan.
 *
 * Yang dihitung adalah pemberian yang BERHASIL (koin tercetak / gas terkirim); percobaan yang gagal tidak memakan kuota.
 * Disimpan di memori proses: signer berjalan satu instance, dan restart hanya terjadi saat deploy — pengunjung tidak bisa
 * memicunya. Tidak ada IP yang keluar dari modul ini (`snapshot` hanya angka).
 */

export const DAY_MS = 24 * 3_600_000

/**
 * @param {{ perIp: number, perDay: number, windowMs?: number, now?: () => number }} cfg
 */
export function createLimiter ({ perIp, perDay, windowMs = DAY_MS, now = Date.now }) {
  const byIp = new Map()
  let all = []
  const fresh = (list, t) => list.filter((x) => t - x < windowMs)
  const sweep = (t) => {
    // Jaga memori: IP yang jendelanya sudah habis dibuang, bukan dibiarkan menumpuk.
    if (byIp.size < 5000) return
    for (const [ip, list] of byIp) { const keep = fresh(list, t); if (keep.length) byIp.set(ip, keep); else byIp.delete(ip) }
  }
  return {
    perIp, perDay,
    /** Boleh memberi lagi ke IP ini? Tidak mengubah apa pun. */
    check (ip) {
      const t = now()
      all = fresh(all, t)
      const mine = fresh(byIp.get(ip) ?? [], t)
      if (mine.length) byIp.set(ip, mine); else byIp.delete(ip)
      if (all.length >= perDay) return { ok: false, reason: 'daily quota reached', retryAt: new Date((all[0] ?? t) + windowMs).toISOString() }
      if (mine.length >= perIp) return { ok: false, reason: 'per-IP limit reached', retryAt: new Date((mine[0] ?? t) + windowMs).toISOString() }
      return { ok: true }
    },
    /** Catat satu pemberian yang berhasil (`t` = stempel waktu, bawaan sekarang). */
    record (ip, t = now()) {
      sweep(t)
      all.push(t)
      byIp.set(ip, [...(byIp.get(ip) ?? []), t])
    },
    /**
     * Pesan satu slot sekarang (cek + catat sekaligus), supaya dua permintaan serentak dari IP yang sama tidak sama-sama
     * lolos sebelum salah satunya tercatat. `release()` mengembalikan slot bila pemberiannya gagal (tanda tangan ditolak,
     * mint/kiriman gagal) — yang dihitung tetap hanya pemberian yang berhasil.
     */
    take (ip) {
      const c = this.check(ip)
      if (!c.ok) return c
      const t = now()
      this.record(ip, t)
      const drop = (list) => { const i = list.indexOf(t); if (i >= 0) list.splice(i, 1) }
      return {
        ok: true,
        release () {
          drop(all)
          const mine = byIp.get(ip)
          if (mine) { drop(mine); if (!mine.length) byIp.delete(ip) }
        },
      }
    },
    /** Angka saja, untuk /healthz: berapa yang sudah diberikan dalam jendela berjalan. */
    snapshot () {
      const t = now()
      all = fresh(all, t)
      return { perIp, perDay, givenInWindow: all.length, windowHours: windowMs / 3_600_000 }
    },
  }
}

const intEnv = (name, fallback) => {
  const v = Number(process.env[name])
  return Number.isInteger(v) && v >= 0 ? v : fallback
}

/** Batas bawaan (bisa diubah lewat lingkungan): faucet 3/IP + 200/hari, gas 2/IP + 30/hari (`GAS_DRIP` 0,001 tBNB → ≤ 0,03/hari). */
export function limitsFromEnv () {
  return {
    faucet: createLimiter({ perIp: intEnv('FAUCET_PER_IP_DAY', 3), perDay: intEnv('FAUCET_GLOBAL_DAY', 200) }),
    gas: createLimiter({ perIp: intEnv('GAS_PER_IP_DAY', 2), perDay: intEnv('GAS_GLOBAL_DAY', 30) }),
  }
}

/**
 * IP klien. Di Railway tepinya mengisi `X-Forwarded-For` sendiri (nilai dari klien dibuang) dan entri pertamanya adalah
 * alamat penghubung, jadi header itu dipercaya bila proses berjalan di Railway (`RAILWAY_ENVIRONMENT`) atau
 * `TRUST_FORWARDED=1`. Di tempat lain header itu bisa dikarang klien — alamat soket yang dipakai.
 */
export function clientIp (req, env = process.env) {
  const trust = env.TRUST_FORWARDED === '1' || Boolean(env.RAILWAY_ENVIRONMENT)
  const first = trust ? String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim() : ''
  return first || req.socket?.remoteAddress || 'unknown'
}
