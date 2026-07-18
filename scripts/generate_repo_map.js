const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const REPO_MAP_FILE = path.join(DOCS_DIR, 'REPOSITORY_MAP.md');

function getFiles(dir, prefix = '') {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, `${prefix}${file}/`));
    } else {
      results.push(`${prefix}${file}`);
    }
  });
  return results;
}

function getDirectories(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
}

function generateSection(title, files, basePath) {
  let section = `## ${title}\n\n`;
  if (files.length === 0) {
    section += `*No files found in ${basePath}*\n\n`;
    return section;
  }
  files.forEach(f => {
    section += `- \`${f}\`\n`;
  });
  section += `\n`;
  return section;
}

const map = {
  'Current Services': getFiles(path.join(ROOT_DIR, 'src', 'services')),
  'Current APIs': getFiles(path.join(ROOT_DIR, 'src', 'api-lib')).concat(getFiles(path.join(ROOT_DIR, 'api'))),
  'Current Hooks': getFiles(path.join(ROOT_DIR, 'src', 'hooks')).concat(getFiles(path.join(ROOT_DIR, 'src', 'components', 'hooks'))),
  'Current Components': getFiles(path.join(ROOT_DIR, 'src', 'components')),
  'Current Firestore Collections': ['candidates', 'requirements', 'submissions', 'vendors', 'clients', 'users', 'audit_logs', 'system_events'], // Hardcoded based on docs/FIRESTORE_SCHEMA_v1_RC1.md and general knowledge
  'Current Event Bus': getFiles(path.join(ROOT_DIR, 'src', 'events')),
  'Current AI Gateway': getFiles(path.join(ROOT_DIR, 'src', 'ai')),
  'Current Workers': getFiles(path.join(ROOT_DIR, 'src', 'workflows')).concat(getFiles(path.join(ROOT_DIR, 'src', 'temporal'))),
  'Current Infrastructure': getFiles(path.join(ROOT_DIR, 'src', 'infrastructure')).concat(['firebase-blueprint.json', 'firestore.rules', 'storage.rules']),
  'Current Repositories': getFiles(path.join(ROOT_DIR, 'src', 'lib', 'repositories')).concat(getFiles(path.join(ROOT_DIR, 'src', 'repositories'))),
  'Current Pages': getFiles(path.join(ROOT_DIR, 'src', 'views'))
};

let content = `# Repository Map\n\n*Generated on ${new Date().toISOString()}*\n\n`;

for (const [title, files] of Object.entries(map)) {
  content += `## ${title}\n\n`;
  if (files.length === 0) {
    content += `*(None found/mapped)*\n\n`;
  } else {
    files.forEach(f => {
      content += `- \`${f}\`\n`;
    });
    content += `\n`;
  }
}

fs.writeFileSync(REPO_MAP_FILE, content);
console.log(`Successfully generated ${REPO_MAP_FILE}`);
