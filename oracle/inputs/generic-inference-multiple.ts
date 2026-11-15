function pair<A, B>(a: A, b: B): [A, B] { return [a, b]; }
const p: [string, number] = pair(1, "x");
function same<T>(a: T, b: T): T { return a; }
same(1, "x");
