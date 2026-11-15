// Hover types through the tsrs language server, exactly like an editor does
// (adapted from go-in-types' scripts/hover.ts).
//
//   node scripts/hover.ts <file> <TypeName> [<TypeName> ...]
//
// Starts `tsrs --lsp --stdio` with TSRS_FAST=1 (the tsdk launcher an editor
// uses) inside the engine's scripts/heavy.sh (one of the two machine-wide
// heavy slots),
// opens the file, sends textDocument/hover on each `type <Name>` declaration
// in turn, in one server session (like an editor that stays open), and
// prints each hover text, how long it took and the server's peak memory.
// HOVER_TIMEOUT_MS (default 600000) bounds the whole session;
// HOVER_DIAGNOSTICS=1 first pulls the file's diagnostics, as an editor does
// when it opens a file.
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { engineDir } from "./engine.ts";

const ROOT = resolve(import.meta.dirname, "..");
const HEAVY = resolve(engineDir, "scripts/heavy.sh");

export interface HoverResult {
  /** The hovered type's text (the code fence of the markdown hover). */
  text: string;
  seconds: number;
  /** The server's peak resident memory (bytes) so far in the session, sampled every 100 ms. */
  peakBytes: number;
}

const MAX_LENGTH = Number(process.env.HOVER_MAX_LENGTH ?? 100_000_000);

export interface HoverOptions {
  timeoutMs?: number;
  /** Diagnostics pulled before the first hover (an editor opening the file). */
  diagnostics?: boolean;
  /** Skip heavy.sh (the caller already holds a slot). */
  noSlot?: boolean;
}

export const hover = async (file: string, name: string, o?: HoverOptions): Promise<HoverResult> =>
  (await hoverAll(file, [name], o))[0]!;

/** The server's process group's peak RSS (bytes): heavy.sh's shell plus tsrs. */
function groupRss(pgid: number): number {
  try {
    const out = execFileSync("ps", ["-o", "rss=", "-g", String(pgid)]).toString();
    return (
      out
        .split("\n")
        .map((l) => Number(l.trim()) || 0)
        .reduce((a, b) => Math.max(a, b), 0) * 1024
    );
  } catch {
    return 0;
  }
}

/** Hover each name in turn, in one language-server session. */
export async function hoverAll(
  file: string,
  names: string[],
  o: HoverOptions = {},
): Promise<HoverResult[]> {
  const timeoutMs = o.timeoutMs ?? Number(process.env.HOVER_TIMEOUT_MS ?? 600_000);
  const path = resolve(file);
  const source = readFileSync(path, "utf8");
  const lines = source.split("\n");
  const positions = names.map((name) => {
    const line = lines.findIndex((l) => new RegExp(`\\btype ${name}\\b`).test(l));
    if (line < 0) throw new Error(`no "type ${name}" in ${file}`);
    return { line, character: lines[line]!.indexOf(name) + 1 };
  });
  const uri = pathToFileURL(path).href;
  const launcher = resolve(ROOT, "node_modules/tsrs/tsdk/tsgo");
  const cmd = o.noSlot ? launcher : HEAVY;
  const args = o.noSlot ? ["--lsp", "--stdio"] : [launcher, "--lsp", "--stdio"];
  const server = spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, TSRS_FAST: "1" },
    detached: true, // own process group: a timeout kills tsrs, not only the shell
  });
  const killAll = () => {
    try {
      process.kill(-server.pid!, "SIGKILL");
    } catch {
      // gone
    }
  };
  const failed = new Promise<never>((_, reject) => {
    server.on("error", reject);
    server.on("exit", (code, signal) =>
      reject(new Error(`the language server exited (code ${code}, signal ${signal})`)),
    );
    setTimeout(
      () => reject(new Error(`timeout: no hover result after ${timeoutMs / 1000}s`)),
      timeoutMs,
    ).unref();
  });
  failed.catch(() => {});
  let peakBytes = 0;
  const sample = () => {
    const b = groupRss(server.pid!);
    if (b > peakBytes) peakBytes = b;
  };
  const sampler = setInterval(sample, 100);
  let buffer = Buffer.alloc(0);
  let nextId = 0;
  const pending = new Map<number, (message: any) => void>();
  const send = (message: object) => {
    const body = JSON.stringify({ jsonrpc: "2.0", ...message });
    server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  };
  const request = (method: string, params: object) =>
    Promise.race([
      failed,
      new Promise<any>((done) => {
        const id = ++nextId;
        pending.set(id, done);
        send({ id, method, params });
      }),
    ]);
  server.stdout.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const end = buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const length = Number(/Content-Length: (\d+)/.exec(buffer.subarray(0, end).toString())![1]);
      if (buffer.length < end + 4 + length) return;
      const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString());
      buffer = buffer.subarray(end + 4 + length);
      if (message.id !== undefined && pending.has(message.id)) {
        pending.get(message.id)!(message);
        pending.delete(message.id);
      } else if (message.id !== undefined && message.method) {
        send({ id: message.id, result: null }); // answer server->client requests
      }
    }
  });

  try {
    await request("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(ROOT).href,
      capabilities: { textDocument: { hover: { contentFormat: ["markdown", "plaintext"] } } },
      initializationOptions:
        MAX_LENGTH > 0 ? { userPreferences: { maximumHoverLength: MAX_LENGTH } } : {},
    });
    send({ method: "initialized", params: {} });
    send({
      method: "textDocument/didOpen",
      params: { textDocument: { uri, languageId: "typescript", version: 1, text: source } },
    });
    if (o.diagnostics ?? process.env.HOVER_DIAGNOSTICS) {
      const started = performance.now();
      const response = await request("textDocument/diagnostic", { textDocument: { uri } });
      const items: any[] = response.result?.items ?? [];
      console.error(
        `diagnostics (${((performance.now() - started) / 1000).toFixed(2)}s): ${items.length} ` +
          items.map((d) => `line ${d.range.start.line + 1}: ${d.message}`).join("; "),
      );
    }
    const results: HoverResult[] = [];
    for (const position of positions) {
      const started = performance.now();
      const response = await request("textDocument/hover", { textDocument: { uri }, position });
      const seconds = (performance.now() - started) / 1000;
      sample();
      const value: string = response.result?.contents?.value ?? "";
      const fenced = /^```\w*\n([\s\S]*?)\n```/.exec(value);
      results.push({ text: fenced ? fenced[1]! : value, seconds, peakBytes });
    }
    return results;
  } finally {
    clearInterval(sampler);
    server.removeAllListeners("exit");
    killAll();
  }
}

if (import.meta.main) {
  const [file, ...names] = process.argv.slice(2);
  if (!file || names.length === 0) {
    console.error("usage: node scripts/hover.ts <file> <TypeName> [<TypeName> ...]");
    process.exit(2);
  }
  for (const { text, seconds, peakBytes } of await hoverAll(file, names)) {
    console.log(text);
    console.log(`(${seconds.toFixed(2)}s, server peak ${(peakBytes / 2 ** 30).toFixed(2)} GB)`);
  }
}
