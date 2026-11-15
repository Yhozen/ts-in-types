type IsString<T> = T extends string ? "yes" : "no";
const a: IsString<"x"> = "no";
const b: IsString<1> = "no";
