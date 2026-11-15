namespace NS {
  export const x = 1;
  const hidden = 2;
  export function f() { return hidden; }
}
const a: number = NS.x;
NS.hidden;
NS.f();
