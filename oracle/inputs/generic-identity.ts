function id<T>(x: T): T { return x; }
const a: number = id("s");
const b = id<number>("s");
const c: string = id("s");
