interface Callable {
  (x: number): string;
  prop: number;
}
interface Ctor {
  new (s: string): { s: string };
}
declare const f: Callable;
declare const C: Ctor;
const r: number = f(1);
new C(1);
f.prop = "a";
