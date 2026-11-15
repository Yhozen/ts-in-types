class C {
  m(x: number): number;
  m(x: string): string;
  m(x: any) { return x; }
}
const c = new C();
const s: string = c.m(1);
