class Stack<T> {
  private items: T[] = [];
  push(x: T): void {
    this.items.push(x);
  }
  pop(): T | undefined {
    return this.items[this.items.length - 1];
  }
}
const s = new Stack<number>();
s.push("a");
const v: string = s.pop();
