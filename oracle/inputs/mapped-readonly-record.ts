type Ro = Readonly<{ a: number }>;
const ro: Ro = { a: 1 };
ro.a = 2;
type Rec = Record<"x" | "y", number>;
const rec: Rec = { x: 1 };
