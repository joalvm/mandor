import { renderHook } from '@testing-library/react';
import type { ErrorCode } from '@mandor/ipc';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { NAMESPACES } from '../src/generated/resources.js';
import { createI18n, LANGUAGE_CODES, MessagesProvider, useMessages } from '../src/index.js';

const ERROR_CODES = [
    'fs-read',
    'fs-write',
    'git-missing',
    'git-not-a-repo',
    'git-failed',
    'origin-foreign',
    'origin-unreachable',
    'ws-open-failed',
    'ws-send-failed',
    'request-failed',
    'request-aborted',
    'request-timeout',
    'request-tls',
    'request-http-version',
    'request-unreachable',
    'request-redirect',
    'request-file',
    'graphql-introspection',
    'auth-token-failed',
    'auth-cancelled',
    'name-taken',
    'conflict-open',
    'bad-request',
    'unknown',
] as const satisfies readonly ErrorCode[];

describe('compiled messages', () => {
    it('uses the English branch when preferences omit a language', () => {
        function Wrapper({ children }: { children: ReactNode }) {
            return <MessagesProvider preferences={{}}>{children}</MessagesProvider>;
        }

        const { result } = renderHook(() => useMessages('shell'), { wrapper: Wrapper });

        expect(result.current('resizeSidebar')).toBe('Resize sidebar');
    });

    it('uses the Spanish branch selected by preferences', () => {
        function Wrapper({ children }: { children: ReactNode }) {
            return <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>;
        }

        const { result } = renderHook(() => useMessages('shell'), { wrapper: Wrapper });

        expect(result.current('resizeSidebar')).toBe('Redimensionar barra lateral');
    });

    it('discovers every language folder and namespace without a source registry', () => {
        expect(LANGUAGE_CODES).toEqual(['en', 'es']);
        expect(NAMESPACES).toEqual([
            'async',
            'auth',
            'choice',
            'collections',
            'commands',
            'conflicts',
            'connections',
            'cookies',
            'docs',
            'editor',
            'environment',
            'errors',
            'export',
            'faults',
            'history',
            'import',
            'menu',
            'messages',
            'notices',
            'origins',
            'preferences',
            'requests',
            'scripts',
            'shell',
            'sync',
            'updates',
            'workspace',
        ]);
    });

    it('keeps a translated message for every IPC error code in every language', () => {
        for (const language of LANGUAGE_CODES) {
            const i18n = createI18n(language);

            for (const code of ERROR_CODES) {
                expect(i18n.t(code, { ns: 'errors' })).not.toBe(code);
            }
        }
    });
});
