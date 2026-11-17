import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
    createRendererProtocol,
    registerRendererScheme,
} from '../../src/window/renderer-protocol.js';

describe('renderer protocol', () => {
    it('registers a standard secure scheme before Electron is ready', () => {
        const registerSchemesAsPrivileged = vi.fn();

        registerRendererScheme({ registerSchemesAsPrivileged });

        expect(registerSchemesAsPrivileged).toHaveBeenCalledWith([
            {
                scheme: 'mandor',
                privileges: {
                    codeCache: true,
                    secure: true,
                    standard: true,
                    supportFetchAPI: true,
                },
            },
        ]);
    });

    it('serves only files below the packaged renderer root', () => {
        const root = resolve('Mandor Realtime', 'resources', 'app.asar', 'out', 'renderer');
        const source = pathToFileURL(resolve(root, 'index.html')).toString();
        const renderer = createRendererProtocol(source);

        expect(renderer.entryUrl).toBe('mandor://app/index.html');
        expect(renderer.fileUrl?.('mandor://app/assets/index.js')).toBe(
            pathToFileURL(resolve(root, 'assets', 'index.js')).toString(),
        );
        expect(renderer.fileUrl?.('mandor://other/index.html')).toBeNull();
        expect(renderer.fileUrl?.('mandor://app/../../secret.txt')).toBeNull();
    });

    it('leaves a development URL untouched', () => {
        const entryUrl = 'http://127.0.0.1:5173';

        expect(createRendererProtocol(entryUrl)).toEqual({ entryUrl });
    });
});
