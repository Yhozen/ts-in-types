interface U { id: number; name: string; email: string }
type P = Pick<U, "id" | "name">;
type O = Omit<U, "email">;
const p: P = { id: 1, name: "x", email: "e" };
type Bad = Pick<U, "nope">;
