type T = "a" | "b" | "c";
function f(t: T): number {
  switch (t) {
    case "a":
      return 1;
    case "b":
      return 2;
    default:
      const n: never = t;
      return n;
  }
}
