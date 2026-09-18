import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function verifyProductionEsm() {
  console.log("\n========================================================");
  console.log("🚀 STARTING PRODUCTION-EQUIVALENT ESM VERIFICATION TEST");
  console.log("========================================================");

  const tempDir = path.resolve(process.cwd(), 'dist-test-esm');

  try {
    // 1. Clean previous runs
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 2. Generate a custom tsconfig to emit ESM with strict Node resolution rules
    const tsconfigPath = path.resolve(tempDir, 'tsconfig.esm-test.json');
    const tsconfigContent = {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "./out",
        rootDir: "..",
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        esModuleInterop: true,
        experimentalDecorators: true
      },
      include: [
        "../src/**/*.ts",
        "../api/**/*.ts"
      ],
      exclude: [
        "../node_modules",
        "../src/tests/api-smoke-test.ts",
        "../src/tests/production-esm-verify.ts"
      ]
    };
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2));

    // 3. Compile using the strict ESM tsconfig
    console.log("📦 Compiling server-side code under strict Node ESM resolution rules...");
    execSync(`npx tsc -p ${tsconfigPath}`, { stdio: 'inherit' });
    console.log("🟢 Compilation complete. Emitted JS generated inside dist-test-esm/out/");

    // 4. Force ES module runtime mode in the test directory
    fs.writeFileSync(path.resolve(tempDir, 'out/package.json'), JSON.stringify({ type: "module" }, null, 2));

    // Mock/Stub Firebase admin config so we don't crash on credentials when loading modules
    process.env.FIREBASE_PROJECT_ID = "hirenest-os";
    process.env.FIREBASE_STORAGE_BUCKET = "hirenest-os.firebasestorage.app";
    process.env.FIREBASE_CLIENT_EMAIL = "gopal@hirenestworkforce.com";
    process.env.FIREBASE_PRIVATE_KEY = "mock-key";

    // 5. Crawl and import all emitted .js files
    const outDir = path.resolve(tempDir, 'out');
    const jsFiles: string[] = [];

    const findJsFiles = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findJsFiles(fullPath);
        } else if (item.endsWith('.js')) {
          // Skip frontend components that use JSX or DOM-only objects
          const rel = path.relative(outDir, fullPath);
          if (rel.startsWith('src/views') || rel.startsWith('src/components')) {
            continue;
          }
          jsFiles.push(fullPath);
        }
      }
    };

    findJsFiles(outDir);
    console.log(`🔍 Found ${jsFiles.length} server-side JS modules to verify native loading...`);

    let passedCount = 0;
    let failedCount = 0;

    for (const jsFile of jsFiles) {
      const relPath = path.relative(outDir, jsFile);
      try {
        // Dynamic import triggers Node's native ESM resolution engine over all relative imports
        await import(`file://${jsFile}`);
        passedCount++;
      } catch (err: any) {
        console.error(`\n❌ [FAIL] Native Node loading failed for: ${relPath}`);
        console.error(`Reason/Stack: ${err.stack || err.message || err}`);
        failedCount++;
      }
    }

    console.log("\n========================================================");
    console.log(`📈 RESULTS:`);
    console.log(`   - Verified Server Modules: ${jsFiles.length}`);
    console.log(`   - 🟢 Loading Succeeded:   ${passedCount}`);
    console.log(`   - 🔴 Loading Failed:      ${failedCount}`);
    console.log("========================================================");

    if (failedCount > 0) {
      throw new Error(`ESM verification failed. ${failedCount} modules could not be imported cleanly.`);
    }

    console.log("🎉 SUCCESS! Every single server-side module resolved and loaded flawlessly under native Node ESM!");
    
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(0);
  } catch (err: any) {
    console.error("\n🔴 PRODUCTION ESM VERIFICATION CRITICAL FAILURE!");
    console.error(err.message || err);
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

verifyProductionEsm();
