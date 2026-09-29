import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dasar = JSON.parse(fs.readFileSync(path.join(__dirname, 'web3-dasar-new.json'), 'utf8'));
const lanjut = JSON.parse(fs.readFileSync(path.join(__dirname, 'web3-lanjut-new.json'), 'utf8'));

function writeCourse(filePath, courseData, exportName) {
  let content = `import type { ClassData } from '../content'\n\n`;
  if (exportName === 'web3Dasar') {
    content += `export const WEB3_DASAR_ID = '${courseData.id}'\n\n`;
  }
  content += `export const ${exportName}: ClassData = ` + JSON.stringify(courseData, null, 2) + `\n`;
  fs.writeFileSync(filePath, content);
}

writeCourse(path.join(__dirname, '../web/src/courses/web3-dasar.ts'), dasar, 'web3Dasar');
writeCourse(path.join(__dirname, '../web/src/courses/web3-lanjut.ts'), lanjut, 'web3Lanjut');

console.log('TS files rewritten!');
