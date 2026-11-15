abstract class Repo<T extends { id: number }> {
  protected items: T[] = [];
  abstract validate(x: T): boolean;
  add(x: T): void { if (this.validate(x)) this.items.push(x); }
  find(id: number): T | undefined { for (const i of this.items) if (i.id === id) return i; return undefined; }
}
class Users extends Repo<{ id: number; name: string }> {
  validate(x: { id: number; name: string }) { return x.name.length > 0; }
}
new Users().add({ id: 1, name: "a" });
