// The emitter's keep list: every function the reference executes over all
// 656 checks started from the boot images (scripts/boot.ts). The emitted
// program gives bodies only to these; any other function becomes a trap
// ("... not kept"), which a check reaching it reports as such.
//
//   node scripts/keep.ts [--jobs N]
//
// Writes image/keep.txt (one IR function name per line, sorted) and
// image/keep.meta.json (the IR digest, per-lib counts). scripts/build.ts
// calls keepList(), which reuses the file while the IR digest matches.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { imagePath } from "./checks.ts";
import { progPath } from "./engine.ts";
import { encodeOut, LIBS, parseCommon, readExpected, root } from "./inputs.ts";
import { runChecks } from "./ref.ts";

export const keepPath = join(root, "image/keep.txt");
const metaPath = join(root, "image/keep.meta.json");

/** The IR's identity: the boot images record it (snapshot `program`). */
export function irDigest(): string {
  const meta = JSON.parse(readFileSync(join(root, "image/es5.meta.json"), "utf8"));
  return `${meta.program.digest}/${meta.program.funcs}`;
}

export async function keepList(jobs = 6, force = false): Promise<string[]> {
  const digest = irDigest();
  if (!force && existsSync(keepPath) && existsSync(metaPath)) {
    const m = JSON.parse(readFileSync(metaPath, "utf8"));
    if (m.digest === digest) return readFileSync(keepPath, "utf8").split("\n").filter(Boolean);
  }
  for (const lib of LIBS)
    if (!existsSync(imagePath(lib))) throw new Error(`no ${imagePath(lib)}: run scripts/boot.ts`);
  const all = new Set<string>();
  const perLib: Record<string, Set<string>> = {};
  let wrong = 0;
  const t0 = performance.now();
  await runChecks({
    libs: [...LIBS],
    only: [],
    jobs,
    mode: "image",
    cap: 20e9,
    profile: false,
    funcs: true,
    onResult: (job, r) => {
      if (encodeOut(r.stdout, r.exit) !== readExpected(job.lib, job.input) || r.stderr) wrong++;
      const s = (perLib[job.lib] ??= new Set());
      for (const f of r.funcs ?? []) {
        all.add(f);
        s.add(f);
      }
    },
  });
  if (wrong) throw new Error(`keep: ${wrong} checks differ from the oracle on the reference`);
  const names = [...all].sort();
  writeFileSync(keepPath, names.join("\n") + "\n");
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        generated: "by scripts/keep.ts; do not edit",
        digest,
        prog: progPath,
        funcs: names.length,
        perLib: Object.fromEntries(Object.entries(perLib).map(([k, v]) => [k, v.size])),
        seconds: Math.round((performance.now() - t0) / 100) / 10,
      },
      null,
      1,
    ) + "\n",
  );
  return names;
}

if (import.meta.main) {
  const { jobs } = parseCommon(process.argv.slice(2));
  const names = await keepList(jobs ?? 6, true);
  console.log(`keep: ${names.length} functions -> ${keepPath}`);
}
