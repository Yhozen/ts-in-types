class A {
  m(x: number): void {}
}
class B extends A {
  m(x: string): void {}
}
class C extends A {
  override n() {}
}
