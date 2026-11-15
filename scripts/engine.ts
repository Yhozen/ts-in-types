// The go-in-types engine, loaded in-process: its reference interpreter
// (src/ref) and the tsgo IR (`.run/tsgo/prog.json` inside the engine).
//
// Where the engine is: $GO_IN_TYPES, else the submodule vendor/go-in-types.
// From a clean clone:
//   git -c protocol.file.allow=always submodule update --init --recursive
//   (vendor/go-in-types and its vendor/typescript; see AGENTS.md)
// The engine has no node_modules of its own: its src/ref imports only node
// builtins. The IR is built on first use (needs Go) with the engine's
// overlay/gen.ts + scripts/tsgo-ir.ts, or rebuilt with `--rebuild-ir`.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./inputs.ts";
import type * as Interp from "../vendor/go-in-types/src/ref/interp.ts";
import type * as Snap from "../vendor/go-in-types/src/ref/snapshot.ts";
import type * as Gomap from "../vendor/go-in-types/src/ref/gomap.ts";
import type * as Values from "../vendor/go-in-types/src/ref/values.ts";
import type { Program } from "../vendor/go-in-types/src/ir/types.ts";

export type { Program };
export type Machine = Interp.Machine;

export const engineDir = resolve(process.env.GO_IN_TYPES ?? join(root, "vendor/go-in-types"));
export const progPath = join(engineDir, ".run/tsgo/prog.json");

/** Builds the tsgo IR if it is missing (or always, with `rebuild`). */
export function ensureProg(rebuild = false): string {
  if (rebuild || !existsSync(progPath)) {
    if (!existsSync(join(engineDir, "src/ref/interp.ts")))
      throw new Error(
        `no go-in-types engine at ${engineDir} (init the submodule or set GO_IN_TYPES)`,
      );
    const tsc = join(engineDir, "vendor/typescript/tsc");
    execFileSync("node", [join(engineDir, "overlay/gen.ts")], { stdio: "inherit" });
    execFileSync("node", [join(engineDir, "scripts/tsgo-ir.ts"), "--tsgo-dir", tsc], {
      stdio: ["ignore", "inherit", "inherit"],
    });
  }
  return progPath;
}

export interface Engine {
  interp: typeof Interp;
  snap: typeof Snap;
  gomap: typeof Gomap;
  values: typeof Values;
}

const mod = (p: string) => import(pathToFileURL(join(engineDir, p)).href);

export async function loadEngine(): Promise<Engine> {
  const [interp, snap, gomap, values] = await Promise.all([
    mod("src/ref/interp.ts"),
    mod("src/ref/snapshot.ts"),
    mod("src/ref/gomap.ts"),
    mod("src/ref/values.ts"),
  ]);
  return { interp, snap, gomap, values };
}

export function loadProg(path = progPath): Program {
  return JSON.parse(readFileSync(path, "utf8")) as Program;
}

/** The harness function `name` of overlay/tsgo/cmd/tsgo (e.g. "check"). */
export function harnessFunc(prog: Program, name: string): number {
  const fid = prog.funcs.findIndex((f) => f.name.endsWith(`/cmd/tsgo.${name}`));
  if (fid < 0) throw new Error(`no cmd/tsgo.${name} in the program (stale IR?)`);
  return fid;
}

/** A Go `map[string]string` of the files, keyed /p/<basename>; byte strings. */
export function goFiles(E: Engine, m: Machine, fid: number, files: Record<string, string>): any {
  const sig = m.prog.types[m.prog.funcs[fid]!.sig] as any;
  const mapT = sig.params[0] as number;
  const fm = new E.gomap.GoMap(mapT, m.types.key((m.types.info[mapT]!.u as any).key));
  for (const [name, text] of Object.entries(files))
    fm.set(E.values.utf8Bytes("/p/" + basename(name)), text);
  return fm;
}

export function goStrings(E: Engine, ss: string[]): any {
  const as = ss.map(E.values.utf8Bytes);
  return new E.values.Slice(as, 0, as.length, as.length);
}

export interface RunOut {
  stdout: string;
  stderr: string;
  exit: number;
  ops: number;
  /** "limit": the op cap was reached; "crash": the interpreter threw. */
  abort?: "limit" | "crash";
  error?: string;
}

/** Runs `m` to completion or until `cap` ops (counted from its current total). */
export function runToEnd(m: Machine, cap: number): RunOut {
  const start = m.ops;
  try {
    const st = m.run(start + cap);
    const r = m.result();
    if (st === "paused") return { ...r, ops: r.ops - start, abort: "limit" };
    return { ...r, ops: r.ops - start };
  } catch (e) {
    const r = m.result();
    return { ...r, ops: m.ops - start, abort: "crash", error: String((e as Error)?.stack ?? e) };
  }
}
