class A { constructor(x: number) {} }
class B extends A {
  y = 1;
  constructor() {
    this.y = 2;
    super("s");
  }
}
