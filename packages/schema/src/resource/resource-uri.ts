import type { ResourceKind } from './resource-uri-syntax.js';

/**
 * What is being looked at, named the way disk names it. Identity is the path, never a UUID:
 * two tabs on the same file are two views of one resource, and that is what lets them share a
 * buffer. The canonical text is what `formatResourceUri` writes, so equality is `===`.
 */
export type ResourceUri = string;

/**
 * A resource URI taken apart. Three scopes, because three things outlive each other: the
 * window, which is there before any repo is open; the repo, which owns its settings; and the
 * workspace, which owns everything with a path.
 */
export type ResourceUriParts =
    | { readonly scope: 'app'; readonly name: string }
    | { readonly scope: 'settings'; readonly repo: string }
    | {
          readonly scope: 'workspace';
          readonly repo: string;
          readonly workspace: string;
          readonly kind: ResourceKind;
          readonly path: string;
      };
