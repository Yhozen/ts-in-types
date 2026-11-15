function f<T>(x: T) {
  return x.foo;
}
function g<T extends object>(x: T): T {
  return {};
}
