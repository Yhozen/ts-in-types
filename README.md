# ts-in-types

The real TypeScript 7 compiler, written in Go, running inside the TypeScript
type checker through go-in-types. Status: stage 3 done: the compiler runs
on go-in-types' reference interpreter and matches native tsc on all 656
oracle checks, fresh and from a boot image (the one-liner from the image:
116,638 ops with lib.es5.d.ts). See `docs/PLAN.md` and `docs/PROFILE.md`.
