import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf-8');
const dom = new JSDOM(html);
const doc = dom.window.document;

function extract(id, file) {
  const el = doc.getElementById(id);
  if (el) {
    fs.writeFileSync(file, el.outerHTML);
    console.log(`Extracted ${id}`);
  }
}

extract('page-verify', '../scratch/page-verify.html');
extract('page-submit', '../scratch/page-submit.html');
extract('page-portfolio', '../scratch/page-portfolio.html');
extract('page-agent-hub', '../scratch/page-agent-hub.html');
extract('wallet-modal-backdrop', '../scratch/modal-wallet-backdrop.html');
// actually the wallet modal is structured:
// <div class="wallet-modal-backdrop">...</div>
// <div class="wallet-modal-dialog">...</div>
// We can just extract them manually if needed.
