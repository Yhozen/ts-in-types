function len<T extends { length: number }>(x: T): number {
  return x.length;
}
len("abc");
len([1, 2]);
len(42);
