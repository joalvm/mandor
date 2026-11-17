// The bundle Mermaid ships already built, its dependencies inside: the same library as its entry,
// exported the way the bundle itself exports it.
declare module 'mermaid/dist/mermaid.esm.min.mjs' {
    import type { Mermaid } from 'mermaid';

    const mermaid: Mermaid;

    export { mermaid as default };
}
