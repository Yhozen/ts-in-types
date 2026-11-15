type O = { a: number; b: string; c: boolean };
type V = O["a" | "b"];
const v: V = true;
