type Fib<N extends number, A extends unknown[] = [], B extends unknown[] = [1], I extends unknown[] = []> =
  I["length"] extends N ? A["length"] : Fib<N, B, [...A, ...B], [...I, 1]>;
const f: Fib<10> = 55;
