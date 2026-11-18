import type { StartHostConfig } from '@mandor/host';
import {
    mandorFormatFor,
    asyncapiFormat,
    brunoFormat,
    insomniaFormat,
} from '@mandor/interop-formats';

/**
 * The documents Mandor Realtime reads and writes. Insomnia and Bruno carry WebSocket requests, so
 * they come in as whole workspaces: Realtime keeps the connections and leaves the HTTP requests
 * out, with their reason. Postman has no WebSocket, so it never comes here.
 */
export const ASYNC_FORMATS: StartHostConfig['formats'] = [
    asyncapiFormat,
    { ...insomniaFormat, scopes: ['workspace'] },
    { ...brunoFormat, scopes: ['workspace'] },
    mandorFormatFor('async'),
];
