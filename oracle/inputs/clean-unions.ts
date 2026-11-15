type Result<T> = { ok: true; value: T } | { ok: false; error: string };
function unwrap<T>(r: Result<T>, d: T): T {
  return r.ok ? r.value : d;
}
const v: number = unwrap({ ok: false, error: "e" }, 0);
