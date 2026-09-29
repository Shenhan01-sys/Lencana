import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { web3Dasar } from '../web/src/courses/web3-dasar.ts';
import { web3Lanjut } from '../web/src/courses/web3-lanjut.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mapKind(kind) {
  const map = {
    'bacaan': 'reading',
    'kuis': 'quiz',
    'esai': 'essay',
    'praktik': 'lab',
    'kasus': 'lab',
    'referensi': 'reading'
  };
  return map[kind] || 'reading';
}

function mapBlocksToBody(blocks) {
  if (!blocks || blocks.length === 0) return 'TODO: Missing content';
  return blocks.map(b => {
    if (b.t === 'p') return b.text;
    if (b.t === 'h') return '### ' + b.text;
    if (b.t === 'ul') return b.items.map(i => '- ' + i).join('\n');
    if (b.t === 'ol') return b.items.map((i, idx) => (idx+1) + '. ' + i).join('\n');
    if (b.t === 'code') return '\n```' + b.lang + '\n' + b.code + '\n```\n';
    if (b.t === 'note') return '> **Note:** ' + b.text;
    if (b.t === 'quote') return '> ' + b.text + '\n> — ' + b.source;
    if (b.t === 'terms') return b.items.map(t => '**' + t.term + '**: ' + t.def).join('\n');
    if (b.t === 'links') return b.items.map(l => '- [' + l.label + '](' + l.url + ')').join('\n');
    if (b.t === 'try') return '> **Try it:** ' + b.prompt + (b.hint ? ' (' + b.hint + ')' : '');
    return JSON.stringify(b);
  }).join('\n\n');
}

function transformCourse(c) {
  const duration = c.modules.reduce((acc, m) => acc + m.lessons.reduce((acc2, l) => acc2 + l.minutes, 0), 0);
  
  const classData = {
    id: c.id,
    slug: c.id, // For course, id is the slug
    title: c.title,
    subtitle: c.blurb,
    level: c.level,
    duration: duration,
    outcomes: c.outcome,
    prerequisites: c.prereqCourseId ? [c.prereqCourseId] : [],
    tags: [c.level],
    institution: c.institution,
    criteria: c.criteria,
    weights: c.weights,
    passMark: c.passMark,
    validDays: c.validDays,
    modules: c.modules.map(m => ({
      id: m.id,
      slug: m.id,
      title: m.title,
      summary: m.blurb,
      lessons: m.lessons.map(l => {
        const out = {
          id: l.slug,
          slug: l.slug,
          title: l.title,
          type: mapKind(l.kind),
          duration: l.minutes,
          body: mapBlocksToBody(l.blocks),
          sourceLinks: []
        };
        if (l.quiz) out.quiz = l.quiz;
        if (l.essay) out.essay = l.essay;
        return out;
      })
    }))
  };

  return classData;
}

fs.writeFileSync(path.join(__dirname, 'web3-dasar-new.json'), JSON.stringify(transformCourse(web3Dasar), null, 2));
fs.writeFileSync(path.join(__dirname, 'web3-lanjut-new.json'), JSON.stringify(transformCourse(web3Lanjut), null, 2));
console.log('Done extracting JSON!');
