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

type FactText = (value: number | string, language: string) => string;

const TEXT_OF_FACT: Readonly<Record<FactKey, FactText>> = {
    bodyBytes: (value, language) => formatBytes(Number(value), language),
    status: String,
    totalMs: (value, language) => formatDuration(Number(value), language),
    version: (value) => httpVersionLabel(versionOf(value)),
};

/** A fact of a response as the person reads it: the unit it is measured in goes with the number. */
export function factText(key: FactKey, value: number | string, language: string): string {
    return TEXT_OF_FACT[key](value, language);
}
