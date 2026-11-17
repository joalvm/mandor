import { useNoticeFeed } from '../../hooks/useNoticeFeed.js';

/** Speaks what main raises on its own. Mounted once by the window, inside its toast provider. */
export function NoticeFeed() {
    useNoticeFeed();

    return null;
}
