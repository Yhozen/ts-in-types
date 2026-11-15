// Worker of scripts/ref.ts and scripts/profile.ts: loads the engine and the
// IR once, then runs checks on the reference interpreter. Messages: Job in,
// JobResult out.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { engineDir, loadEngine, loadProg, type RunOut } from "./engine.ts";
import { checkFresh, ImageRunner } from "./checks.ts";
import { inputsDir, type Lib } from "./inputs.ts";
import { instrumentIntrinsics, type Profile, profileCheck } from "./profile-stats.ts";

export interface Job {
  id: number;
  input: string;
  lib: Lib;
}
export interface JobResult extends RunOut {
  id: number;
  ms: number;
  profile?: Omit<Profile, "stdout" | "stderr" | "exit" | "ops">;
}
export interface WorkerConfig {
  progPath: string;
  /** "fresh", or "image": start every check from image/<lib>.json. */
  mode: "fresh" | "image";
  cap: number;
  /** Image mode only: profile each check (profile-stats.ts). */
  profile: boolean;
}

const cfg = workerData as WorkerConfig;
if (cfg.profile) await instrumentIntrinsics(engineDir);
const E = await loadEngine();
const prog = loadProg(cfg.progPath);
const images = new Map<Lib, ImageRunner>();

parentPort!.on("message", (job: Job) => {
  const t0 = performance.now();
  const main = readFileSync(join(inputsDir, job.input), "latin1");
  let r: JobResult;
  if (cfg.mode === "fresh") r = { ...checkFresh(E, prog, job.lib, main, cfg.cap), id: 0, ms: 0 };
  else {
    let img = images.get(job.lib);
    if (!img) images.set(job.lib, (img = ImageRunner.load(E, prog, job.lib)));
    if (cfg.profile) {
      const { ops, stdout, stderr, exit, ...profile } = profileCheck(img, main, cfg.cap);
      r = { ops, stdout, stderr, exit, profile, id: 0, ms: 0 };
    } else r = { ...img.check(main, cfg.cap), id: 0, ms: 0 };
  }
  parentPort!.postMessage({ ...r, id: job.id, ms: performance.now() - t0 } satisfies JobResult);
});
parentPort!.postMessage("ready");
