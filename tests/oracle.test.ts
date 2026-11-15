// The oracle on disk is consistent: every input has an expected output per
// lib mode, the manifest's hashes match, and the format parses.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import {
  expectedPath,
  inputsDir,
  LIBS,
  libPath,
  listInputs,
  manifestPath,
} from "../scripts/inputs.ts";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

test("328 inputs, 656 checks, hashes match the manifest", () => {
  const inputs = listInputs();
  expect(inputs.length).toBe(328);
  expect(manifest.checks).toBe(656);
  expect(Object.keys(manifest.entries).sort()).toEqual(inputs);
  for (const lib of LIBS) expect(sha(readFileSync(libPath(lib)))).toBe(manifest.libs[lib].sha256);
  for (const input of inputs) {
    const e = manifest.entries[input];
    expect(sha(readFileSync(join(inputsDir, input)))).toBe(e.sha256);
    for (const lib of LIBS) {
      const out = readFileSync(expectedPath(lib, input));
      expect(sha(out)).toBe(e[lib].sha256);
      const m = /\n\[exit (\d+)\]\n$/.exec(out.toString("latin1"));
      expect(Number(m?.[1])).toBe(e[lib].exit);
    }
  }
});

test("the one-liner's expected output", () => {
  for (const lib of LIBS)
    expect(readFileSync(expectedPath(lib, "assign-basic.ts"), "latin1")).toBe(
      "main.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\n\n[exit 1]\n",
    );
});
