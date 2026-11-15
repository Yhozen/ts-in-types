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
import { argsFor, type Lib, libFile, libPath } from "./inputs.ts";

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

/** Checks started from a boot image (filled in with the boot entries). */
export class ImageRunner {
  static load(_E: Engine, _prog: Program, _lib: Lib): ImageRunner {
    throw new Error("boot images: not yet");
  }
  check(_main: string, _cap: number, _stats: boolean): CheckOut {
    throw new Error("boot images: not yet");
  }
}
