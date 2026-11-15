// Runs the oracle inputs on go-in-types' reference interpreter (the tsgo IR,
// in-process, in worker threads) and compares with oracle/expected/.
//
//   node scripts/ref.ts [--lib mini|es5] [--only S]... [--jobs N] [--image]
//                       [--cap OPS] [--rebuild-ir] [--quiet]
//
//   --image       start every check from the boot image image/<lib>.json
//                 (scripts/boot.ts) instead of a fresh machine
//   --cap OPS     op limit per check (default 20e9)
//   --jobs N      worker threads (default 6)
//
// Engine: $GO_IN_TYPES or vendor/go-in-types (scripts/engine.ts).
// Writes .run/ref/<mode>/results.json (per check: status, class, exit, ops,
// ms) and, per failure, .run/ref/<mode>/fail/<lib>/<input>.{got,want}.
// Failure classes: output (stdout differs, exit right), exit (exit differs,
// stdout right), output+exit, trap (a trapped instruction or function),
// panic (an unrecovered Go panic or fatal error), crash (the interpreter
// threw), limit (op cap reached).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Worker } from "node:worker_threads";
import { engineDir, ensureProg } from "./engine.ts";
import { encodeOut, type Lib, listInputs, parseCommon, readExpected, root } from "./inputs.ts";
import type { Job, JobResult, WorkerConfig } from "./ref-worker.ts";

export type FailClass = "output" | "exit" | "output+exit" | "trap" | "panic" | "crash" | "limit";

export function classify(r: JobResult, want: string): FailClass | null {
  const got = encodeOut(r.stdout, r.exit);
  if (r.abort === "limit") return "limit";
  if (r.abort === "crash") return "crash";
  if (got === want && r.stderr === "") return null;
  if (/^trap: /m.test(r.stderr)) return "trap";
  if (/^(panic: |fatal error: )/m.test(r.stderr)) return "panic";
  const m = /\n\[exit (-?\d+)\]\n$/.exec(want)!;
  const wantOut = want.slice(0, m.index);
  const exitOk = Number(m[1]) === r.exit;
  const outOk = wantOut === r.stdout;
  return outOk ? (exitOk ? "output" : "exit") : exitOk ? "output" : "output+exit";
}

export interface RunOptions {
  libs: Lib[];
  only: string[];
  jobs: number;
  mode: WorkerConfig["mode"];
  cap: number;
  stats: boolean;
  onResult?: (job: Job, r: JobResult, done: number, total: number) => void;
}

/** Runs the jobs in a pool of workers; results in job order. */
export async function runChecks(o: RunOptions): Promise<{ jobs: Job[]; results: JobResult[] }> {
  const progPath = ensureProg();
  const jobs: Job[] = listInputs(o.only)
    .flatMap((input) => o.libs.map((lib) => ({ input, lib })))
    .map((j, id) => ({ ...j, id }));
  // Long checks first (es5, extreme/), so the tail stays short.
  const order = [...jobs].sort((a, b) => weight(b) - weight(a) || a.id - b.id);
  const results: JobResult[] = Array.from({ length: jobs.length });
  let next = 0;
  let done = 0;
  const cfg: WorkerConfig = { progPath, mode: o.mode, cap: o.cap, stats: o.stats };
  const url = new URL("./ref-worker.ts", import.meta.url);
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(o.jobs, jobs.length)) }, async () => {
      const w = new Worker(url, {
        workerData: cfg,
        resourceLimits: { maxOldGenerationSizeMb: 8192 },
      });
      await new Promise<void>((res, rej) => {
        w.once("message", () => res());
        w.once("error", rej);
      });
      try {
        while (next < order.length) {
          const job = order[next++]!;
          const r = await new Promise<JobResult>((res, rej) => {
            w.once("message", res);
            w.once("error", rej);
            w.postMessage(job);
          });
          w.removeAllListeners("error");
          results[job.id] = r;
          o.onResult?.(job, r, ++done, jobs.length);
        }
      } finally {
        await w.terminate();
      }
    }),
  );
  return { jobs, results };
}

const weight = (j: Job) => (j.lib === "es5" ? 2 : 0) + (j.input.startsWith("extreme/") ? 1 : 0);

async function main() {
  const { libs, only, jobs, rest } = parseCommon(process.argv.slice(2));
  const mode = rest.includes("--image") ? "image" : "fresh";
  const ci = rest.indexOf("--cap");
  const cap = ci >= 0 ? Number(rest[ci + 1]) : 20e9;
  const quiet = rest.includes("--quiet");
  if (rest.includes("--rebuild-ir")) ensureProg(true);
  const out = join(root, ".run/ref", mode);
  rmSync(join(out, "fail"), { recursive: true, force: true });
  const t0 = performance.now();
  console.log(`engine ${engineDir}, ${mode}`);
  const classes: Record<string, string[]> = {};
  const rows: any[] = [];
  const { jobs: js, results } = await runChecks({
    libs,
    only,
    jobs: jobs ?? 6,
    mode,
    cap,
    stats: false,
    onResult: (job, r, done, total) => {
      const want = readExpected(job.lib, job.input);
      const c = classify(r, want);
      const key = `${job.lib} ${job.input}`;
      if (c) {
        (classes[c] ??= []).push(key);
        const base = join(out, "fail", job.lib, job.input);
        mkdirSync(dirname(base), { recursive: true });
        writeFileSync(
          base + ".got",
          encodeOut(r.stdout, r.exit) + (r.stderr ? `[stderr]\n${r.stderr}` : "") + (r.error ?? ""),
          "latin1",
        );
        writeFileSync(base + ".want", want, "latin1");
      }
      if (!quiet || c)
        console.log(
          `${String(done).padStart(4)}/${total} ${c ? "FAIL " + c : "ok"} ${key} ` +
            `${(r.ops / 1e6).toFixed(2)}M ops ${(r.ms / 1000).toFixed(1)}s`,
        );
    },
  });
  js.forEach((j, i) => {
    const r = results[i]!;
    const c = classify(r, readExpected(j.lib, j.input));
    rows.push({
      lib: j.lib,
      input: j.input,
      ok: c === null,
      class: c,
      exit: r.exit,
      ops: r.ops,
      ms: Math.round(r.ms),
    });
  });
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "results.json"),
    JSON.stringify(rows, null, 0).replaceAll("},{", "},\n{") + "\n",
  );
  const pass = rows.filter((r) => r.ok).length;
  console.log("\nsummary (" + mode + "):");
  for (const lib of libs) {
    const rs = rows.filter((r) => r.lib === lib);
    console.log(`  ${lib}: ${rs.filter((r) => r.ok).length}/${rs.length}`);
  }
  for (const [c, ks] of Object.entries(classes).sort(([a], [b]) => a.localeCompare(b)))
    console.log(
      `  ${c}: ${ks.length}\n${ks
        .sort()
        .map((k) => "    " + k)
        .join("\n")}`,
    );
  console.log(`${pass}/${rows.length} exact in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  process.exitCode = pass === rows.length ? 0 : 1;
}

if (import.meta.main) await main();
