// Boot images: one reference snapshot per lib mode, taken after package
// init and the harness's `boot` (overlay/tsgo/cmd/tsgo/main.go in
// go-in-types: command line parsed, libs parsed and bound, one warm-up
// check of the one-liner). Later checks restore it and call `checkWarm`
// with the new main.ts, reusing the parsed command line and lib files.
//
//   node scripts/boot.ts [--lib mini|es5]
//
// Writes image/<lib>.json (go-in-types/ref-snapshot@1, git-ignored) and
// image/<lib>.meta.json (IR digest, warm-up output and ops, image size),
// then checks the one-liner from the image against the oracle.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { bootMachine, imageMetaPath, imagePath, ImageRunner, WARMUP } from "./checks.ts";
import { ensureProg, loadEngine, loadProg } from "./engine.ts";
import { encodeOut, parseCommon, readExpected } from "./inputs.ts";

const { libs } = parseCommon(process.argv.slice(2));
const progPath = ensureProg();
const E = await loadEngine();
const prog = loadProg(progPath);
let bad = 0;
for (const lib of libs) {
  const t0 = performance.now();
  const { m, warmup } = bootMachine(E, prog, lib);
  const want = readExpected(lib, "assign-basic.ts");
  if (warmup.abort || warmup.stderr || encodeOut(warmup.stdout, warmup.exit) !== want)
    throw new Error(`${lib}: warm-up check failed: ${JSON.stringify(warmup).slice(0, 500)}`);
  const bootMs = performance.now() - t0;
  m.out = [];
  m.err = [];
  m.exitCode = null;
  const snap = E.snap.snapshot(m, progPath);
  const text = JSON.stringify(snap);
  mkdirSync(dirname(imagePath(lib)), { recursive: true });
  writeFileSync(imagePath(lib), text);
  const runner = new ImageRunner(E, prog, JSON.parse(text));
  const t1 = performance.now();
  const r = runner.check(WARMUP, 1e9);
  const ms = performance.now() - t1;
  const ok = !r.abort && r.stderr === "" && encodeOut(r.stdout, r.exit) === want;
  if (!ok) bad++;
  const meta = {
    generated: "by scripts/boot.ts; do not edit",
    lib,
    program: snap.program,
    warmup: { main: WARMUP, ops: warmup.ops, ms: Math.round(bootMs) },
    image: { bytes: text.length, objects: snap.objects.length },
    oneLiner: { ok, ops: r.ops, ms: Math.round(ms) },
  };
  writeFileSync(imageMetaPath(lib), JSON.stringify(meta, null, 1) + "\n");
  console.log(
    `${lib}: boot ${warmup.ops.toLocaleString()} ops, image ${(text.length / 1e6).toFixed(1)} MB ` +
      `(${snap.objects.length.toLocaleString()} objects); one-liner from the image ` +
      `${ok ? "ok" : "WRONG"}, ${r.ops.toLocaleString()} ops, ${ms.toFixed(0)} ms (restore included)`,
  );
}
process.exitCode = bad ? 1 : 0;
