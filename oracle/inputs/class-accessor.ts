class T {
  private _v = 0;
  get v(): number { return this._v; }
  set v(x: number) { this._v = x; }
  get ro() { return 1; }
}
const t = new T();
t.v = "a";
t.ro = 2;
