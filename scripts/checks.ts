// One check on the reference interpreter, fresh (package init, then the
// harness's `check`) or from a boot image (image/<lib>.json, see boot.ts).
import { readFileSync } from "node:fs";
import {
  type Engine,
  goFiles,
  goStrings,
  harnessFunc,
  type Machine,
  type Program,
  runToEnd,
  type RunOut,
} from "./engine.ts";
import { join } from "node:path";
import { argsFor, type Lib, libFile, libPath, root } from "./inputs.ts";

export interface CheckOut extends RunOut {
  byFunc?: Record<string, number>;
  byKind?: Record<string, number>;
}

const libText = new Map<Lib, string>();
export function libSource(lib: Lib): string {
  let s = libText.get(lib);
  if (s === undefined) libText.set(lib, (s = readFileSync(libPath(lib), "latin1")));
  return s;
}

function withStats(m: Machine, r: RunOut, stats: boolean): CheckOut {
  if (!stats) return r;
  const s = m.opStats();
  return { ...r, byFunc: s.byFunc, byKind: s.byKind };
}

/** `check(files, args)` in a fresh machine: package init included. */
export function checkFresh(
  E: Engine,
  prog: Program,
  lib: Lib,
  main: string,
  cap: number,
  stats = false,
): CheckOut {
  const m = new E.interp.Machine(prog);
  const fid = harnessFunc(prog, "check");
  const files = goFiles(E, m, fid, { [libFile(lib)]: libSource(lib), "main.ts": main });
  m.bootEntry(fid, [files, goStrings(E, argsFor(lib))]);
  return withStats(m, runToEnd(m, cap), stats);
}

export const imagePath = (lib: Lib): string => join(root, "image", `${lib}.json`);
export const imageMetaPath = (lib: Lib): string => join(root, "image", `${lib}.meta.json`);
/** The boot image's warm-up check. */
export const WARMUP = "const x: number = 'hello';\n";

/**
 * Builds a boot image in memory: package init, then the harness's `boot`
 * (command line parsed, libs parsed and bound, the warm-up check), run to
 * the end. Returns the machine (empty stack) and the warm-up's result.
 */
export function bootMachine(
  E: Engine,
  prog: Program,
  lib: Lib,
  cap = 20e9,
): { m: Machine; warmup: RunOut } {
  const m = new E.interp.Machine(prog);
  const fid = harnessFunc(prog, "boot");
  const files = goFiles(E, m, fid, { [libFile(lib)]: libSource(lib), "main.ts": WARMUP });
  m.bootEntry(fid, [files, goStrings(E, argsFor(lib))]);
  const warmup = runToEnd(m, cap);
  return { m, warmup };
}

/** Checks started from a boot image: each restores the image afresh. */
export class ImageRunner {
  E: Engine;
  prog: Program;
  snap: any;
  fid: number;
  constructor(E: Engine, prog: Program, snap: any) {
    this.E = E;
    this.prog = prog;
    this.snap = snap;
    this.fid = harnessFunc(prog, "checkWarm");
  }
  static load(E: Engine, prog: Program, lib: Lib): ImageRunner {
    return new ImageRunner(E, prog, JSON.parse(readFileSync(imagePath(lib), "utf8")));
  }
  /** A machine at the image point (output empty, op counts zeroed). */
  machine(): Machine {
    const m = this.E.snap.restore(this.prog, this.snap);
    m.out = [];
    m.err = [];
    m.counts.fill(0);
    return m;
  }
  check(main: string, cap: number, stats = false): CheckOut {
    const m = this.machine();
    m.callEntry(this.fid, [main]);
    return withStats(m, runToEnd(m, cap), stats);
  }
}
