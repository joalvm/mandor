import { describe, expect, it } from 'vitest';

import {
    assertKindPart,
    assertNamePart,
    assertPathSegment,
    FORBIDDEN_IN_PATH,
    resourcePathSegments,
} from '../../src/resource/resource-part.js';
import { ResourceUriError } from '../../src/resource/resource-uri-error.js';

function reasonOf(attempt: () => unknown): string | undefined {
    try {
        attempt();
    } catch (error) {
        return error instanceof ResourceUriError ? error.reason : 'not-a-resource-uri-error';
    }

    return undefined;
}

describe('assertNamePart', () => {
    it('lets one id segment through', () => {
        expect(
            reasonOf(() => {
                assertNamePart('mi-repo', 'repo');
            }),
        ).toBeUndefined();
    });

    it('throws the reason it was asked to, for a value that is not an id segment', () => {
        expect(
            reasonOf(() => {
                assertNamePart('Mi Repo', 'repo');
            }),
        ).toBe('repo');
        expect(
            reasonOf(() => {
                assertNamePart('a/b', 'workspace');
            }),
        ).toBe('workspace');
        expect(
            reasonOf(() => {
                assertNamePart('', 'path');
            }),
        ).toBe('path');
    });
});

describe('assertKindPart', () => {
    it.each(['doc', 'item', 'folder', 'loose', 'environment'])('lets %s through', (kind) => {
        expect(
            reasonOf(() => {
                assertKindPart(kind);
            }),
        ).toBeUndefined();
    });

    it('refuses a kind Mandor does not have', () => {
        expect(
            reasonOf(() => {
                assertKindPart('video');
            }),
        ).toBe('kind');
        expect(
            reasonOf(() => {
                assertKindPart('Doc');
            }),
        ).toBe('kind');
    });
});

describe('assertPathSegment', () => {
    it('lets a file name with spaces and accents through', () => {
        expect(
            reasonOf(() => {
                assertPathSegment('Guía de inicio.md');
            }),
        ).toBeUndefined();
    });

    it.each(['', '.', '..', 'a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a|b', 'a\u0000b'])(
        'refuses %j as a path segment',
        (segment) => {
            expect(
                reasonOf(() => {
                    assertPathSegment(segment);
                }),
            ).toBe('path');
        },
    );

    it('refuses a segment longer than a file name can be', () => {
        expect(
            reasonOf(() => {
                assertPathSegment('a'.repeat(256));
            }),
        ).toBe('path');
        expect(
            reasonOf(() => {
                assertPathSegment('a'.repeat(255));
            }),
        ).toBeUndefined();
    });
});

describe('resourcePathSegments', () => {
    it('splits on the slash of the URI', () => {
        expect(resourcePathSegments('guias/inicio.md')).toEqual(['guias', 'inicio.md']);
    });

    it('reads the backslash of a disk path on Windows as a separator too', () => {
        expect(resourcePathSegments('guias\\inicio.md')).toEqual(['guias', 'inicio.md']);
    });

    it('refuses a path with an empty, a dot or a dot-dot segment anywhere in it', () => {
        expect(reasonOf(() => resourcePathSegments('a//b'))).toBe('path');
        expect(reasonOf(() => resourcePathSegments('a/./b'))).toBe('path');
        expect(reasonOf(() => resourcePathSegments('a/../b'))).toBe('path');
        expect(reasonOf(() => resourcePathSegments('a\\..\\b'))).toBe('path');
    });
});

describe('FORBIDDEN_IN_PATH', () => {
    it('matches the characters three filesystems refuse', () => {
        for (const character of ['"', '*', '/', ':', '<', '>', '?', '\\', '|', '\u0007']) {
            expect(FORBIDDEN_IN_PATH.test(character)).toBe(true);
        }
    });

    it('lets everything else a person names a file with through', () => {
        expect(FORBIDDEN_IN_PATH.test('Notas de la API (v2) - ñ.md')).toBe(false);
    });
});
