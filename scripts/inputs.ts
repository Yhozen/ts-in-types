// Shared by the oracle, the reference harness, the boot image and the
// profile: the inputs, the lib modes, the command line and the expected
// output format.
//
// Expected output (`oracle/expected/<lib>/<input path>.out`): tsc's stdout,
// byte for byte, followed by "\n[exit N]\n" with tsc's exit status. tsc
// writes nothing to stderr on these inputs (the oracle checks). The trailer
// is always appended, so the stdout is the file minus its last
// "\n[exit N]\n".
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const inputsDir = join(root, "oracle/inputs");
export const expectedDir = join(root, "oracle/expected");
export const manifestPath = join(root, "oracle/manifest.json");

export const LIBS = ["mini", "es5"] as const;
export type Lib = (typeof LIBS)[number];
export const libFile = (lib: Lib): string => `lib.${lib}.d.ts`;
export const libPath = (lib: Lib): string => join(root, "oracle", libFile(lib));

/** The command line of every check (files are in the current directory). */
export const argsFor = (lib: Lib): string[] => [
  "--noLib",
  "--noEmit",
  "--skipLibCheck",
  "--singleThreaded",
  libFile(lib),
  "main.ts",
];

/** Input paths relative to oracle/inputs (e.g. "upstream/foo.ts"), sorted. */
export function listInputs(only: string[] = []): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n.endsWith(".ts")) out.push(relative(inputsDir, p));
    }
  };
  walk(inputsDir);
  return only.length === 0 ? out : out.filter((f) => only.some((x) => f.includes(x)));
}

export const expectedPath = (lib: Lib, input: string): string =>
  join(expectedDir, lib, `${input}.out`);

/** Byte strings (latin1) throughout. */
export const encodeOut = (stdout: string, exit: number): string => `${stdout}\n[exit ${exit}]\n`;

export function readExpected(lib: Lib, input: string): string {
  return readFileSync(expectedPath(lib, input), "latin1");
}

/** Shared command-line flags: --lib mini|es5, --only S (repeatable), --jobs N. */
export function parseCommon(argv: string[]): {
  libs: Lib[];
  only: string[];
  jobs: number | undefined;
  rest: string[];
} {
  const libs: Lib[] = [];
  const only: string[] = [];
  let jobs: number | undefined;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--lib") {
      const l = argv[++i] as Lib;
      if (!LIBS.includes(l)) throw new Error(`--lib: mini or es5, not ${l}`);
      libs.push(l);
    } else if (a === "--only") only.push(argv[++i]!);
    else if (a === "--jobs") jobs = Number(argv[++i]);
    else rest.push(a);
  }
  return { libs: libs.length ? libs : [...LIBS], only, jobs, rest };
}
