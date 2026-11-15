class Container<T extends string> {
  constructor(public v: T) {}
}
new Container(1);
const c: Container<number> = null!;
