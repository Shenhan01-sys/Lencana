// B173 — QR code of the live app for the end card (vector, so it stays sharp). Writes src/data/qr.json.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const url = 'https://lencana-psi.vercel.app/'
const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0b0e11', light: '#f7f5ef' } })
fs.writeFileSync(path.join(ROOT, 'src/data/qr.json'), JSON.stringify({ url, svg }) + '\n')
console.log('qr ok', url, svg.length)
