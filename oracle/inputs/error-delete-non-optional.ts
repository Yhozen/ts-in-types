interface I { a: number; b?: number }
declare const i: I;
delete i.a;
delete i.b;
