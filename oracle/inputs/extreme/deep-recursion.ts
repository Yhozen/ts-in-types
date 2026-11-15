// A deep tail-recursive conditional type (a countdown over string digits)
// and a non-tail one that hits the instantiation depth limit.
type Count<N extends number, A extends unknown[] = []> = A["length"] extends N
  ? A
  : Count<N, [...A, 0]>;
type Len<T extends unknown[]> = T["length"];
const a: Len<Count<200>> = 199;
type Nest<N extends number, A extends unknown[] = []> = A["length"] extends N
  ? "done"
  : { inner: Nest<N, [...A, 0]> };
type Deep<T> = T extends { inner: infer I } ? Deep<I> : T;
const d: Deep<Nest<60>> = "not done";
type Infinite<T> = { [K in keyof T]: Infinite<[T]> }[keyof T];
declare const inf: Infinite<[1]>;
