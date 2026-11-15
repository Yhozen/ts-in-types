// The oracle: native tsc 7.0.2 (node_modules/.bin/tsc) on every input in
// oracle/inputs/ in both lib modes, run in a temp dir (inside the repo tsc
// would pick up tsconfig.json).
//
//   node scripts/oracle.ts             rebuild oracle/expected/ and oracle/manifest.json
//   node scripts/oracle.ts --verify    rerun and compare with the stored outputs (writes nothing)
//   node scripts/oracle.ts --only S    only inputs whose path contains S (no manifest)
//   node scripts/oracle.ts --lib mini  one lib mode (no manifest)
//   --jobs N                           parallel tsc processes (default 6)
//
// Each check: <tmp>/lib.<lib>.d.ts and <tmp>/main.ts, command line
// `--noLib --noEmit --skipLibCheck --singleThreaded lib.<lib>.d.ts main.ts`.
// Output format: scripts/inputs.ts.
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  argsFor,
  encodeOut,
  expectedPath,
  inputsDir,
  type Lib,
  libFile,
  libPath,
  listInputs,
  manifestPath,
  parseCommon,
  readExpected,
  root,
} from "./inputs.ts";
import { pool } from "./pool.ts";

const tsc = join(root, "node_modules/.bin/tsc");
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");

interface Out {
  stdout: string;
  stderr: string;
  exit: number;
}

function runTsc(dir: string, lib: Lib): Promise<Out> {
  return new Promise((res) => {
    execFile(
      tsc,
      argsFor(lib),
      { cwd: dir, encoding: "latin1", timeout: 300_000, maxBuffer: 64 << 20 },
      (err, stdout, stderr) => {
        const exit = err ? (typeof err.code === "number" ? err.code : -1) : 0;
        res({ stdout, stderr, exit });
      },
    );
  });
}

async function main() {
  const { libs, only, jobs, rest } = parseCommon(process.argv.slice(2));
  const verify = rest.includes("--verify");
  const full = only.length === 0 && libs.length === 2;
  const inputs = listInputs(only);
  const version = execFileSync(tsc, ["--version"], { encoding: "utf8" }).trim();
  if (version !== "Version 7.0.2") throw new Error(`expected tsc 7.0.2, got ${version}`);
  const tmp = mkdtempSync(join(tmpdir(), "ts-in-types-oracle-"));
  const work = inputs.flatMap((input) => libs.map((lib) => ({ input, lib })));
  const results = new Map<string, Out>();
  const bad: string[] = [];
  await pool(work, jobs ?? 6, async ({ input, lib }, i) => {
    const d = join(tmp, String(i));
    mkdirSync(d);
    copyFileSync(libPath(lib), join(d, libFile(lib)));
    copyFileSync(join(inputsDir, input), join(d, "main.ts"));
    const r = await runTsc(d, lib);
    rmSync(d, { recursive: true, force: true });
    results.set(`${lib}:${input}`, r);
    const key = `${lib} ${input}`;
    if (r.stderr !== "") bad.push(`${key}: stderr ${JSON.stringify(r.stderr.slice(0, 200))}`);
    if (r.exit < 0) bad.push(`${key}: no exit status (timeout or signal)`);
    const out = encodeOut(r.stdout, r.exit);
    if (verify) {
      let want: string | undefined;
      try {
        want = readExpected(lib, input);
      } catch {}
      if (want !== out) bad.push(`${key}: differs from ${expectedPath(lib, input)}`);
    } else {
      const p = expectedPath(lib, input);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, out, "latin1");
    }
  });
  rmSync(tmp, { recursive: true, force: true });

  const entries: Record<string, any> = {};
  const totals: Record<string, { exit0: number; exit1: number; other: number }> = {};
  for (const input of inputs) {
    const e: any = { sha256: sha(readFileSync(join(inputsDir, input))) };
    for (const lib of libs) {
      const r = results.get(`${lib}:${input}`)!;
      const out = encodeOut(r.stdout, r.exit);
      const t = (totals[lib] ??= { exit0: 0, exit1: 0, other: 0 });
      if (r.exit === 0) t.exit0++;
      else if (r.exit === 1 || r.exit === 2) t.exit1++;
      else t.other++;
      e[lib] = {
        exit: r.exit,
        lines: r.stdout === "" ? 0 : r.stdout.split("\n").length - 1,
        sha256: sha(Buffer.from(out, "latin1")),
      };
    }
    entries[input] = e;
  }
  const manifest = {
    generated: "by scripts/oracle.ts; do not edit",
    tsc: `${version} (node_modules/.bin/tsc, native)`,
    commandLine: "--noLib --noEmit --skipLibCheck --singleThreaded lib.<lib>.d.ts main.ts",
    format: "expected/<lib>/<input>.out = stdout bytes + '\\n[exit N]\\n'; stderr always empty",
    libs: Object.fromEntries(
      libs.map((l) => [l, { file: `oracle/${libFile(l)}`, sha256: sha(readFileSync(libPath(l))) }]),
    ),
    inputs: inputs.length,
    checks: work.length,
    totals,
    entries,
  };
  if (verify) {
    if (full) {
      const old = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (JSON.stringify(old) !== JSON.stringify(manifest)) bad.push("manifest.json differs");
    }
  } else if (full) writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  for (const b of bad.sort()) console.log("BAD", b);
  console.log(
    `${verify ? "verified" : "wrote"} ${work.length - bad.length}/${work.length} checks` +
      (full && !verify ? " and oracle/manifest.json" : "") +
      ` (${JSON.stringify(totals)})`,
  );
  process.exitCode = bad.length === 0 ? 0 : 1;
}

await main();
