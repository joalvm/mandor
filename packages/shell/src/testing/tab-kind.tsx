import { createI18n, DEFAULT_LANGUAGE, type Language, type Translator } from '@mandor/i18n';

import { useTabKind } from '../hooks/useTabKind.js';
import { TabProvider } from '../tab/tab-context.js';
import {
    declareTabKind,
    declareTabPart,
    type TabKindSpec,
    type TabPart,
} from '../tab/tab-kind-registry.js';

/**
 * Declares a whole kind at once, for a test that asks the window about tabs without drawing the
 * tree an app writes. What it shows goes as elements, the same ones a `TabKind` takes as
 * children; production declares through the component, never through this.
 */
export function declareTabKindSpec({ body, indicator, status, ...logic }: TabKindSpec): () => void {
    const stops = [
        declareTabKind(logic),
        declareTabPart(logic.id, 'body', body),
        declareTabPart(logic.id, 'indicator', indicator),
        declareTabPart(logic.id, 'status', status),
    ];

    return () => {
        for (const stop of stops.toReversed()) {
            stop();
        }
    };
}

/**
 * The words a kind says its title with, in one language, for a test that reads a title without
 * drawing it; a drawn tab says it in the language of its window.
 */
export function translatorIn(language: Language = DEFAULT_LANGUAGE): Translator {
    const { t } = createI18n(language);

    return (key, values) => t(key as never, values ?? {});
}

type DrawnTabPartProps = {
    kind: string;
    /** The body unless said otherwise: it is what most tests look at. */
    part?: TabPart;
    resource: string;
    tabId: string;
};

/**
 * One part of a declared kind, drawn inside the tab it would belong to: what the group or the
 * strip would put on screen for that tab, without the group or the strip around it.
 */
export function DrawnTabPart({ kind, part = 'body', resource, tabId }: DrawnTabPartProps) {
    const spec = useTabKind(kind);

    return <TabProvider value={{ resource, tabId }}>{spec?.[part]}</TabProvider>;
}
