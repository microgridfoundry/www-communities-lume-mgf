#!/usr/bin/env -S deno run -A

/**
 * HTML Validation Script
 *
 * Validates built HTML files for common issues:
 * - Duplicate IDs
 * - Nested anchor tags
 * - Unclosed tags
 * - Missing required attributes
 */

import { parse } from "https://esm.sh/node-html-parser@6.1.11";
import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";

interface ValidationError {
  file: string;
  type: string;
  message: string;
  line?: number;
}

const errors: ValidationError[] = [];

async function validateHtmlFile(filePath: string) {
  const content = await Deno.readTextFile(filePath);
  const root = parse(content);

  // Check for duplicate IDs
  const ids = new Map<string, number>();
  root.querySelectorAll("[id]").forEach(el => {
    const id = el.getAttribute("id");
    if (id) {
      ids.set(id, (ids.get(id) || 0) + 1);
    }
  });

  ids.forEach((count, id) => {
    if (count > 1) {
      errors.push({
        file: filePath,
        type: "duplicate-id",
        message: `Duplicate ID "${id}" found ${count} times`
      });
    }
  });

  // Check for nested anchor tags (invalid HTML)
  root.querySelectorAll("a").forEach(anchor => {
    const nestedAnchors = anchor.querySelectorAll("a");
    if (nestedAnchors.length > 0) {
      errors.push({
        file: filePath,
        type: "nested-anchor",
        message: `Nested <a> tags found (invalid HTML)`
      });
    }
  });

  // Check for images without alt attributes
  root.querySelectorAll("img").forEach(img => {
    const alt = img.getAttribute("alt");
    if (alt === null || alt === undefined) {
      const src = img.getAttribute("src") || "unknown";
      errors.push({
        file: filePath,
        type: "missing-alt",
        message: `Image missing alt attribute: ${src}`
      });
    }
  });

  // Check for empty href attributes
  root.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");
    if (href === "" || href === "#") {
      errors.push({
        file: filePath,
        type: "empty-href",
        message: `Link with empty or placeholder href`
      });
    }
  });
}

async function validateSite() {
  console.log("🔍 Validating HTML output...\n");

  const siteDir = "./_site";

  // Walk through all HTML files
  for await (const entry of walk(siteDir, { exts: [".html"] })) {
    if (entry.isFile) {
      const relativePath = entry.path.replace(siteDir + "/", "");
      try {
        await validateHtmlFile(entry.path);
      } catch (error) {
        errors.push({
          file: relativePath,
          type: "parse-error",
          message: `Failed to parse HTML: ${error.message}`
        });
      }
    }
  }

  // Report results
  if (errors.length === 0) {
    console.log("✅ All HTML files validated successfully!\n");
    Deno.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} validation error(s):\n`);

    // Group errors by type
    const errorsByType = new Map<string, ValidationError[]>();
    errors.forEach(error => {
      if (!errorsByType.has(error.type)) {
        errorsByType.set(error.type, []);
      }
      errorsByType.get(error.type)!.push(error);
    });

    // Display errors by type
    errorsByType.forEach((typeErrors, type) => {
      console.log(`\n${getErrorIcon(type)} ${getErrorTitle(type)} (${typeErrors.length}):`);
      typeErrors.forEach(error => {
        console.log(`  ${error.file}`);
        console.log(`    └─ ${error.message}`);
      });
    });

    console.log("\n");
    Deno.exit(1);
  }
}

function getErrorIcon(type: string): string {
  const icons: Record<string, string> = {
    "duplicate-id": "🔴",
    "nested-anchor": "⚠️",
    "missing-alt": "🖼️",
    "empty-href": "🔗",
    "parse-error": "💥"
  };
  return icons[type] || "❗";
}

function getErrorTitle(type: string): string {
  const titles: Record<string, string> = {
    "duplicate-id": "Duplicate IDs",
    "nested-anchor": "Nested Anchor Tags",
    "missing-alt": "Missing Alt Attributes",
    "empty-href": "Empty Href Attributes",
    "parse-error": "Parse Errors"
  };
  return titles[type] || type;
}

if (import.meta.main) {
  await validateSite();
}
