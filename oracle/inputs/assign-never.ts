declare const n: never;
const x: string = n;
const y: never = "a";
function fail(): never {
  throw 0;
}
const z: number = fail();
