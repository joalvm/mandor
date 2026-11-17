import { useState } from 'react';

import {
    defaultFormatOf,
    previewableOf,
    previewsFirst,
    type BodyFormat,
} from '../lib/body-formats.js';
import type { BodyKind } from '../lib/body-views.js';

/**
 * How the reader asked to see a body, over what the body is. Until they pick, a body opens on its
 * own format, drawn only when it is an image; a format picked takes it out of the drawing, since
 * it is that format they asked to read. A body that cannot be drawn never is, whatever was asked.
 */
export function useBodyShow(kind: BodyKind, laidOut: boolean) {
    const [chosen, setChosen] = useState<BodyFormat | null>(null);
    const [drawn, setDrawn] = useState<boolean | null>(null);
    const [wrap, setWrap] = useState(true);
    const previewable = previewableOf(kind, laidOut);

    return {
        format: chosen ?? defaultFormatOf(kind),
        preview: previewable && (drawn ?? previewsFirst(kind)),
        previewable,
        setFormat: (format: BodyFormat) => {
            setChosen(format);
            setDrawn(false);
        },
        setPreview: setDrawn,
        setWrap,
        wrap,
    };
}
