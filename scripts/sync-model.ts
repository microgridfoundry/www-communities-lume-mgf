import { copy, ensureDir, exists } from "jsr:@std/fs";
import { join } from "jsr:@std/path";

const COMMUNITIES = ["waterlilies", "hazelmead"];
const MODEL_FILES = [
  "404.vto",
  "support.vto",
  "support/faq.vto",
  "support/energyadvice.vto",
  "assets/css/style.scss",
];

console.log("🔄 Syncing _model/ files to communities...\n");

// Check .gitignore contains all synced files
console.log("📋 Checking .gitignore...");
const gitignoreContent = await Deno.readTextFile(".gitignore");
let missingFromGitignore = false;

for (const community of COMMUNITIES) {
  for (const file of MODEL_FILES) {
    const syncedPath = `sites/${community}/${file}`;
    if (!gitignoreContent.includes(syncedPath)) {
      console.error(`   ⚠️  Missing from .gitignore: ${syncedPath}`);
      missingFromGitignore = true;
    }
  }
}

if (missingFromGitignore) {
  console.error("\n❌ Error: Some synced files are not in .gitignore");
  console.error("   Add them to .gitignore to avoid committing generated files.\n");
  Deno.exit(1);
}
console.log("   ✓ All synced files are in .gitignore\n");

let successCount = 0;
let errorCount = 0;

for (const community of COMMUNITIES) {
  console.log(`📁 ${community}:`);

  for (const file of MODEL_FILES) {
    try {
      const src = join("_model", file);
      const dest = join("sites", community, file);

      // Check if source file exists
      if (!await exists(src)) {
        throw new Error(`Source file not found: ${src}`);
      }

      // Ensure destination directory exists
      const destDir = join("sites", community, ...file.split("/").slice(0, -1));
      await ensureDir(destDir);

      // Copy file
      await copy(src, dest, { overwrite: true });
      console.log(`   ✓ ${file}`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ ${file}: ${error.message}`);
      errorCount++;
    }
  }
  console.log();
}

const totalFiles = COMMUNITIES.length * MODEL_FILES.length;
console.log(`✅ Sync complete: ${successCount}/${totalFiles} files synced successfully`);

if (errorCount > 0) {
  console.error(`❌ ${errorCount} errors occurred during sync`);
  Deno.exit(1);
}
