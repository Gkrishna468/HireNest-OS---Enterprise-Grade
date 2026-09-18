import fs from 'fs';
import path from 'path';

const TARGET_DIRS = ['src', 'api', 'lib', 'packages'];
const AUTO_FIX = true;

interface ImportIssue {
  file: string;
  line: number;
  rawImport: string;
  resolvedPath: string;
  type: 'extensionless' | 'case_mismatch' | 'missing_file';
}

function scanAndAudit() {
  console.log("==========================================");
  console.log("   HIRENEST OS GLOBAL ESM IMPORT AUDIT    ");
  console.log("==========================================");

  let scannedCount = 0;
  const issues: ImportIssue[] = [];

  const walk = (dir: string, targetIssues: ImportIssue[]) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, targetIssues);
      } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !fullPath.endsWith('esm-import-auditor.ts')) {
        scannedCount++;
        auditFile(fullPath, targetIssues);
      }
    }
  };

  for (const dir of TARGET_DIRS) {
    if (fs.existsSync(dir)) {
      walk(dir, issues);
    }
  }

  console.log(`Scanned ${scannedCount} files.`);
  console.log(`Found ${issues.length} ESM resolution issues.`);

  if (AUTO_FIX && issues.length > 0) {
    console.log("\nAuto-fixing extensionless and casing issues...");
    fixIssues(issues);
    console.log("Re-scanning after fixes to confirm absolute resolution...");
  }

  if (issues.length === 0) {
    console.log("🟢 ZERO ESM RESOLUTION ISSUES FOUND!");
    process.exit(0);
  } else {
    // Re-verify after fix
    const verifyIssues: ImportIssue[] = [];
    scannedCount = 0; // reset counter
    for (const dir of TARGET_DIRS) {
      if (fs.existsSync(dir)) {
        walk(dir, verifyIssues);
      }
    }
    const unresolved = verifyIssues.filter(i => i.type === 'missing_file');
    if (unresolved.length > 0) {
      console.error("🔴 UNRESOLVED ISSUES REMAINING (MISSING FILES):", unresolved);
      process.exit(1);
    } else if (verifyIssues.length > 0) {
      console.error("🔴 SOME ISSUES UNRESOLVED:", verifyIssues);
      process.exit(1);
    } else {
      console.log("🟢 ALL ESM ISSUES AUTOMATICALLY FIXED AND VERIFIED!");
      process.exit(0);
    }
  }
}

function auditFile(filePath: string, issues: ImportIssue[]) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Match static: import ... from "relative-path" or export ... from "relative-path"
  const importRegex = /(?:import|export)\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)['"]|(?:import)\s+['"](\.\.?\/[^'"]+)['"]/gs;
  // Match dynamic: import("relative-path") or import('relative-path')
  const dynamicImportRegex = /import\(['"](\.\.?\/[^'"]+)['"]\)/g;

  const processMatch = (importPath: string, matchIndex: number) => {
    if (!importPath.startsWith('.')) return;

    const linesBefore = content.substring(0, matchIndex).split('\n');
    const lineNumber = linesBefore.length;

    const ext = path.extname(importPath);
    const isExtensionless = ext === '';
    const isTsFile = ext === '.ts';

    const fileDir = path.dirname(filePath);
    
    // Check if the path actually points to a directory on disk
    const resolvedPathOnDisk = path.resolve(fileDir, importPath);
    let isDirectory = false;
    try {
      const stats = fs.statSync(resolvedPathOnDisk);
      isDirectory = stats.isDirectory();
    } catch (e) {}

    if (isDirectory) {
      // It is a directory, so Node ESM requires pointing to index.js
      issues.push({
        file: filePath,
        line: lineNumber,
        rawImport: importPath,
        resolvedPath: (importPath.endsWith('/') ? importPath : importPath + '/') + 'index.js',
        type: 'extensionless'
      });
      return;
    }

    // Determine what the target file path should be on disk
    let cleanImportPath = importPath;
    if (isExtensionless) {
      cleanImportPath = importPath + '.ts';
    } else if (importPath.endsWith('.js')) {
      cleanImportPath = importPath.slice(0, -3) + '.ts';
    }

    const targetTsPath = path.resolve(fileDir, cleanImportPath);
    const targetTsDir = path.dirname(targetTsPath);
    const targetTsBase = path.basename(targetTsPath);

    // Verify filesystem presence and correct casing
    if (!fs.existsSync(targetTsPath)) {
      // Try exact JS if TS doesn't exist
      const targetJsPath = targetTsPath.slice(0, -3) + '.js';
      if (fs.existsSync(targetJsPath)) {
        // JS file exists, no TS file
        return;
      }

      // Try case insensitivity search
      if (fs.existsSync(targetTsDir)) {
        const filesInDir = fs.readdirSync(targetTsDir);
        const matchedFile = filesInDir.find(f => f.toLowerCase() === targetTsBase.toLowerCase());
        if (matchedFile) {
          issues.push({
            file: filePath,
            line: lineNumber,
            rawImport: importPath,
            resolvedPath: path.join(path.dirname(importPath), matchedFile).replace(/\\/g, '/'),
            type: 'case_mismatch'
          });
        } else {
          issues.push({
            file: filePath,
            line: lineNumber,
            rawImport: importPath,
            resolvedPath: importPath,
            type: 'missing_file'
          });
        }
      } else {
        issues.push({
          file: filePath,
          line: lineNumber,
          rawImport: importPath,
          resolvedPath: importPath,
          type: 'missing_file'
        });
      }
    } else {
      // File exists on disk. If it's extensionless or ends in .ts (which is invalid in native ESM loading), we flag it.
      if (isExtensionless) {
        issues.push({
          file: filePath,
          line: lineNumber,
          rawImport: importPath,
          resolvedPath: importPath + '.js',
          type: 'extensionless'
        });
      } else if (isTsFile) {
        issues.push({
          file: filePath,
          line: lineNumber,
          rawImport: importPath,
          resolvedPath: importPath.slice(0, -3) + '.js',
          type: 'extensionless'
        });
      }
    }
  };

  let match;
  importRegex.lastIndex = 0;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (importPath) {
      processMatch(importPath, match.index);
    }
  }

  let dynMatch;
  dynamicImportRegex.lastIndex = 0;
  while ((dynMatch = dynamicImportRegex.exec(content)) !== null) {
    const importPath = dynMatch[1];
    if (importPath) {
      processMatch(importPath, dynMatch.index);
    }
  }
}

function fixIssues(issues: ImportIssue[]) {
  // Group issues by file so we can read/write once per file
  const fileGroups: Record<string, ImportIssue[]> = {};
  for (const issue of issues) {
    if (!fileGroups[issue.file]) {
      fileGroups[issue.file] = [];
    }
    fileGroups[issue.file].push(issue);
  }

  for (const [file, fileIssues] of Object.entries(fileGroups)) {
    let content = fs.readFileSync(file, 'utf-8');

    for (const issue of fileIssues) {
      const escapedRaw = issue.rawImport.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Match exact quoted import path globally in the file content
      const regex = new RegExp(`(['"])${escapedRaw}(['"])`, 'g');
      const updatedContent = content.replace(regex, `$1${issue.resolvedPath}$2`);
      
      if (content !== updatedContent) {
        content = updatedContent;
        console.log(`[FIX] In ${path.relative(process.cwd(), file)}: replaced "${issue.rawImport}" ➔ "${issue.resolvedPath}"`);
      }
    }

    fs.writeFileSync(file, content, 'utf-8');
  }
}

scanAndAudit();
