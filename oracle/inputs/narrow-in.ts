type Fish = { swim(): void };
type Bird = { fly(): void };
function move(p: Fish | Bird) {
  if ("swim" in p) {
    p.swim();
    return;
  }
  p.swim();
}
