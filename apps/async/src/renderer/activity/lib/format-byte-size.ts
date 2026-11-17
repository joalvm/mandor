/** Byte sizes in the dense log: exact bytes under 1 KB, one decimal beyond. */
export function formatByteSize(bytes: number): string {
    if (bytes < 1024) {
        return `${String(bytes)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
