import { copy, ensureDir, exists } from "jsr:@std/fs";
import { join, dirname } from "jsr:@std/path";
import { parse as parseYaml, stringify as stringifyYaml } from "jsr:@std/yaml";

const COMMUNITIES = ["waterlilies", "hazelmead"];
const MODEL_FILES = [
  "404.vto",
  "support.vto",
  "support/faq.vto",
  "support/energyadvice.vto",
  "assets/css/style.scss",
];

console.log("🔄 Syncing _model/ and _overrides/ to sites/...\n");

let successCount = 0;
let errorCount = 0;

// STEP 1: Copy model files to sites/
console.log("📋 Step 1: Copying model files...");
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
      const destDir = dirname(dest);
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
}

// STEP 2: Copy model assets to sites/
console.log("\n📋 Step 2: Copying model assets...");
for (const community of COMMUNITIES) {
  try {
    const src = "_model/assets/images";
    const dest = `sites/${community}/assets/images`;

    if (await exists(src)) {
      await ensureDir(dest);
      await copy(src, dest, { overwrite: true });
      console.log(`   ✓ ${community}/assets/images/`);
      successCount++;
    } else {
      console.log(`   ⚠️  ${src} does not exist, skipping`);
    }
  } catch (error) {
    console.error(`   ✗ ${community}/assets/images/: ${error.message}`);
    errorCount++;
  }
}

// STEP 3: Merge _data.yaml files
console.log("\n📋 Step 3: Merging _data.yaml files...");
for (const community of COMMUNITIES) {
  try {
    const modelDataPath = "_model/_data.yaml";
    const overrideDataPath = `_overrides/${community}/_data.yaml`;
    const destDataPath = `sites/${community}/_data.yaml`;

    // Read model data (shared values)
    const modelData = await exists(modelDataPath)
      ? parseYaml(await Deno.readTextFile(modelDataPath)) as Record<string, unknown>
      : {};

    // Read override data (community-specific values)
    const overrideData = await exists(overrideDataPath)
      ? parseYaml(await Deno.readTextFile(overrideDataPath)) as Record<string, unknown>
      : {};

    // Merge with override precedence
    const merged = { ...modelData, ...overrideData };

    // Write merged data
    await ensureDir(dirname(destDataPath));
    await Deno.writeTextFile(destDataPath, stringifyYaml(merged));
    console.log(`   ✓ ${community}/_data.yaml (merged)`);
    successCount++;
  } catch (error) {
    console.error(`   ✗ ${community}/_data.yaml: ${error.message}`);
    errorCount++;
  }
}

// STEP 4: Copy override files (overlay on model)
console.log("\n📋 Step 4: Copying override files...");
for (const community of COMMUNITIES) {
  console.log(`📁 ${community}:`);

  const overridePath = `_overrides/${community}`;

  try {
    // Copy index.vto if exists (homepage override)
    const indexSrc = `${overridePath}/index.vto`;
    if (await exists(indexSrc)) {
      const indexDest = `sites/${community}/index.vto`;
      await copy(indexSrc, indexDest, { overwrite: true });
      console.log(`   ✓ index.vto`);
      successCount++;
    }

    // Copy favicon.ico if exists (root-level override)
    const faviconSrc = `${overridePath}/favicon.ico`;
    if (await exists(faviconSrc)) {
      const faviconDest = `sites/${community}/favicon.ico`;
      await copy(faviconSrc, faviconDest, { overwrite: true });
      console.log(`   ✓ favicon.ico`);
      successCount++;
    }

    // Copy assets (images, pdf) - overlay on model assets
    const assetsSrc = `${overridePath}/assets`;
    if (await exists(assetsSrc)) {
      const assetsDest = `sites/${community}/assets`;
      await ensureDir(assetsDest);

      // Copy all subdirectories (images, pdf, etc.)
      for await (const entry of Deno.readDir(assetsSrc)) {
        const src = join(assetsSrc, entry.name);
        const dest = join(assetsDest, entry.name);
        await copy(src, dest, { overwrite: true });
        console.log(`   ✓ assets/${entry.name}/`);
        successCount++;
      }
    }
  } catch (error) {
    console.error(`   ✗ ${community} overrides: ${error.message}`);
    errorCount++;
  }
}

const totalOperations = (COMMUNITIES.length * MODEL_FILES.length) +
                        (COMMUNITIES.length * 4); // assets, data, index, assets overlay

console.log(`\n✅ Sync complete: ${successCount} operations successful`);

if (errorCount > 0) {
  console.error(`❌ ${errorCount} errors occurred during sync`);
  Deno.exit(1);
}
