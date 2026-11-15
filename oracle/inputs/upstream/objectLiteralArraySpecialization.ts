// microsoft/TypeScript tests/cases/compiler/objectLiteralArraySpecialization.ts at 5848bc5157b2 (Apache-2.0).
// Its // @ directives are kept as comments; the oracle does not apply them.
// @target: es2015
// @strict: false
declare function create<T>(initialValues?: T[]): MyArrayWrapper<T>;
interface MyArrayWrapper<T> {
  constructor(initialItems?: T[]);
  doSomething(predicate: (x: T, y: T) => boolean): void;
}
var thing = create([
  { name: "bob", id: 24 },
  { name: "doug", id: 32 },
]); // should not error
thing.doSomething((x, y) => x.name === "bob"); // should not error
