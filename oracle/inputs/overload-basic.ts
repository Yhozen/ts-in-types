function f(x: string): string;
function f(x: number): number;
function f(x: any): any {
  return x;
}
const a: number = f("a");
f(true);
