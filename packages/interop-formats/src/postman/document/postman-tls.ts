import type { TlsVersion } from '@mandor/schema';

/** The versions Postman can switch off, oldest first, under the names Mandor gives them. */
export const POSTMAN_TLS: readonly (readonly [string, Exclude<TlsVersion, 'auto'>])[] = [
    ['TLSv1', 'TLSv1'],
    ['TLSv1_1', 'TLSv1.1'],
    ['TLSv1_2', 'TLSv1.2'],
    ['TLSv1_3', 'TLSv1.3'],
];
