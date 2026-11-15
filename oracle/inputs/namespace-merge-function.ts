function f() { return 1; }
namespace f { export const extra = "x"; }
const e: number = f.extra;
