class A {
  x = 1;
}
class B {
  x = 2;
}
class C {
  private x = 3;
}
const a: A = new B();
const b: A = new C();
