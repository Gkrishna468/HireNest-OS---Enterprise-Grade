import * as fs from 'fs';
fetch('https://www.praneethkalluri.com/vibe-coding-checklist')
  .then(r => r.text())
  .then(t => {
    fs.writeFileSync('checklist.html', t);
    console.log('Saved to checklist.html');
  }).catch(e => console.error(e));
