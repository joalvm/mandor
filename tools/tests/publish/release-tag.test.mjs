import { describe, expect, it } from 'vitest';

import { parseReleaseTag, previousTag, releaseOutputs } from '../../publish/release-tag.mjs';

describe('what a release tag names', () => {
    it('reads the app, the version and the feed of a stable', () => {
        expect(parseReleaseTag('request-v1.2.3')).toEqual({
            app: 'sync',
            product: 'Mandor Request',
            version: '1.2.3',
            prerelease: false,
            feed: 'request-feed',
        });
    });

    it('marks a beta as a prerelease, on the feed of its own app', () => {
        expect(parseReleaseTag('realtime-v0.1.0-beta.1')).toEqual({
            app: 'async',
            product: 'Mandor Realtime',
            version: '0.1.0-beta.1',
            prerelease: true,
            feed: 'realtime-feed',
        });
    });

    it.each([
        ['an app that does not exist', 'mcp-v1.0.0'],
        ['a version with no app', 'v1.0.0'],
        ['a prerelease the updater does not follow', 'request-v1.0.0-rc.1'],
        ['a beta with no number', 'request-v1.0.0-beta'],
        ['a number with a leading zero', 'request-v1.02.0'],
        ['a version cut short', 'request-v1.0'],
        ['the feed of an app', 'request-feed'],
        ['the folder of an app, which a person never sees', 'sync-v1.0.0'],
    ])('refuses %s', (_name, tag) => {
        expect(() => parseReleaseTag(tag)).toThrow(/<realtime\|request>-v<x\.y\.z>\[-beta\.<n>\]/u);
    });
});

describe('the release the notes start from', () => {
    const tags = [
        'request-v0.1.0-beta.1',
        'request-v0.1.0-beta.2',
        'request-v0.1.0',
        'request-v0.2.0-beta.1',
        'realtime-v0.3.0',
        'request-feed',
        'unrelated',
    ];

    it('is the newest earlier release of the same app for a beta', () => {
        expect(previousTag('request-v0.2.0-beta.2', tags)).toBe('request-v0.2.0-beta.1');
        expect(previousTag('request-v0.1.0-beta.3', tags)).toBe('request-v0.1.0-beta.2');
    });

    it('is the previous stable for a stable, past the betas that led to it', () => {
        expect(previousTag('request-v0.2.0', tags)).toBe('request-v0.1.0');
    });

    it('compares numbers as numbers, not as text', () => {
        expect(previousTag('request-v0.10.0', ['request-v0.9.0', 'request-v0.2.0'])).toBe(
            'request-v0.9.0',
        );
        expect(previousTag('request-v1.0.0-beta.10', ['request-v1.0.0-beta.9'])).toBe(
            'request-v1.0.0-beta.9',
        );
    });

    it('is none for the first release of an app, whatever the other app released', () => {
        expect(previousTag('realtime-v0.1.0-beta.1', tags)).toBeUndefined();
        expect(previousTag('request-v0.1.0-beta.1', tags)).toBeUndefined();
    });
});

describe('what the workflow reads of a tag', () => {
    it('writes one key and value per line, and an empty start for a first release', () => {
        expect(releaseOutputs('request-v0.1.0-beta.1', []).split('\n')).toEqual([
            'app=sync',
            'product=Mandor Request',
            'version=0.1.0-beta.1',
            'prerelease=true',
            'feed=request-feed',
            'previous=',
        ]);
    });
});
