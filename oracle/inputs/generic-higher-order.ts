function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C {
  return (a) => f(g(a));
}
const h = compose(
  (s: string) => s.length,
  (n: number) => String(n),
);
const r: string = h(1);
