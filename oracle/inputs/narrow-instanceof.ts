class A { a = 1; }
class B { b = 2; }
function f(x: A | B) {
  if (x instanceof A) return x.a;
  return x.a;
}
