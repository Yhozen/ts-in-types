function parse(x: string): number;
function parse(x: number): string;
function parse(x: string | number): string | number {
  return typeof x === "string" ? x.length : String(x);
}
const n: number = parse("abc");
const s: string = parse(3);
