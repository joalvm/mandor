/** Where the work of the user lives. The only word the interface knows for it. */
export const ORIGIN_KINDS = ['local', 'remote'] as const;

export type OriginKind = (typeof ORIGIN_KINDS)[number];

/** The id of the one origin that exists from the first start and can never be removed. */
export const LOCAL_ORIGIN_ID = 'local';

/**
 * An origin as a window knows it. It carries no path: the directory the origin lives in is
 * computed by main and never crosses to the renderer, so nothing on screen can show it.
 */
export type Origin = {
    id: string;
    name: string;
    kind: OriginKind;
    /** Where the work came from. Absent on the local origin, which was never fetched. */
    url?: string | undefined;
};
