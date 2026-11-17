import {
    formatBytes,
    formatDuration,
    httpVersionLabel,
} from '../../../response/lib/format-response.js';
import type { FactKey } from './response-diff.js';

/** The version a response was read over: two, or the one every server speaks. */
function versionOf(value: number | string): '1.1' | '2' {
    if (value === '2') {
        return '2';
    }

    return '1.1';
}

const TEXT_OF_FACT: Readonly<Record<FactKey, (value: number | string) => string>> = {
    bodyBytes: (value) => formatBytes(Number(value)),
    status: String,
    totalMs: (value) => formatDuration(Number(value)),
    version: (value) => httpVersionLabel(versionOf(value)),
};

/** A fact of a response as the person reads it: the unit it is measured in goes with the number. */
export function factText(key: FactKey, value: number | string): string {
    return TEXT_OF_FACT[key](value);
}
