/** Runs `fn` over `items` with at most `n` in flight; `fn` gets the item's index. */
export async function pool<T>(
  items: T[],
  n: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i]!, i);
      }
    }),
  );
}
