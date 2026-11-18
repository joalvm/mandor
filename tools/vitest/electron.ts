// What `electron` is in the node project: nothing. Outside its own runtime the package is only the
// path to a binary, and that binary exists only where an install ran the scripts that download it,
// so a test that loaded it passed on a desk and failed on a runner installed without them. Here no
// install has to: a test that reaches the desktop runtime replaces it with `vi.mock('electron')`
// and a typed double, and one that only passes through a module importing it gets nothing, as it
// did before. The alias that points the package here is in `vitest.config.ts`.
export {};
