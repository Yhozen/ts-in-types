class A {
  private a = 1;
  protected b = 2;
  #c = 3;
}
class B extends A {
  f() { return this.a + this.b; }
}
const x = new A();
x.a; x.b;
