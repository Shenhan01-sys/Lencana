/**
 * Lightweight, zero-dependency markdown renderer for Lencana lessons.
 * Formats headings, code blocks with copy button, callout quotes, bold, lists, and inline code.
 */

export function renderMarkdown(md: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'lms-prose';

  const lines = md.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let inList = false;
  let listElement: HTMLUListElement | null = null;

  function flushList() {
    if (inList && listElement) {
      container.appendChild(listElement);
      inList = false;
      listElement = null;
    }
  }

  function formatInline(text: string): string {
    return text
      // inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block fence
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        const pre = document.createElement('div');
        pre.className = 'code-block-wrapper';
        
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
          <span class="code-lang">${codeLang || 'code'}</span>
          <button type="button" class="btn-copy-code" title="Salin kode">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Salin</span>
          </button>
        `;

        const codeText = codeBuffer.join('\n');
        const copyBtn = header.querySelector('.btn-copy-code') as HTMLButtonElement;
        copyBtn?.addEventListener('click', () => {
          navigator.clipboard.writeText(codeText).then(() => {
            const span = copyBtn.querySelector('span');
            if (span) span.textContent = 'Tersalin!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              if (span) span.textContent = 'Salin';
              copyBtn.classList.remove('copied');
            }, 2000);
          });
        });

        const preEl = document.createElement('pre');
        const codeEl = document.createElement('code');
        codeEl.className = codeLang ? `language-${codeLang}` : '';
        codeEl.textContent = codeText;
        preEl.appendChild(codeEl);

        pre.appendChild(header);
        pre.appendChild(preEl);
        container.appendChild(pre);

        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      const h3 = document.createElement('h3');
      h3.className = 'lms-heading-3';
      h3.innerHTML = formatInline(trimmed.slice(4));
      container.appendChild(h3);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      const h2 = document.createElement('h2');
      h2.className = 'lms-heading-2';
      h2.innerHTML = formatInline(trimmed.slice(3));
      container.appendChild(h2);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      const h1 = document.createElement('h1');
      h1.className = 'lms-heading-1';
      h1.innerHTML = formatInline(trimmed.slice(2));
      container.appendChild(h1);
      continue;
    }

    // Callout quote
    if (trimmed.startsWith('> ')) {
      flushList();
      const quoteText = trimmed.slice(2);
      const callout = document.createElement('div');
      
      if (quoteText.includes('**Note:**') || quoteText.includes('**Perhatian:**')) {
        callout.className = 'lms-callout callout-note';
      } else if (quoteText.includes('**Try it:**') || quoteText.includes('**Coba:**')) {
        callout.className = 'lms-callout callout-exercise';
      } else {
        callout.className = 'lms-callout callout-quote';
      }
      
      callout.innerHTML = formatInline(quoteText);
      container.appendChild(callout);
      continue;
    }

    // Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        inList = true;
        listElement = document.createElement('ul');
        listElement.className = 'lms-list';
      }
      const li = document.createElement('li');
      li.innerHTML = formatInline(trimmed.slice(2));
      listElement!.appendChild(li);
      continue;
    }

    // Regular paragraph
    flushList();
    const p = document.createElement('p');
    p.className = 'lms-paragraph';
    p.innerHTML = formatInline(trimmed);
    container.appendChild(p);
  }

  flushList();
  return container;
}
