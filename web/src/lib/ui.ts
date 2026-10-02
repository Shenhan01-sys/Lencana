type Props = Record<string, any>;
type Child = HTMLElement | string | number | false | null | undefined | Child[];

export function h(tag: string | Function, props?: Props | null, ...children: Child[]): HTMLElement {
  if (typeof tag === 'function') {
    return tag({ ...props, children });
  }
  
  const el = document.createElement(tag);
  
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'className' || k === 'class') {
        el.className = v;
      } else if (k === 'style' && typeof v === 'object') {
        // Custom property (`--tc`, `--i`) tidak bisa diisi lewat Object.assign — harus setProperty (B127, 2 Okt).
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, String(sv));
          else (el.style as unknown as Record<string, unknown>)[sk] = sv;
        }
      } else if (k === 'dataset' && typeof v === 'object') {
        for (const [dk, dv] of Object.entries(v)) {
          el.dataset[dk] = String(dv);
        }
      } else if (k === 'dangerouslySetInnerHTML') {
        el.innerHTML = v.__html;
      } else if (k !== 'children') {
        if (typeof v === 'boolean') {
          if (v) el.setAttribute(k, '');
          else el.removeAttribute(k);
        } else {
          el.setAttribute(k, String(v));
        }
      }
    }
  }

  const append = (child: Child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(append);
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  };

  children.forEach(append);
  return el;
}

export function fragment(...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  const append = (child: Child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(append);
    } else if (child instanceof HTMLElement) {
      frag.appendChild(child);
    } else {
      frag.appendChild(document.createTextNode(String(child)));
    }
  };
  children.forEach(append);
  return frag;
}
