import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const fontDir = join('node_modules', 'katex', 'dist', 'fonts');
const fontFiles = readdirSync(fontDir).filter(f => f.endsWith('.woff2'));

const fontData = {};
fontFiles.forEach(file => {
  const content = readFileSync(join(fontDir, file));
  fontData[file] = content.toString('base64');
});

const cssTemplate = readFileSync(join('node_modules', 'katex', 'dist', 'katex.min.css'), 'utf-8');

let cssWithBase64 = cssTemplate;
Object.entries(fontData).forEach(([file, base64]) => {
  cssWithBase64 = cssWithBase64.replace(
    new RegExp(`url\\(fonts/${file}\\)`, 'g'),
    `url(data:font/woff2;base64,${base64})`
  );
});

writeFileSync(join('src', 'core', 'katex-fonts.css'), cssWithBase64);
console.log('Generated katex-fonts.css with base64 fonts');
