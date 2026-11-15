type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
const j: Json = { a: [1, "x", { b: null }], c: undefined };
