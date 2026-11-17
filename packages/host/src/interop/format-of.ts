import type { InteropFormat } from '@mandor/interop-core';
import { failure, success, type Result } from '@mandor/ipc';

/**
 * The format a request names, among the ones the app listed. A format the app did not list is
 * one this process cannot read or write: the refusal says which, and nothing falls back to
 * another format.
 */
export function formatOf(formats: readonly InteropFormat[], id: string): Result<InteropFormat> {
    const format = formats.find((listed) => listed.id === id);

    return format === undefined
        ? failure('bad-request', `no format is registered as ${id}`)
        : success(format);
}
