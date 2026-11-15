interface Shape {
  area(): number;
}
class Circle implements Shape {
  constructor(private r: number) {}
  area() {
    return 3.14 * this.r * this.r;
  }
}
class Square implements Shape {
  constructor(private s: number) {}
  area() {
    return this.s * this.s;
  }
}
const shapes: Shape[] = [new Circle(1), new Square(2)];
let total = 0;
for (const s of shapes) total += s.area();
