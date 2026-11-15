// Where a check's operations go, on the reference interpreter, from the
// boot image, over all oracle inputs (scripts/profile-stats.ts), plus the
// one-liner fresh and from the image, compared with stage 0's SSA counter.
//
//   node scripts/profile.ts [--jobs N]
//
// Writes oracle/profile.json (generated data) and the generated part of
// docs/PROFILE.md (between the "generated" markers; the prose around it is
// hand-written; run `vp check --fix` after, it formats the tables).
// Needs the boot images (scripts/boot.ts).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bootMachine, checkFresh, ImageRunner, libSource, WARMUP } from "./checks.ts";
import {
  engineDir,
  ensureProg,
  goFiles,
  goStrings,
  harnessFunc,
  loadEngine,
  loadProg,
  type Program,
} from "./engine.ts";
import {
  argsFor,
  encodeOut,
  type Lib,
  LIBS,
  libFile,
  parseCommon,
  readExpected,
  root,
} from "./inputs.ts";
import { instrumentIntrinsics, type Profile, profileRun, SAMPLE } from "./profile-stats.ts";
import { runChecks } from "./ref.ts";

type Counts = Record<string, number>;
const add = (into: Counts, from: Counts | undefined) => {
  for (const [k, v] of Object.entries(from ?? {})) into[k] = (into[k] ?? 0) + v;
};
const sum = (c: Counts) => Object.values(c).reduce((a, b) => a + b, 0);
const sorted = (c: Counts) =>
  Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

/** Go package of an IR function name. */
export function packageOf(fn: string): string {
  let s = fn;
  if (s.startsWith("(")) s = s.slice(1).replace(/^\*/, "");
  s = s.split("[")[0]!;
  const slash = s.lastIndexOf("/");
  const dot = s.indexOf(".", slash + 1);
  return dot < 0 ? s : s.slice(0, dot);
}
const short = (s: string) =>
  s.replaceAll("github.com/microsoft/typescript-go/internal/", "").replaceAll("github.com/", "");

const byPackage = (byFunc: Counts): Counts => {
  const p: Counts = {};
  for (const [f, v] of Object.entries(byFunc)) p[packageOf(f)] = (p[packageOf(f)] ?? 0) + v;
  return p;
};

function quantiles(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
  return {
    n: s.length,
    min: s[0]!,
    median: q(0.5),
    p90: q(0.9),
    max: s.at(-1)!,
    sum: s.reduce((a, b) => a + b, 0),
  };
}

/** Stage 0's warm es5 check (docs/stage0/ops/ssa-phased-es5.txt in the engine). */
function stage0(
  lib: Lib,
): { total: number; byPackage: Counts; byOp: Counts; events: Counts; top: Counts } | null {
  let text: string;
  try {
    text = readFileSync(join(engineDir, `docs/stage0/ops/ssa-phased-${lib}.txt`), "utf8");
  } catch {
    return null;
  }
  const sec = text.split("### warm check (second program, lib reused)")[1]?.split("\n### ")[0];
  if (!sec) return null;
  const total = Number(/instructions: (\d+)/.exec(sec)![1]);
  const block = (name: string) => {
    const b = sec.split(`${name}:\n`)[1]?.split(/\n[a-z][^\n]*:\n/)[0] ?? "";
    const out: Counts = {};
    for (const line of b.split("\n")) {
      const m = /^\s+(.+?)\s+(\d+)(\s+[\d.]+%)?$/.exec(line);
      if (m) out[m[1]!] = Number(m[2]);
    }
    return out;
  };
  const top: Counts = {};
  for (const line of (sec.split("top functions:\n")[1] ?? "").split("\n")) {
    const m = /^\s+(\d+)\s+[\d.]+%\s+(.+)$/.exec(line);
    if (!m) break;
    top[m[2]!] = Number(m[1]);
  }
  return {
    total,
    byPackage: block("by package"),
    byOp: block("by op"),
    events: block("events"),
    top,
  };
}

// ------------------------------------------------------------ main

const { jobs } = parseCommon(process.argv.slice(2));
const progPath = ensureProg();
await instrumentIntrinsics(engineDir);
const E = await loadEngine();
const prog: Program = loadProg(progPath);
const t0 = performance.now();

// The one-liner: fresh (with package init split out) and from the image.
const one: Record<string, any> = {};
for (const lib of LIBS) {
  const initOnly = new E.interp.Machine(prog);
  initOnly.pushFrame(prog.init, [], null, -1, false);
  initOnly.run();
  const m = new E.interp.Machine(prog);
  const fid = harnessFunc(prog, "check");
  m.bootEntry(fid, [
    goFiles(E, m, fid, { [libFile(lib)]: libSource(lib), "main.ts": WARMUP }),
    goStrings(E, argsFor(lib)),
  ]);
  const fresh: Profile = profileRun(m, 1e11);
  const plain = checkFresh(E, prog, lib, WARMUP, 1e11);
  const { warmup } = bootMachine(E, prog, lib);
  const img = ImageRunner.load(E, prog, lib);
  const im = img.machine();
  im.callEntry(img.fid, [WARMUP]);
  const warm: Profile = profileRun(im, 1e11);
  const want = readExpected(lib, "assign-basic.ts");
  for (const [k, r] of [
    ["fresh", fresh],
    ["image", warm],
  ] as const)
    if (encodeOut(r.stdout, r.exit) !== want)
      throw new Error(`one-liner ${lib} ${k}: wrong output`);
  one[lib] = {
    fresh: {
      total: fresh.ops,
      init: initOnly.ops,
      check: fresh.ops - initOnly.ops,
      phases: fresh.phases,
    },
    freshUnprofiled: plain.ops,
    boot: warmup.ops,
    image: {
      total: warm.ops,
      phases: warm.phases,
      byPackage: Object.fromEntries(sorted(byPackage(warm.byFunc))),
      byEvent: Object.fromEntries(sorted(warm.byEvent)),
      intrinsics: warm.intrinsics,
      top: sorted(warm.byFunc),
    },
    stage0: stage0(lib),
  };
}

// Every input from the image.
const all: Record<string, any> = {};
const perInput: Record<string, Record<string, number>> = {};
const GROUPS = [...LIBS, ...LIBS.map((l) => `${l}-core`)];
const agg = Object.fromEntries(
  GROUPS.map((l) => [
    l,
    {
      byFunc: {} as Counts,
      byEvent: {} as Counts,
      phases: {} as Counts,
      intrinsics: {} as Record<string, { calls: number; bytes: number }>,
      ops: [] as number[],
    },
  ]),
);
let wrong = 0;
await runChecks({
  libs: [...LIBS],
  only: [],
  jobs: jobs ?? 6,
  mode: "image",
  cap: 20e9,
  profile: true,
  onResult: (job, r, done, total) => {
    if (encodeOut(r.stdout, r.exit) !== readExpected(job.lib, job.input)) wrong++;
    for (const g of job.input.startsWith("extreme/") ? [job.lib] : [job.lib, `${job.lib}-core`]) {
      const a = agg[g]!;
      a.ops.push(r.ops);
      add(a.byFunc, r.profile!.byFunc);
      add(a.byEvent, r.profile!.byEvent);
      add(a.phases, r.profile!.phases);
      for (const [k, v] of Object.entries(r.profile!.intrinsics)) {
        const t = (a.intrinsics[k] ??= { calls: 0, bytes: 0 });
        t.calls += v.calls;
        t.bytes += v.bytes;
      }
    }
    (perInput[job.input] ??= {})[job.lib] = r.ops;
    if (done % 50 === 0 || done === total) process.stderr.write(`${done}/${total}\n`);
  },
});
if (wrong) throw new Error(`${wrong} checks from the image differ from the oracle`);
for (const lib of GROUPS) {
  const a = agg[lib]!;
  const fsum = sum(a.byFunc);
  all[lib] = {
    ops: quantiles(a.ops),
    phases: Object.fromEntries(sorted(a.phases)),
    byPackage: Object.fromEntries(sorted(byPackage(a.byFunc))),
    byEvent: Object.fromEntries(sorted(a.byEvent)),
    intrinsics: Object.fromEntries(
      Object.entries(a.intrinsics).sort(
        (x, y) => y[1].bytes - x[1].bytes || y[1].calls - x[1].calls,
      ),
    ),
    topFunctions: sorted(a.byFunc).slice(0, 60),
    functionsExecuted: Object.keys(a.byFunc).length,
    checkOps: fsum,
  };
}
const profile = {
  generated: "by scripts/profile.ts; do not edit",
  engine: { ir: prog.funcs.length + " funcs", sample: SAMPLE },
  oneLiner: one,
  all,
  perInput,
};
writeFileSync(join(root, "oracle/profile.json"), JSON.stringify(profile, null, 1) + "\n");

// ------------------------------------------------------------ PROFILE.md

const n = (x: number) => Math.round(x).toLocaleString("en-US");
const pct = (x: number, t: number) => ((100 * x) / t).toFixed(1);
const table = (head: string[], rows: (string | number)[][], right = head.map((_, i) => i > 0)) =>
  [
    `| ${head.join(" | ")} |`,
    `| ${head.map((_, i) => (right[i] ? "---:" : "---")).join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");

const md: string[] = [];
md.push("### The one-liner\n");
md.push(
  table(
    ["", "mini", "es5"],
    [
      ["fresh: package init", n(one.mini.fresh.init), n(one.es5.fresh.init)],
      ["fresh: check (options → print)", n(one.mini.fresh.check), n(one.es5.fresh.check)],
      ["**fresh total**", `**${n(one.mini.fresh.total)}**`, `**${n(one.es5.fresh.total)}**`],
      ["boot (init + boot entry, warm-up check)", n(one.mini.boot), n(one.es5.boot)],
      [
        "**from the image (checkWarm)**",
        `**${n(one.mini.image.total)}**`,
        `**${n(one.es5.image.total)}**`,
      ],
      [
        "stage 0 SSA, warm (options parsed again)",
        n(one.mini.stage0?.total ?? 0),
        n(one.es5.stage0?.total ?? 0),
      ],
    ],
  ),
);
md.push(`\nPhases (sampled every ${SAMPLE} ops on the innermost recognised frame):\n`);
const phaseNames = [
  ...new Set([...Object.keys(one.es5.fresh.phases), ...Object.keys(one.es5.image.phases)]),
];
md.push(
  table(
    ["phase", "mini fresh", "mini image", "es5 fresh", "es5 image"],
    phaseNames.map((p) => [
      p,
      n(one.mini.fresh.phases[p] ?? 0),
      n(one.mini.image.phases[p] ?? 0),
      n(one.es5.fresh.phases[p] ?? 0),
      n(one.es5.image.phases[p] ?? 0),
    ]),
  ),
);
md.push("\n### The es5 one-liner from the image vs stage 0's warm check, by package\n");
{
  const ref = one.es5.image.byPackage as Counts;
  const s0 = one.es5.stage0?.byPackage ?? {};
  const keys = [...new Set([...Object.keys(ref), ...Object.keys(s0)])]
    .map((k) => [k, ref[k] ?? 0, s0[k] ?? 0] as const)
    .sort((a, b) => Math.abs(b[1] - b[2]) - Math.abs(a[1] - a[2]))
    .slice(0, 25);
  md.push(
    table(
      ["package", "reference (image)", "stage 0 (warm)", "difference"],
      [
        ...keys.map(([k, a, b]) => [short(k), n(a), n(b), (a - b > 0 ? "+" : "") + n(a - b)]),
        [
          "**total**",
          `**${n(one.es5.image.total)}**`,
          `**${n(one.es5.stage0?.total ?? 0)}**`,
          n(one.es5.image.total - (one.es5.stage0?.total ?? 0)),
        ],
      ],
    ),
  );
}
md.push(
  "\nStage 0's top functions (warm es5 check) on the reference, es5 one-liner from the image:\n",
);
{
  const ref = Object.fromEntries(one.es5.image.top as [string, number][]);
  md.push(
    table(
      ["stage 0", "reference", "function"],
      sorted(one.es5.stage0?.top ?? {}).map(([f, v]) => [
        n(v),
        n(ref[f] ?? 0),
        "`" + short(f) + "`",
      ]),
      [true, true, false],
    ),
  );
}
md.push("\nTop functions, es5 one-liner from the image:\n");
md.push(
  table(
    ["ops", "%", "function"],
    (one.es5.image.top as [string, number][])
      .slice(0, 25)
      .map(([f, v]) => [n(v), pct(v, one.es5.image.total), "`" + short(f) + "`"]),
    [true, true, false],
  ),
);
for (const lib of GROUPS) {
  const a = all[lib];
  md.push(
    lib.endsWith("-core")
      ? `\n### Inputs from the image without extreme/, ${lib.slice(0, -5)}\n`
      : `\n### All inputs from the image, ${lib}\n`,
  );
  md.push(
    `${a.ops.n} checks: median ${n(a.ops.median)} ops, p90 ${n(a.ops.p90)}, max ${n(a.ops.max)}, ` +
      `min ${n(a.ops.min)}, total ${n(a.ops.sum)}; ${a.functionsExecuted} functions executed.\n`,
  );
  md.push(
    table(
      ["phase", "ops", "%"],
      sorted(a.phases).map(([k, v]) => [k, n(v), pct(v, a.ops.sum)]),
    ),
  );
  md.push("");
  md.push(
    table(
      ["package", "ops", "%"],
      sorted(a.byPackage)
        .slice(0, 20)
        .map(([k, v]) => [short(k), n(v), pct(v, a.ops.sum)]),
    ),
  );
  md.push("");
  md.push(
    table(
      ["ops", "%", "function"],
      (a.topFunctions as [string, number][])
        .slice(0, 30)
        .map(([f, v]) => [n(v), pct(v, a.ops.sum), "`" + short(f) + "`"]),
      [true, true, false],
    ),
  );
}
md.push(
  "\n### Events (instruction kinds): all inputs from the image, the es5 one-liner, stage 0\n",
);
{
  const s0 = one.es5.stage0 ?? { byOp: {}, events: {} };
  const ev = (c: Counts, re: RegExp) =>
    Object.entries(c).reduce((t, [k, v]) => (re.test(k) ? t + v : t), 0);
  // [label, my events (regexp over event names), stage 0 keys (byOp or events)]
  const rows: [string, RegExp, string[]][] = [
    ["binop", /^binop /, ["BinOp"]],
    ["load + unop (stage 0: UnOp)", /^(load|unop .*)$/, ["UnOp"]],
    ["if", /^if$/, ["If"]],
    ["phi", /^phi$/, ["Phi"]],
    ["jump", /^jump$/, ["Jump"]],
    ["return", /^return$/, ["Return"]],
    ["fieldAddr", /^fieldAddr$/, ["FieldAddr"]],
    ["store", /^store$/, ["Store"]],
    ["index / indexAddr", /^(index|indexAddr)$/, ["Index", "IndexAddr"]],
    ["extract", /^extract$/, ["Extract"]],
    ["slice", /^slice$/, ["Slice"]],
    ["convert / changeType", /^(convert|changeType)$/, ["Convert", "ChangeType"]],
    ["call static (IR functions)", /^call static$/, []],
    ["call static (intrinsic)", /^call static \(intrinsic\)$/, []],
    ["call static, all (stage 0: incl. externals)", /^call static/, ["call (static)"]],
    ["call interface method", /^call interface method$/, ["call (interface method)"]],
    [
      "call func value / closure",
      /^call func value$/,
      ["call (func value)", "call (closure literal)"],
    ],
    ["call builtin len", /^call builtin len$/, ["call (builtin len)"]],
    ["call builtin append", /^call builtin append$/, ["call (builtin append)"]],
    ["call builtin cap", /^call builtin cap$/, ["call (builtin cap)"]],
    ["alloc heap", /^alloc heap$/, ["alloc (heap)"]],
    ["alloc local", /^alloc local$/, ["alloc (local)"]],
    ["makeInterface", /^makeInterface$/, ["MakeInterface"]],
    ["makeClosure", /^makeClosure$/, ["MakeClosure"]],
    ["makeSlice / makeMap", /^(makeSlice|makeMap)$/, ["MakeSlice", "MakeMap"]],
    ["typeAssert", /^typeAssert$/, ["TypeAssert"]],
    ["map lookup", /^map lookup$/, ["map lookup"]],
    ["map update", /^map update$/, ["map update"]],
    ["map range / next", /^map range( next)?$/, ["map range", "map range next"]],
    ["string index", /^string index$/, []],
    ["defer / runDefers", /^(defer .*|runDefers)$/, ["Defer", "RunDefers"]],
  ];
  const s0v = (keys: string[]) =>
    keys.length === 0
      ? ""
      : n(keys.reduce((t, k) => t + ((s0.byOp as Counts)[k] ?? (s0.events as Counts)[k] ?? 0), 0));
  md.push(
    table(
      ["event", "mini, all", "es5, all", "es5 core", "es5 one-liner", "stage 0 es5 warm"],
      rows.map(([label, re, keys]) => [
        label,
        n(ev(all.mini.byEvent, re)),
        n(ev(all.es5.byEvent, re)),
        n(ev(all["es5-core"].byEvent, re)),
        n(ev(one.es5.image.byEvent, re)),
        s0v(keys),
      ]),
    ),
  );
}
md.push(
  "\n### Intrinsics (1 op each on the reference; a loop over their bytes at the type level)\n",
);
md.push(
  table(
    ["intrinsic", "mini calls", "mini bytes", "es5 calls", "es5 bytes"],
    Object.keys({ ...all.es5.intrinsics, ...all.mini.intrinsics })
      .sort(
        (x, y) =>
          (all.es5.intrinsics[y]?.bytes ?? 0) - (all.es5.intrinsics[x]?.bytes ?? 0) ||
          (all.es5.intrinsics[y]?.calls ?? 0) - (all.es5.intrinsics[x]?.calls ?? 0),
      )
      .map((k) => [
        "`" + k + "`",
        n(all.mini.intrinsics[k]?.calls ?? 0),
        n(all.mini.intrinsics[k]?.bytes ?? 0),
        n(all.es5.intrinsics[k]?.calls ?? 0),
        n(all.es5.intrinsics[k]?.bytes ?? 0),
      ]),
  ),
);
const largest = Object.entries(perInput)
  .map(([k, v]) => [k, v.mini ?? 0, v.es5 ?? 0] as const)
  .sort((a, b) => b[2] - a[2])
  .slice(0, 12);
md.push("\n### Largest checks from the image\n");
md.push(
  table(
    ["input", "mini", "es5"],
    largest.map(([k, a, b]) => [k, n(a), n(b)]),
    [false, true, true],
  ),
);

const docPath = join(root, "docs/PROFILE.md");
const BEGIN = "<!-- generated by scripts/profile.ts: begin -->";
const END = "<!-- generated by scripts/profile.ts: end -->";
let doc: string;
try {
  doc = readFileSync(docPath, "utf8");
} catch {
  doc = `# Profile\n\n${BEGIN}\n${END}\n`;
}
const i = doc.indexOf(BEGIN);
const j = doc.indexOf(END);
if (i < 0 || j < 0) throw new Error("docs/PROFILE.md: generated markers missing");
doc = doc.slice(0, i + BEGIN.length) + "\n\n" + md.join("\n") + "\n\n" + doc.slice(j);
writeFileSync(docPath, doc);
console.log(
  `profile: ${LIBS.map((l) => `${l} median ${n(all[l].ops.median)} max ${n(all[l].ops.max)}`).join(", ")}; ` +
    `one-liner image mini ${n(one.mini.image.total)}, es5 ${n(one.es5.image.total)} ` +
    `(${((performance.now() - t0) / 1000).toFixed(0)} s)`,
);
