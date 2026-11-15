// The compiler in types (`vp run build` -> image/, git-ignored):
//
//   1. the tsgo IR (scripts/engine.ts ensureProg) and the boot images
//      image/<lib>.json (scripts/boot.ts), rebuilt when stale;
//   2. the keep list image/keep.txt: the functions the reference executes
//      over all 656 checks from the images (scripts/keep.ts);
//   3. the emitted program image/tsgo.d.ts (go-in-types scripts/emit.ts with
//      --keep; every other function is a trap) and its runtime image/rt/;
//   4. per lib, the start state image/start.<lib>.d.ts: the image's heap and
//      a call of the harness's `checkWarm(main)` whose main.ts text is the
//      type parameter (go-in-types codec-state `callState`):
//      `export type Start<Src extends string> = St<"c", ...>`;
//   5. the UTF-8 tables image/utf8.gen.d.ts (scripts/gen-utf8.ts).
//
//   node scripts/build.ts [--force] [--jobs N]
//
// Writes image/build.json (sizes and times). Every output is a `.d.ts`, so
// under skipLibCheck the checker loads it lazily.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { imageMetaPath, imagePath } from "./checks.ts";
import { engineDir, ensureProg, harnessFunc, loadProg } from "./engine.ts";
import { LIBS, parseCommon, root } from "./inputs.ts";
import { keepList, keepPath } from "./keep.ts";
import { utf8Path, utf8Tables } from "./gen-utf8.ts";

export const imageDir = join(root, "image");
export const programPath = join(imageDir, "tsgo.d.ts");
export const startPath = (lib: string): string => join(imageDir, `start.${lib}.d.ts`);
export const buildInfoPath = join(imageDir, "build.json");

const mtime = (p: string) => (existsSync(p) ? statSync(p).mtimeMs : 0);
const secs = (t0: number) => Math.round((performance.now() - t0) / 100) / 10;

async function main() {
  const { jobs, rest } = parseCommon(process.argv.slice(2));
  const force = rest.includes("--force");
  const times: Record<string, number> = {};
  let t = performance.now();
  const progPath = ensureProg();
  times.ir = secs(t);

  // boot images: rebuilt when missing or older than the IR
  t = performance.now();
  if (force || LIBS.some((l) => mtime(imagePath(l)) < mtime(progPath)))
    execFileSync("node", [join(root, "scripts/boot.ts")], { stdio: "inherit" });
  times.boot = secs(t);

  t = performance.now();
  const keep = await keepList(jobs ?? 6, force);
  times.keep = secs(t);

  // the program
  t = performance.now();
  if (force || mtime(programPath) < Math.max(mtime(keepPath), mtime(progPath), emitterTime())) {
    execFileSync(
      "node",
      [
        "--max-old-space-size=16000",
        join(engineDir, "scripts/emit.ts"),
        progPath,
        "-o",
        programPath,
        "--keep",
        keepPath,
        "--runtime",
        join(imageDir, "rt"),
      ],
      { stdio: "inherit" },
    );
  }
  times.emit = secs(t);

  // start states
  t = performance.now();
  const prog = loadProg(progPath);
  const fid = harnessFunc(prog, "checkWarm");
  const { callState } = await import(
    pathToFileURL(join(engineDir, "src/types/codec-state.ts")).href
  );
  const starts: Record<string, number> = {};
  const deadSlots: Record<string, string[]> = {};
  for (const lib of LIBS) {
    const snap = JSON.parse(readFileSync(imagePath(lib), "utf8"));
    const { module: text, dead } = callState(prog, snap, {
      rt: "./rt",
      fid,
      args: ["Src"],
      params: "Src extends string",
    }) as { module: string; dead: string[] };
    mkdirSync(imageDir, { recursive: true });
    writeFileSync(startPath(lib), text);
    starts[lib] = text.length;
    deadSlots[lib] = dead;
    if (dead.length) console.log(`start.${lib}: ${dead.length} dead slots (${dead.join("; ")})`);
  }
  times.starts = secs(t);

  // the UTF-8 tables of src/utf8.ts
  if (force || !existsSync(utf8Path)) writeFileSync(utf8Path, utf8Tables());

  const images = Object.fromEntries(
    LIBS.map((l) => [l, JSON.parse(readFileSync(imageMetaPath(l), "utf8"))]),
  );
  const info = {
    generated: "by scripts/build.ts; do not edit",
    engine: engineDir,
    ir: images.es5.program,
    keep: keep.length,
    bytes: {
      program: statSync(programPath).size,
      entries: mtime(programPath.replace(/\.d\.ts$/, ".entries.json"))
        ? statSync(programPath.replace(/\.d\.ts$/, ".entries.json")).size
        : 0,
      runtime: dirBytes(join(imageDir, "rt")),
      utf8: statSync(utf8Path).size,
      start: starts,
      snapshot: Object.fromEntries(LIBS.map((l) => [l, images[l].image.bytes])),
    },
    objects: Object.fromEntries(LIBS.map((l) => [l, images[l].image.objects])),
    deadSlots,
    seconds: times,
  };
  writeFileSync(buildInfoPath, JSON.stringify(info, null, 1) + "\n");
  const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
  console.log(
    `build: program ${mb(info.bytes.program)} (${keep.length} functions kept), ` +
      LIBS.map((l) => `start.${l} ${mb(starts[l]!)}`).join(", ") +
      `; ${JSON.stringify(times)} s`,
  );
}

/** The newest file of the emitter and the type-level runtime. */
function emitterTime(): number {
  let t = 0;
  for (const d of ["src/emit", "src/types", "scripts/emit.ts"]) {
    const p = join(engineDir, d);
    t = Math.max(t, newest(p));
  }
  return t;
}
function newest(p: string): number {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  let t = st.mtimeMs;
  for (const e of readdirSync(p)) t = Math.max(t, newest(join(p, e)));
  return t;
}
function dirBytes(p: string): number {
  let n = 0;
  for (const e of readdirSync(p)) n += statSync(join(p, e)).size;
  return n;
}

if (import.meta.main) await main();
