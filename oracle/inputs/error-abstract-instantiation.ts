abstract class A {
  abstract m(): void;
}
class B extends A {
  m() {}
}
new A();
const a: A = new B();
