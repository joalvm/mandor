import { GitError } from '@mandor/git';
import { ImportOtherAppError } from '@mandor/interop-core';
import { FormatVersionError, IdError } from '@mandor/schema';
import { FileReadError } from '@mandor/store-fs';
import { UnsafeAuthorityError } from '@mandor/vars';
import { describe, expect, it } from 'vitest';

import { AuthTokenError } from '../../src/auth/auth-token-error.js';
import { ConflictOpenError } from '../../src/conflict/conflict-open-error.js';
import { failureOf } from '../../src/ipc/failure-of.js';
import { NetworkFileError } from '../../src/network/network-file-error.js';
import { UnsupportedProxyError } from '../../src/network/unsupported-proxy-error.js';
import { OriginForeignError } from '../../src/origin/origin-foreign-error.js';
import { OriginUnreachableError } from '../../src/origin/origin-unreachable-error.js';

describe('the refusal a thrown error becomes', () => {
    /** The code git decided on is the code the interface decides on. Nothing is re-guessed. */
    it('keeps the code of a git refusal', () => {
        const failure = failureOf(new GitError('git-not-a-repo', 'fatal: not a git repository'));

        expect(failure.error.code).toBe('git-not-a-repo');
    });

    it('calls an unreadable file a read failure', () => {
        const failure = failureOf(new FileReadError({ path: 'mandor.yaml', message: 'broken' }));

        expect(failure.error.code).toBe('fs-read');
    });

    /** An id the domain refuses came from the renderer, so it is the request that was bad. */
    it('calls a rejected id a bad request', () => {
        expect(failureOf(new IdError('..')).error.code).toBe('bad-request');
    });

    /** A variable in the host of a url is the renderer's doing, not a fault of the machine. */
    it('calls a variable in the authority of a url a bad request', () => {
        const failure = failureOf(new UnsafeAuthorityError('token'));

        expect(failure.error.code).toBe('bad-request');
    });

    /** The interface has a text for each way a token can fail, so the code travels as it is. */
    it('keeps the code of a token that did not come', () => {
        for (const code of ['auth-token-failed', 'auth-cancelled'] as const) {
            expect(failureOf(new AuthTokenError(code, 'detail')).error.code).toBe(code);
        }
    });

    it('tells an address with foreign work from one that did not answer', () => {
        const foreign = failureOf(new OriginForeignError('https://git.example.test/a.git'));
        const silent = failureOf(new OriginUnreachableError('could not read'));

        expect(foreign.error.code).toBe('origin-foreign');
        expect(silent.error.code).toBe('origin-unreachable');
    });

    it('tells a clash closed with questions left from any other refusal', () => {
        expect(failureOf(new ConflictOpenError('abc', 2)).error.code).toBe('conflict-open');
    });

    /** A certificate gone from disk is not a broken workspace file: the settings name it. */
    it('tells a certificate of the network settings from any unreadable file', () => {
        expect(failureOf(new NetworkFileError('ca.pem', new Error('ENOENT'))).error.code).toBe(
            'network-file',
        );
    });

    it('names a proxy of the system no transport speaks', () => {
        expect(failureOf(new UnsupportedProxyError('QUIC')).error.code).toBe('network-proxy');
    });

    it('tells a file of a newer build by its own code', () => {
        expect(failureOf(new FormatVersionError(9, 2)).error.code).toBe('format-newer');
    });

    it('tells a document of the other app by its own code', () => {
        expect(failureOf(new ImportOtherAppError('async', 'sync')).error.code).toBe(
            'import-other-app',
        );
    });

    it('calls anything it does not recognise unknown', () => {
        expect(failureOf(new Error('the disk went away')).error.code).toBe('unknown');
    });

    /** Nothing throws across the bridge, so every refusal is data with `ok` already false. */
    it('always answers with a refusal', () => {
        expect(failureOf('a string nobody expected').ok).toBe(false);
    });
});
