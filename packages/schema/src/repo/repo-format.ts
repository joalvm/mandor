/**
 * Highest format of `mandor.yaml` this build can read and the one it writes. An origin saved by
 * a newer build does not open: reading it here would rewrite files without keys this build does
 * not know. It moves apart from the bundle's: an origin and an exported file age at their own
 * pace.
 */
export const REPO_FORMAT = 2;
