/**
 * What happened to a path, told so that whoever holds it open can follow it. A move carries
 * both names because a tab pointing at the old one has to be able to point at the new one.
 */
export type DiskChange =
    | { kind: 'changed'; path: string }
    | { kind: 'moved'; from: string; to: string }
    | { kind: 'removed'; path: string };
