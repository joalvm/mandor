import { describe, expect, it } from 'vitest';

import { bumpOf, changeOf, changesOf, releaseNotes } from '../../publish/release-changes.mjs';

describe('the change a commit makes to the app', () => {
    it('reads a feature, its text and the pull request the squash appended', () => {
        expect(changeOf('feat(sync): las cookies se editan por dominio (#14)')).toEqual({
            kind: 'feat',
            text: 'las cookies se editan por dominio',
            pr: '14',
        });
    });

    it('reads a fix with no scope and no pull request', () => {
        expect(changeOf('fix: un envío sale por su puerto')).toEqual({
            kind: 'fix',
            text: 'un envío sale por su puerto',
            pr: undefined,
        });
    });

    it('reads a dependency update as a change of the app it ships in', () => {
        expect(changeOf('build(deps): bump ws from 8.0.0 to 8.1.0 (#4)')?.kind).toBe('deps');
        expect(changeOf('build(deps-dev): bump eslint (#3)')?.kind).toBe('deps');
    });

    it.each([
        ['tooling', 'build(release): la beta se publica por tag (#15)'],
        ['a change of form', 'refactor: los tipos dicen lo que el código lee (#11)'],
        ['docs', 'docs: presenta Mandor'],
        ['tests', 'test(git): cubre el push'],
        ['a title with no type', 'Merge branch main'],
    ])('leaves out %s', (_name, subject) => {
        expect(changeOf(subject)).toBeUndefined();
    });

    it('keeps only the changes among a list of titles', () => {
        expect(changesOf(['docs: x', 'fix: y (#2)']).map((change) => change.text)).toEqual(['y']);
    });
});

describe('how far the changes move the version', () => {
    it('is a minor with a feature among them, a patch with only fixes or dependencies', () => {
        expect(bumpOf(changesOf(['fix: a', 'feat: b', 'build(deps): c']))).toBe('minor');
        expect(bumpOf(changesOf(['fix: a']))).toBe('patch');
        expect(bumpOf(changesOf(['build(deps): c']))).toBe('patch');
    });

    it('is nothing when nothing changed for the person who installs it', () => {
        expect(bumpOf([])).toBeUndefined();
    });
});

describe('the notes of a release', () => {
    const changes = changesOf([
        'fix: el envío dice por qué falla (#14)',
        'build(deps): bump ws from 8.0.0 to 8.1.0 (#4)',
        'feat(async): los ajustes se aplican (#13)',
    ]);

    it('groups the changes, features first, each one capitalized with its pull request', () => {
        const notes = releaseNotes({ changes, repository: 'joalvm/mandor', compare: undefined });

        expect(notes.split('\n').slice(0, 11)).toEqual([
            '## Novedades',
            '',
            '- Los ajustes se aplican (#13)',
            '',
            '## Correcciones',
            '',
            '- El envío dice por qué falla (#14)',
            '',
            '## Dependencias',
            '',
            '- Bump ws from 8.0.0 to 8.1.0 (#4)',
        ]);
    });

    it('says how to check where the files came from, since nothing is signed', () => {
        const notes = releaseNotes({
            changes: [],
            repository: 'joalvm/mandor',
            compare: undefined,
        });

        expect(notes).toContain('`gh attestation verify <archivo> --repo joalvm/mandor`');
        expect(notes).toContain('`SHA256SUMS`');
        expect(notes).not.toContain('##');
    });

    it('ends on the full comparison with the release before', () => {
        const compare = 'https://github.com/joalvm/mandor/compare/request-v0.1.0...request-v0.2.0';
        const notes = releaseNotes({ changes, repository: 'joalvm/mandor', compare });

        expect(notes.trimEnd().split('\n').at(-1)).toBe(`**Cambios:** ${compare}`);
    });
});
