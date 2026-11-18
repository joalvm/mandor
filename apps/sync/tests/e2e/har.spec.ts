import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import {
    createWorkspace,
    expectNoReport,
    openRequest,
    openWorkspacesPanel,
} from './support/exchange-flow.js';
import {
    applyImport,
    dropText,
    openImportDialog,
    previewImport,
    previewOf,
} from './support/import-flow.js';
import { launchSync } from './support/send-flow.js';
import { openSection } from './support/open-section.js';

// One app and one workspace run through every test: each one starts where the last one left.
test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-har-'));
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await openWorkspacesPanel(page, 'Personal');
    await createWorkspace(page, 'Recorded');
});

test.afterAll(async () => {
    await app.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

test('a recording enters as a folder per host and opens no report', async () => {
    await previewImport(page, 'Recorded', 'recorded.har');

    const hosts = ['api.example.test', 'cdn.example.test'];

    for (const host of hosts) {
        await expect(
            previewOf(page).getByRole('treeitem', { exact: true, name: host }),
        ).toBeVisible();
    }

    await applyImport(page);

    await expectNoReport(page);
});

test('the request that carried a credential keeps its header as it was recorded', async () => {
    await openRequest(page, 'api.example.test', /POST \/users/);
    await openSection(page, 'Headers');

    // The credential is the first row of the recording, so it is the first row of the request.
    await expect(page.getByRole('textbox', { exact: true, name: 'Key' }).first()).toHaveText(
        'Authorization',
    );
    await expect(page.getByRole('textbox', { exact: true, name: 'Value' }).first()).toHaveText(
        'Bearer abc.def.ghi',
    );
    await expect(page.getByRole('checkbox', { name: 'Send this entry' }).first()).toBeChecked();
});

test('a file no format reads is refused naming every format the app takes', async () => {
    await openImportDialog(page, 'Recorded');
    await dropText(page, { content: 'just words', name: 'notes.txt' });

    await expect(
        page
            .getByLabel('Notifications (F8)', { exact: true })
            .getByText(
                'Mandor does not read this file. It takes: OpenAPI, Postman, Insomnia, Bruno, HAR.',
                {
                    exact: true,
                },
            ),
    ).toBeVisible();
    await expect(previewOf(page)).toBeHidden();
});
