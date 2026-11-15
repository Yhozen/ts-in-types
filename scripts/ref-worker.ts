// Worker of scripts/ref.ts: loads the engine and the IR once, then runs
// checks on the reference interpreter. Messages: Job in, JobResult out.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { loadEngine, loadProg, type RunOut } from "./engine.ts";
import { checkFresh, ImageRunner } from "./checks.ts";
import { inputsDir, type Lib } from "./inputs.ts";

export interface Job {
  id: number;
  input: string;
  lib: Lib;
}
export interface JobResult extends RunOut {
  id: number;
  ms: number;
  byFunc?: Record<string, number>;
  byKind?: Record<string, number>;
}
export interface WorkerConfig {
  progPath: string;
  /** "fresh", or "image": start every check from image/<lib>.json. */
  mode: "fresh" | "image";
  cap: number;
  /** Return op counts by function and kind (the check's own). */
  stats: boolean;
}

const cfg = workerData as WorkerConfig;
const E = await loadEngine();
const prog = loadProg(cfg.progPath);
const images = new Map<Lib, ImageRunner>();

parentPort!.on("message", (job: Job) => {
  const t0 = performance.now();
  const main = readFileSync(join(inputsDir, job.input), "latin1");
  let r: RunOut & { byFunc?: Record<string, number>; byKind?: Record<string, number> };
  if (cfg.mode === "fresh") r = checkFresh(E, prog, job.lib, main, cfg.cap, cfg.stats);
  else {
    let img = images.get(job.lib);
    if (!img) images.set(job.lib, (img = ImageRunner.load(E, prog, job.lib)));
    r = img.check(main, cfg.cap, cfg.stats);
  }
  parentPort!.postMessage({ ...r, id: job.id, ms: performance.now() - t0 } satisfies JobResult);
});
parentPort!.postMessage("ready");
