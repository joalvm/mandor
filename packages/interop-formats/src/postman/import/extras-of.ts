/**
 * The keys of a Postman object the mapper did not consume, as they came. Keys that start with
 * an underscore are Postman's own bookkeeping (`_postman_id`, `_exporter_id`) and go nowhere.
 */
export function extrasOf(
    object: Readonly<Record<string, unknown>>,
    consumed: readonly string[],
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(object).filter(([key]) => !key.startsWith('_') && !consumed.includes(key)),
    );
}
