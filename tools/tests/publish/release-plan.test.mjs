import { describe, expect, it } from 'vitest';

import { changesOf } from '../../publish/release-changes.mjs';
import { planOutputs, planRelease } from '../../publish/release-plan.mjs';
import { appNamed, parseReleaseTag } from '../../publish/release-tag.mjs';

const app = appNamed('request');

/**
 * A line of history, oldest first: each commit with the title the squash left, and the tags on it.
 * The changes between two commits are the ones after the first, up to the second, as git lists
 * them.
 */
function historyOf(commits) {
    const index = (sha) => commits.findIndex((commit) => commit.sha === sha);

    return {
        head: commits.at(-1)?.sha ?? '',
        releases: commits.flatMap(({ sha, tags = [] }) =>
            tags.map((tag) => ({ tag, sha, ...parseReleaseTag(tag) })),
        ),
        changesBetween: (from, to) =>
            changesOf(
                commits
                    .slice(from === undefined ? 0 : index(from) + 1, index(to) + 1)
                    .map((commit) => commit.subject)
                    .reverse(),
            ),
    };
}

function plan(channel, commits, forced = '') {
    return planRelease({ channel, app, forced, ...historyOf(commits) });
}

describe('a beta', () => {
    it('is the first beta of a minor when a feature came since the start', () => {
        const planned = plan('beta', [
            { sha: 'a', subject: 'docs: presenta Mandor' },
            { sha: 'b', subject: 'feat: publica el código (#1)' },
        ]);

        expect(planned).toMatchObject({
            tag: 'request-v0.1.0-beta.1',
            prerelease: true,
            sha: 'b',
            previous: undefined,
        });
        expect(planned.changes.map((change) => change.text)).toEqual(['publica el código']);
    });

    it('takes the next number of the stable it leads to, with the notes since the beta before', () => {
        const planned = plan('beta', [
            { sha: 'a', subject: 'feat: uno (#1)', tags: ['request-v0.1.0-beta.1'] },
            { sha: 'b', subject: 'fix: dos (#2)' },
        ]);

        expect(planned).toMatchObject({
            tag: 'request-v0.1.0-beta.2',
            previous: 'request-v0.1.0-beta.1',
        });
        expect(planned.changes.map((change) => change.text)).toEqual(['dos']);
    });

    it('aims at a patch after a stable when only fixes came, and at a minor once a feature does', () => {
        const fixes = [
            { sha: 'a', subject: 'feat: uno', tags: ['request-v0.1.0-beta.1', 'request-v0.1.0'] },
            { sha: 'b', subject: 'fix: dos' },
        ];

        expect(plan('beta', fixes).tag).toBe('request-v0.1.1-beta.1');
        expect(plan('beta', [...fixes, { sha: 'c', subject: 'feat: tres' }]).tag).toBe(
            'request-v0.2.0-beta.1',
        );
    });

    it('counts the changes of the app only: what the other app or the tooling changed is not news', () => {
        expect(() =>
            plan('beta', [
                { sha: 'a', subject: 'feat: uno', tags: ['request-v0.1.0-beta.1'] },
                { sha: 'b', subject: 'build(release): el workflow' },
            ]),
        ).toThrow('Nothing new for request since request-v0.1.0-beta.1.');
        expect(() => plan('beta', [{ sha: 'a', subject: 'docs: x' }])).toThrow(
            /Nothing new for request since its start/u,
        );
    });

    it('aims at the version a person forces, past the stable out already', () => {
        const history = [
            { sha: 'a', subject: 'feat: uno', tags: ['request-v0.3.0'] },
            { sha: 'b', subject: 'docs: x' },
        ];

        expect(plan('beta', history, '1.0.0').tag).toBe('request-v1.0.0-beta.1');
        expect(() => plan('beta', history, '0.3.0')).toThrow(/does not come after request-v0.3.0/u);
        expect(() => plan('beta', history, '1.0')).toThrow(/it reads <x\.y\.z>/u);
    });

    it('refuses a version that would come before one out already', () => {
        expect(() =>
            plan(
                'beta',
                [
                    { sha: 'a', subject: 'feat: uno', tags: ['request-v0.2.0-beta.1'] },
                    { sha: 'b', subject: 'fix: dos' },
                ],
                '0.1.0',
            ),
        ).toThrow(/would come before request-v0.2.0-beta.1/u);
    });
});

describe('a stable', () => {
    it('promotes the last beta: its version with no suffix, built from its commit', () => {
        const planned = plan('stable', [
            { sha: 'a', subject: 'feat: uno (#1)', tags: ['request-v0.1.0-beta.1'] },
            { sha: 'b', subject: 'fix: dos (#2)', tags: ['request-v0.1.0-beta.2'] },
            { sha: 'c', subject: 'feat: tres (#3)' },
        ]);

        expect(planned).toMatchObject({
            tag: 'request-v0.1.0',
            version: '0.1.0',
            prerelease: false,
            sha: 'b',
            previous: undefined,
        });
        expect(planned.changes.map((change) => change.text)).toEqual(['dos', 'uno']);
    });

    it('lists every change since the stable before, across the betas that led to it', () => {
        const planned = plan('stable', [
            { sha: 'a', subject: 'feat: uno', tags: ['request-v0.1.0-beta.1', 'request-v0.1.0'] },
            { sha: 'b', subject: 'fix: dos', tags: ['request-v0.1.1-beta.1'] },
            { sha: 'c', subject: 'fix: tres', tags: ['request-v0.1.1-beta.2'] },
        ]);

        expect(planned).toMatchObject({ tag: 'request-v0.1.1', previous: 'request-v0.1.0' });
        expect(planned.changes.map((change) => change.text)).toEqual(['tres', 'dos']);
    });

    it('refuses when no beta came after the last stable', () => {
        expect(() =>
            plan('stable', [
                {
                    sha: 'a',
                    subject: 'feat: uno',
                    tags: ['request-v0.1.0-beta.1', 'request-v0.1.0'],
                },
            ]),
        ).toThrow('No beta of request after request-v0.1.0 to promote.');
    });

    it('refuses a forced version: that goes on a beta', () => {
        expect(() =>
            plan(
                'stable',
                [{ sha: 'a', subject: 'feat', tags: ['request-v0.1.0-beta.1'] }],
                '1.0.0',
            ),
        ).toThrow(/force it on a beta/u);
    });
});

describe('what the workflow reads of a plan', () => {
    it('refuses a channel the updater does not follow', () => {
        expect(() => plan('nightly', [])).toThrow(/is no channel/u);
    });

    it('writes one key and value per line, with an empty start for a first release', () => {
        const planned = plan('beta', [{ sha: 'abc', subject: 'feat: uno' }]);

        expect(planOutputs(planned, app).split('\n')).toEqual([
            'tag=request-v0.1.0-beta.1',
            'version=0.1.0-beta.1',
            'prerelease=true',
            'sha=abc',
            'previous=',
            'app=sync',
            'product=Mandor Request',
            'feed=request-feed',
        ]);
    });
});
