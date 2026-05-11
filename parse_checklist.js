import * as fs from 'fs';
const html = fs.readFileSync('checklist.html', 'utf-8');
const text = html.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n');
fs.writeFileSync('checklist.txt', text);
console.log('Saved to checklist.txt');
