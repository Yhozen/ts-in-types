type FirstNum<T> = T extends [infer H extends number, ...unknown[]] ? H : never;
const a: FirstNum<[1, 2]> = 2;
const b: FirstNum<["x"]> = "x";
