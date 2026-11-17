import type { ReactNode } from 'react';

export type DocImageProps = {
    alt?: string | undefined;
    src?: string | undefined;
};

/**
 * An image of a doc, drawn only when it came with the repo. When the filter emptied its source
 * there is nothing left to load, and what stands in its place is the text that described it: the
 * reader learns that something was meant to be there, instead of finding a broken frame.
 */
export function DocImage({ alt, src }: DocImageProps): ReactNode {
    if (src === undefined || src === '') {
        return <span data-part="doc-image">{alt}</span>;
    }

    return <img alt={alt ?? ''} data-part="doc-image" src={src} />;
}
