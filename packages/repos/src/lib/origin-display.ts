import {
    type IconComponent,
    type IconName,
    OriginAzureIcon,
    OriginBitbucketIcon,
    OriginGithubIcon,
    OriginGitlabIcon,
    OriginLocalIcon,
    OriginRemoteIcon,
} from '@mandor/icons';
import { originHostOf, type Origin, type OriginHost } from '@mandor/schema';

/**
 * How an origin is drawn. The icon comes from this table; the color comes from the `data-host`
 * attribute, resolved by the closed table of host colors in the stylesheet.
 */
export type OriginDisplay = {
    component: IconComponent;
    host: OriginHost | 'local';
    name: IconName;
};

const HOST_ICONS: Readonly<Record<OriginHost, { component: IconComponent; name: IconName }>> = {
    github: { component: OriginGithubIcon, name: 'origin-github' },
    gitlab: { component: OriginGitlabIcon, name: 'origin-gitlab' },
    bitbucket: { component: OriginBitbucketIcon, name: 'origin-bitbucket' },
    'azure-devops': { component: OriginAzureIcon, name: 'origin-azure' },
    generic: { component: OriginRemoteIcon, name: 'origin-remote' },
};

/** The glyph and the host of an origin, for wherever the interface names it. */
export function originDisplayOf(origin: Origin): OriginDisplay {
    if (origin.kind === 'local') {
        return { component: OriginLocalIcon, host: 'local', name: 'origin-local' };
    }

    const host = originHostOf(origin.url);

    return { component: HOST_ICONS[host].component, host, name: HOST_ICONS[host].name };
}
