import type { InteropParameter } from '@mandor/interop-core';

import type { PostmanRequest } from '../document/postman-collection-schema.js';

/** The headers of a request as parameters; a row with no name is not a header. */
export function headersOf(request: PostmanRequest): InteropParameter[] {
    return (request.header ?? []).flatMap((row) => {
        if (row.key === undefined || row.key === null || row.key.trim() === '') {
            return [];
        }

        return [
            {
                name: row.key,
                in: 'header',
                required: false,
                enabled: row.disabled !== true,
                value: row.value ?? '',
            },
        ];
    });
}
