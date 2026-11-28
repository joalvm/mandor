import { formatNumber } from '@mandor/i18n';

/**
 * Byte sizes in the dense log: exact bytes under 1 KB, one decimal beyond. The number is written
 * the way the language writes it; the unit is the symbol every language reads.
 */
export function formatByteSize(bytes: number, language: string): string {
    if (bytes < 1024) {
        return `${formatNumber(bytes, language)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${formatNumber(bytes / 1024, language, 1)} KB`;
    }

    return `${formatNumber(bytes / (1024 * 1024), language, 1)} MB`;
}
