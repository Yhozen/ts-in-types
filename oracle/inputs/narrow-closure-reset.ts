function f(x: string | number) {
  if (typeof x === "string") {
    const g = () => x.length;
    x = 1;
    return g;
  }
}
