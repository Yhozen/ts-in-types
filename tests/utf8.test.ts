// The UTF-8 encoder and decoder of src/utf8.d.ts against Node's, in tsrs
// (needs image/utf8.gen.d.ts from `vp run build`; skipped without it), and
// the fuel-pool hash's start nodes.
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { encNat, POOL } from "../scripts/gen-hover.ts";
import { lit, utf8Path } from "../scripts/gen-utf8.ts";
import { root } from "../scripts/inputs.ts";
import { diagnostics, parsePrinted, runTsrs, writeProject } from "../scripts/types-gate.ts";

const samples = [
  "",
  "const x: number = 'hello';\n",
  "abc",
  "abé",
  "é",
  "日本語 = 1;",
  "const emoji = \u{1f600};",
  "\u{1f600}\u{1f680}x",
  "mixed αβγ and ком",
  "a\u{2070e}b", // plane 2: not in the tables, becomes U+FFFD
  "x".repeat(5000) + "é" + "y".repeat(3), // longer than one inner loop
];
const bytes = (s: string) =>
  Buffer.from(s.replace(/[\u{20000}-\u{10ffff}]/gu, "�"), "utf8").toString("latin1");

test("pool keys use the engine's int encoding", () => {
  expect([0, 7, 8, 15, 16, 255, 256, 4096].map(encNat)).toEqual([
    "0",
    "7",
    "80",
    "f0",
    "01",
    "ff0",
    "001",
    "0001",
  ]);
  expect(POOL).toBe(20000);
});

test.skipIf(!existsSync(utf8Path))(
  "Utf8 and FromUtf8 in tsrs",
  async () => {
    const dir = join(root, ".run/tests/utf8");
    mkdirSync(dir, { recursive: true });
    const lines = [`import type { FromUtf8, Utf8 } from "../../../src/utf8.d.ts";`];
    samples.forEach((s, i) => {
      lines.push(`export const e${i}: "probe" = null! as [Utf8<${lit(s)}>];`);
      lines.push(`export const d${i}: "probe" = null! as [FromUtf8<${lit(bytes(s))}>];`);
    });
    writeProject(dir, lines.join("\n") + "\n");
    const t = await runTsrs(dir, 300);
    const got = diagnostics(t.out).map((d) => {
      const m = /^Type '([\s\S]*)' is not assignable to type '"probe"'\.$/.exec(d.message);
      // the CLI prints UTF-8: back to the printed text's characters
      return m ? parsePrinted(Buffer.from(m[1]!, "latin1").toString("utf8"))[0] : d.message;
    });
    const want = samples.flatMap((s) => [bytes(s), s.replace(/[\u{20000}-\u{10ffff}]/gu, "�")]);
    expect(got).toEqual(want);
  },
  600_000,
);
