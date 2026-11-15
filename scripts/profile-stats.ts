// Profiling a check from the boot image (scripts/profile.ts): exact op
// counts by function and by event kind, intrinsic calls with the bytes
// they touch (1 op each on the reference, a loop at the type level), and
// phases sampled from the call stack.
import type { Machine, Program } from "./engine.ts";
import type { ImageRunner } from "./checks.ts";

/** Ops are attributed to a phase by sampling the stack every SAMPLE ops. */
export const SAMPLE = 128;

export interface Profile {
  ops: number;
  stdout: string;
  exit: number;
  stderr: string;
  byFunc: Record<string, number>;
  byEvent: Record<string, number>;
  intrinsics: Record<string, { calls: number; bytes: number }>;
  phases: Record<string, number>;
}

// ------------------------------------------------------------ events

let eventCache: { prog: Program; names: string[]; cat: Uint16Array } | null = null;

function underKind(prog: Program, t: number): string {
  let ty: any = prog.types[t];
  while (ty && ty.k === "named") ty = prog.types[ty.underlying];
  return ty?.k ?? "?";
}

/** A static event name for every IR instruction, in Machine.counts order. */
function events(prog: Program): { names: string[]; cat: Uint16Array } {
  if (eventCache?.prog === prog) return eventCache;
  const names: string[] = [];
  const ids = new Map<string, number>();
  const id = (s: string) => {
    let i = ids.get(s);
    if (i === undefined) ids.set(s, (i = names.push(s) - 1));
    return i;
  };
  let n = 0;
  for (const f of prog.funcs) for (const b of f.blocks) n += b.instrs.length;
  const cat = new Uint16Array(n);
  let k = 0;
  for (const f of prog.funcs) {
    const opT = (o: any): number =>
      "r" in o ? f.regTypes[o.r]! : "t" in o ? o.t : "zero" in o ? o.zero : -1;
    for (const b of f.blocks)
      for (const ins of b.instrs as any[]) {
        let e: string;
        switch (ins.op) {
          case "call":
          case "defer": {
            const c = ins.callee;
            const pre = ins.op === "defer" ? "defer" : "call";
            if ("static" in c) {
              const body = prog.funcs[c.static]!.body;
              e = `${pre} static${body === "intrinsic" ? " (intrinsic)" : body === "trap" ? " (trap)" : ""}`;
            } else if ("invoke" in c) e = `${pre} interface method`;
            else if ("value" in c) e = `${pre} func value`;
            else e = `${pre} builtin ${c.builtin}`;
            break;
          }
          case "alloc":
            e = ins.heap ? "alloc heap" : "alloc local";
            break;
          case "lookup":
            e = underKind(prog, opT(ins.x)) === "map" ? "map lookup" : "string index";
            break;
          case "mapUpdate":
            e = "map update";
            break;
          case "range":
            e = underKind(prog, opT(ins.x)) === "string" ? "string range" : "map range";
            break;
          case "next":
            e = ins.isString ? "string range next" : "map range next";
            break;
          case "binop":
          case "unop":
            e = `${ins.op} ${ins.kind}`;
            break;
          default:
            e = ins.op;
        }
        cat[k++] = id(e);
      }
  }
  eventCache = { prog, names, cat };
  return eventCache;
}

function byEvent(m: Machine): Record<string, number> {
  const { names, cat } = events(m.prog);
  const sums = new Float64Array(names.length);
  const c = m.counts;
  for (let i = 0; i < c.length; i++) if (c[i] !== 0) sums[cat[i]!]! += c[i]!;
  const out: Record<string, number> = {};
  names.forEach((nm, i) => {
    if (sums[i]) out[nm] = sums[i]!;
  });
  return out;
}

// ------------------------------------------------------------ intrinsics

const tally: Record<string, { calls: number; bytes: number }> = {};

const len = (v: any): number =>
  typeof v === "string" ? v.length : v && typeof v === "object" && "len" in v ? Number(v.len) : 0;

/** Wraps every intrinsic once per process (before any machine decodes). */
export async function instrumentIntrinsics(engineDir: string): Promise<void> {
  const { pathToFileURL } = await import("node:url");
  const { join } = await import("node:path");
  const mod = await import(pathToFileURL(join(engineDir, "src/ref/intrinsics.ts")).href);
  const table = mod.intrinsics as Record<string, (m: any, a: any[], d: any) => any>;
  for (const [name, fn] of Object.entries(table)) {
    if ((fn as any).__wrapped) continue;
    const w = (m: any, a: any[], d: any) => {
      const t = (tally[name] ??= { calls: 0, bytes: 0 });
      t.calls++;
      for (const x of a) t.bytes += len(x);
      return fn(m, a, d);
    };
    (w as any).__wrapped = true;
    table[name] = w;
  }
}

// ------------------------------------------------------------ phases

/** Phase of the innermost recognised frame, by function name. */
const PHASES: [RegExp, string][] = [
  [/^gointypes\.init$/, "package init"],
  [/tsoptions\.ParseCommandLine$/, "options (ParseCommandLine)"],
  [/cmd\/tsgo\.newSys$/, "harness: in-memory FS"],
  [/parser\.ParseSourceFile$/, "parse"],
  [/binder\.BindSourceFile$|\.GetBindDiagnostics$/, "bind"],
  [/\.GetGlobalDiagnostics$/, "checker creation (globals merge)"],
  [/\.GetSemanticDiagnostics$/, "check main.ts"],
  [/\(\*compiler\.Program\)\.Emit$/, "emit (--noEmit)"],
  [
    /SortAndDeduplicateDiagnostics|CreateDiagnosticReporter\$|CreateReportErrorSummary\$/,
    "sort + print diagnostics",
  ],
  [/compiler\.NewProgram$/, "program setup (file loader)"],
  [
    /\.GetSyntacticDiagnostics$|\.GetProgramDiagnostics$|\.GetConfigFileParsingDiagnostics$|\.GetOptionsDiagnostics$/,
    "other diagnostics",
  ],
];

let phaseCache: { prog: Program; tag: Int8Array } | null = null;
function phaseTags(prog: Program): Int8Array {
  if (phaseCache?.prog === prog) return phaseCache.tag;
  const tag = new Int8Array(prog.funcs.length).fill(-1);
  prog.funcs.forEach((f, i) => {
    const k = PHASES.findIndex(([re]) => re.test(f.name));
    if (k >= 0) tag[i] = k;
  });
  phaseCache = { prog, tag };
  return tag;
}

// ------------------------------------------------------------ one check

export function profileCheck(runner: ImageRunner, main: string, cap: number): Profile {
  const m = runner.machine();
  m.callEntry(runner.fid, [main]);
  return profileRun(m, cap);
}

/** Runs a machine set up for an entry call to the end, profiling it. */
export function profileRun(m: Machine, cap: number): Profile {
  const tag = phaseTags(m.prog);
  for (const k of Object.keys(tally)) delete tally[k];
  const samples = new Float64Array(PHASES.length + 1);
  let last = m.ops;
  const start = m.ops;
  const sample = () => {
    // Innermost recognised frame wins (parse inside NewProgram, etc.).
    let p = PHASES.length;
    for (let i = m.stack.length - 1; i >= 0; i--) {
      const t = tag[m.stack[i]!.d.id]!;
      if (t >= 0) {
        p = t;
        break;
      }
    }
    samples[p]! += m.ops - last;
    last = m.ops;
  };
  while (m.run(Math.min(m.ops + SAMPLE, start + cap)) === "paused") {
    sample();
    if (m.ops - start >= cap) break;
  }
  samples[PHASES.length]! += m.ops - last;
  const r = m.result();
  const phases: Record<string, number> = {};
  PHASES.forEach(([, nm], i) => {
    if (samples[i]) phases[nm] = samples[i]!;
  });
  if (samples[PHASES.length])
    phases["harness glue (run, diagnostics loop)"] = samples[PHASES.length]!;
  const intr: Profile["intrinsics"] = {};
  for (const [k, v] of Object.entries(tally)) intr[k] = { ...v };
  return {
    ops: m.ops - start,
    stdout: r.stdout,
    stderr: r.stderr,
    exit: r.exit,
    byFunc: m.opStats().byFunc,
    byEvent: byEvent(m),
    intrinsics: intr,
    phases,
  };
}
