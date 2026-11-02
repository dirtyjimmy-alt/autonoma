// Behavioural tests for bump-gitops-images.mjs: the script is run as the workflow runs it, as a child
// process over a temporary component directory. Plain node:test, so `node --test scripts/*.test.mjs`
// needs no install, like the script itself.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./bump-gitops-images.mjs", import.meta.url));
const OWNER = "dirtyjimmy-alt";
const OLD_TAG = "0123456789ab";
const NEW_TAG = "fedcba987654";

const OLD_API = imageRef(OWNER, "api", OLD_TAG, "1");
const NEW_API = imageRef(OWNER, "api", NEW_TAG, "2");
const OLD_UI = imageRef(OWNER, "ui", OLD_TAG, "3");
const NEW_UI = imageRef(OWNER, "ui", NEW_TAG, "4");
const OTHER_OWNER_API = imageRef("someone-else", "api", OLD_TAG, "5");
const UNLISTED_WORKER = imageRef(OWNER, "worker-web", OLD_TAG, "6");
const README = "# autonoma\n\nImages are pinned as tag@digest by the autonoma images workflow.\n";

test("rewrites every reference to a listed image, whatever tag and digest it carried", () => {
    const { componentDir, refFiles } = fixture();

    const result = run(componentDir, ...refFiles);

    assert.equal(result.status, 0, result.stderr);
    const lines = result.stdout.trim().split("\n");
    assert.equal(lines.at(-1), "changed: 2");
    assert.deepEqual(
        lines.slice(0, -1).sort(),
        [`rewrote: ${join(componentDir, "api", "deployment.yaml")}`, `rewrote: ${join(componentDir, "ui.yaml")}`],
    );

    const deployment = readFileSync(join(componentDir, "api", "deployment.yaml"), "utf8");
    assert.equal(occurrences(deployment, NEW_API), 2);
    assert.equal(occurrences(deployment, OLD_API), 0);
    assert.equal(occurrences(deployment, OTHER_OWNER_API), 1, "another owner's image is not ours to bump");
    assert.equal(occurrences(deployment, UNLISTED_WORKER), 1, "an image without a ref file is left alone");
    assert.equal(readFileSync(join(componentDir, "ui.yaml"), "utf8"), `image: ${NEW_UI}\n`);
    assert.equal(readFileSync(join(componentDir, "README.md"), "utf8"), README);
});

test("changes nothing on a second run with the same references", () => {
    const { componentDir, refFiles } = fixture();
    assert.equal(run(componentDir, ...refFiles).status, 0);
    const before = snapshot(componentDir);

    const result = run(componentDir, ...refFiles);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "changed: 0\n");
    assert.deepEqual(snapshot(componentDir), before);
});

test("rejects a ref file that does not hold a pinned image reference and touches nothing", () => {
    const { componentDir, refFiles } = fixture();
    const before = snapshot(componentDir);
    const badRef = join(componentDir, "..", "bad-ref");
    writeFileSync(badRef, `ghcr.io/${OWNER}/autonoma-api:sha-${NEW_TAG}\n`);

    const result = run(componentDir, badRef, ...refFiles);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bad-ref: not an image reference of the expected shape/);
    assert.deepEqual(snapshot(componentDir), before);
});

test("exits with the usage message when the arguments are missing", () => {
    const { componentDir } = fixture();

    const result = run(componentDir);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage: bump-gitops-images\.mjs/);
});

function imageRef(owner, name, tag, digestDigit) {
    return `ghcr.io/${owner}/autonoma-${name}:sha-${tag}@sha256:${digestDigit.repeat(64)}`;
}

/** A component directory with nested files and one ref file per image to bump. */
function fixture() {
    const root = mkdtempSync(join(tmpdir(), "bump-gitops-images-"));
    const componentDir = join(root, "components", "autonoma");
    mkdirSync(join(componentDir, "api"), { recursive: true });
    writeFileSync(
        join(componentDir, "api", "deployment.yaml"),
        [
            "containers:",
            `  - image: ${OLD_API}`,
            `  - image: ${OTHER_OWNER_API}`,
            `  - image: ${UNLISTED_WORKER}`,
            "initContainers:",
            `  - image: ${OLD_API}`,
            "",
        ].join("\n"),
    );
    writeFileSync(join(componentDir, "ui.yaml"), `image: ${OLD_UI}\n`);
    writeFileSync(join(componentDir, "README.md"), README);

    const refsDir = join(root, "refs");
    mkdirSync(refsDir);
    writeFileSync(join(refsDir, "api"), `${NEW_API}\n`);
    writeFileSync(join(refsDir, "ui"), `${NEW_UI}\n`);
    return { componentDir, refFiles: [join(refsDir, "api"), join(refsDir, "ui")] };
}

function run(...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

function snapshot(componentDir) {
    return {
        deployment: readFileSync(join(componentDir, "api", "deployment.yaml"), "utf8"),
        ui: readFileSync(join(componentDir, "ui.yaml"), "utf8"),
        readme: readFileSync(join(componentDir, "README.md"), "utf8"),
    };
}

function occurrences(text, needle) {
    return text.split(needle).length - 1;
}
