interface Cat {
  meow(): void;
}
interface Dog {
  bark(): void;
}
function isCat(a: Cat | Dog): a is Cat {
  return "meow" in a;
}
function f(a: Cat | Dog) {
  if (isCat(a)) a.meow();
  else a.meow();
}
