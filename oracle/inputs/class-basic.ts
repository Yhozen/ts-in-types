class Point {
  constructor(public x: number, public y: number) {}
  dist(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
}
const p = new Point(1, 2);
p.z;
