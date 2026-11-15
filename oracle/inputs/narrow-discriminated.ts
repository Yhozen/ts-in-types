type Shape =
  | { kind: "circle"; r: number }
  | { kind: "square"; size: number }
  | { kind: "rect"; w: number; h: number };
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return 3 * s.r * s.r;
    case "square":
      return s.size * s.size;
    case "rect":
      return s.w * s.size;
  }
}
