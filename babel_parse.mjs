import parser from '@babel/parser';
import fs from 'fs';

const code = fs.readFileSync('src/views/AutonomousOperationsTab.tsx', 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  console.log('Parse successful');
} catch (e) {
  console.log('Parse error:', e.message);
  if (e.loc) {
    console.log('At line:', e.loc.line, 'col:', e.loc.column);
  }
}
