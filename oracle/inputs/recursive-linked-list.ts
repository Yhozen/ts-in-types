interface Node<T> { value: T; next: Node<T> | null }
const n: Node<number> = { value: 1, next: { value: 2, next: { value: "3", next: null } } };
