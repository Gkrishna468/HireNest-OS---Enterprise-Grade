import https from 'https';
import fs from 'fs';

function fetch(url, dest) {
  https.get(url, res => {
    let acc = '';
    res.on('data', d => acc+=d);
    res.on('end', () => fs.writeFileSync(dest, acc));
  });
}

fetch('https://raw.githubusercontent.com/LucioLiu/relic/main/README.md', 'relic.md');
fetch('https://raw.githubusercontent.com/Tencent/TencentDB-Agent-Memory/main/README.md', 'tencent.md');
