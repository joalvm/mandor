import {
    OriginAzureIcon,
    OriginBitbucketIcon,
    OriginGithubIcon,
    OriginGitlabIcon,
    OriginLocalIcon,
    OriginRemoteIcon,
} from '@mandor/icons';
import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { originDisplayOf } from '../../src/lib/origin-display.js';

function remote(url: string) {
    return createOrigin({ id: 'team', name: 'Team', url });
}

describe('how an origin is drawn', () => {
    it('draws the origin that is always there with its own glyph and no host', () => {
        expect(originDisplayOf(createLocalOrigin('Local'))).toEqual({
            component: OriginLocalIcon,
            host: 'local',
            name: 'origin-local',
        });
    });

    it.each([
        ['https://github.com/team/api.git', 'github', 'origin-github', OriginGithubIcon],
        ['https://gitlab.com/team/api.git', 'gitlab', 'origin-gitlab', OriginGitlabIcon],
        [
            'https://bitbucket.org/team/api.git',
            'bitbucket',
            'origin-bitbucket',
            OriginBitbucketIcon,
        ],
        ['https://dev.azure.com/team/api', 'azure-devops', 'origin-azure', OriginAzureIcon],
        ['https://team.visualstudio.com/api', 'azure-devops', 'origin-azure', OriginAzureIcon],
        ['git@github.com:team/api.git', 'github', 'origin-github', OriginGithubIcon],
    ])('draws %s with the glyph of its host', (url, host, name, component) => {
        expect(originDisplayOf(remote(url))).toEqual({ component, host, name });
    });

    it('draws a host nobody knows as a generic remote', () => {
        expect(originDisplayOf(remote('https://git.example.com/team/api.git'))).toEqual({
            component: OriginRemoteIcon,
            host: 'generic',
            name: 'origin-remote',
        });
    });
});
