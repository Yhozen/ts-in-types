interface Ev { kind: string }
interface Click extends Ev { x: number }
let handler: (e: Ev) => void = (e: Click) => {};
type M = { m(e: Ev): void };
const m: M = { m(e: Click) {} };
