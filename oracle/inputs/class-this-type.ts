class Builder {
  n = 0;
  add(): this { this.n++; return this; }
}
class Sub extends Builder { sub(): this { return this; } }
new Sub().add().sub().nope();
