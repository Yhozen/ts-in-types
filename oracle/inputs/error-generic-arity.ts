type Box<T> = { v: T };
const b: Box = { v: 1 };
const c: Box<number, string> = { v: 1 };
function f<T>() {}
f<number, string>();
