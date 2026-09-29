import { JSDOM } from 'jsdom';
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.DocumentFragment = dom.window.DocumentFragment;

import { renderLanding } from '../web/src/pages/landing.ts';
console.log(renderLanding().outerHTML);
