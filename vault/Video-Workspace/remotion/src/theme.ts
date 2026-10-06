// B173 — Lencana look for the pitch video: the same palette and typefaces as the app (web/src/style.css, always dark — B166).
import { loadFont as loadOutfit } from '@remotion/google-fonts/Outfit'
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono'

export const SANS = loadOutfit('normal', { weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'] }).fontFamily
export const MONO = loadMono('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] }).fontFamily

export const C = {
  bg: '#0b0e11',
  bg2: '#0f1216',
  card: '#181a20',
  card2: '#1e2329',
  line: '#2b313a',
  line2: '#3a414c',
  gold: '#f0b90b',
  goldSoft: '#f8d33a',
  goldDeep: '#b78900',
  green: '#0ecb81',
  amber: '#ff9f1a',
  red: '#f6465d',
  text: '#eaecef',
  sub: '#b7bdc6',
  mute: '#848e9c',
  steel: '#5d6672',
  paper: '#cfd4dc',
} as const

export const W = 1920
export const H = 1080
