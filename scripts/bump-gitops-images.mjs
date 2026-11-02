#!/usr/bin/env node
// Rewrites pinned autonoma image references in an infra-gitops component directory.
//
//   node scripts/bump-gitops-images.mjs <component-dir> <ref-file>...
//
// Each <ref-file> holds one reference of the form
//   ghcr.io/<owner>/autonoma-<name>:sha-<hex>@sha256:<64 hex>
// (what .github/workflows/images.yml records per pushed image). Every occurrence of a reference to
// the same owner and image name under <component-dir>, whatever tag and digest it carries, is
// replaced with the new one. Images without a ref file are left alone, so a partial set of refs is
// safe. Prints one line per changed file and a final `changed: <count>` line the workflow reads.
//
// Plain Node, no dependencies: the bump job runs this from a sparse checkout, before any install.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const IMAGE_REF_PATTERN = /ghcr\.io\/([A-Za-z0-9_.-]+)\/autonoma-([a-z][a-z0-9-]*):sha-[0-9a-f]+@sha256:[0-9a-f]{64}/g;
const REF_FILE_PATTERN =
    /^ghcr\.io\/([A-Za-z0-9_.-]+)\/autonoma-([a-z][a-z0-9-]*):sha-[0-9a-f]{12}@sha256:[0-9a-f]{64}$/;

function main(argv) {
    const [componentDir, ...refFiles] = argv;
    if (componentDir == null || refFiles.length === 0) {
        console.error("usage: bump-gitops-images.mjs <component-dir> <ref-file>...");
        return 2;
    }

    const refs = readRefs(refFiles);
    const changed = [];
    for (const file of listFiles(componentDir)) {
        const before = readFileSync(file, "utf8");
        const after = before.replace(IMAGE_REF_PATTERN, (match, owner, name) => refs.get(`${owner}/${name}`) ?? match);
        if (after === before) continue;
        writeFileSync(file, after);
        changed.push(file);
    }

    for (const file of changed) console.log(`rewrote: ${file}`);
    console.log(`changed: ${changed.length}`);
    return 0;
}

/** owner/name -> full reference, from one reference per file. */
function readRefs(files) {
    const refs = new Map();
    for (const file of files) {
        const ref = readFileSync(file, "utf8").trim();
        const match = REF_FILE_PATTERN.exec(ref);
        if (match == null) throw new Error(`${file}: not an image reference of the expected shape: ${ref}`);
        const [, owner, name] = match;
        refs.set(`${owner}/${name}`, ref);
    }
    return refs;
}

function listFiles(dir) {
    const files = [];
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            files.push(...listFiles(path));
        } else {
            files.push(path);
        }
    }
    return files;
}

process.exitCode = main(process.argv.slice(2));
