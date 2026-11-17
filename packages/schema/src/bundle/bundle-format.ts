/**
 * Highest format of a workspace bundle this build can read and the one it writes. A reader
 * accepts this one and every one before it, and names the newer one it cannot read. Version 1 has
 * flat folders: it lost its tree when it was written, and reads as it was. Version 2 nests them, and
 * a reader of 1 would drop what hangs below the first level without saying so.
 */
export const BUNDLE_FORMAT = 2;
