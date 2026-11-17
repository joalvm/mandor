import { describe, expect, it } from 'vitest';

import { isWebSocket } from '../../../src/bruno/import/is-websocket.js';
import { folderNode, requestNode, websocketNode } from '../support/trees.js';

describe('isWebSocket', () => {
    it('tells a WebSocket request from a folder and from an HTTP request', () => {
        expect(isWebSocket(websocketNode())).toBe(true);
        expect(isWebSocket(requestNode())).toBe(false);
        expect(isWebSocket(folderNode())).toBe(false);
    });
});
