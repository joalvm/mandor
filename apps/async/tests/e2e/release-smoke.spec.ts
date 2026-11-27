import { expect, test } from '@playwright/test';

import { releaseAgent } from '../../../../tools/workspace/installed-app.mjs';

const INSTALLERS = process.env['MANDOR_RELEASE_INSTALLERS'] ?? '';

// skip-policy: it installs what a release built, and only the release workflow has it.
test.skip(INSTALLERS === '', 'there is no release to install');

/**
 * Before a person approves a release of Mandor Realtime, the installer of this system installs,
 * opens on its first screen as the version the release names, and quits.
 */
test('the installer of the release opens as its version', async () => {
    const agent = await releaseAgent({
        installers: INSTALLERS,
        executable: 'mandor-realtime',
        name: 'realtime',
    });

    expect(agent).toContain(`/${process.env['MANDOR_RELEASE_VERSION'] ?? ''} `);
});
