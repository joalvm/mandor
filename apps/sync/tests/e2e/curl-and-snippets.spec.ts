import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type ElectronApplication, type Page } from '@playwright/test';

import { startLocalHttpServer, type LocalHttpServer } from './support/local-http-server.js';
import { createEnvironment, createRequest, launchSync, responseOf } from './support/send-flow.js';
import { writeNewRow } from './support/variable-row.js';
import { openSection } from '../../../../packages/ui/tests/support/open-section.js';

/**
 * No secret variable takes part, on purpose: declaring one asks the keychain of the system to keep
 * the value, and the container has none. That a secret leaves a snippet as the marker is proven
 * where `readSecret` is a dependency (`codegen-secrets.test.ts`). What this proves, end to end, is
 * the other half of the redaction: a credential typed by hand under a header that carries one.
 */
const TRACE = 'plain-trace-7';
const CREDENTIAL = 'e2e-secret-token-42';

test.describe.configure({ mode: 'serial' });

let root = '';
let app: ElectronApplication;
let page: Page;
let server: LocalHttpServer;

test.beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-sync-curl-'));
    server = await startLocalHttpServer();
    await mkdir(join(root, 'origins'), { recursive: true });
    app = await launchSync(root);
    page = await app.firstWindow();

    await expect(page.getByRole('button', { name: 'Personal', exact: true })).toBeVisible();
    await createEnvironment(page, server.origin, { token: TRACE });
    await createRequest(page);
});

test.afterAll(async () => {
    await app.close();
    await server.close();
    await rm(root, { force: true, maxRetries: 10, recursive: true });
});

/** A paste as the field receives it, with the text on the clipboard of the event. */
async function paste(text: string): Promise<void> {
    // Nobody pastes into a field without standing in it, and a focused line guards its own text.
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.getByRole('textbox', { name: 'URL' }).evaluate((field, value) => {
        const clipboardData = new DataTransfer();

        clipboardData.setData('text/plain', value);
        field.dispatchEvent(
            new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
        );
    }, text);
}

function clipboardText(): Promise<string> {
    return app.evaluate(({ clipboard }) => clipboard.readText());
}

async function copyCode(): Promise<void> {
    await page
        .getByRole('dialog', { name: 'Request as code' })
        .getByRole('button', { name: 'Copy' })
        .click();
}

test('pasting a curl fills the request, with the credential as it was written', async () => {
    await paste(
        `curl '${server.origin}/echo?x=1' -X POST -H 'Content-Type: application/json' ` +
            '-H \'Authorization: Bearer abc.def.ghi\' --data-raw \'{"name":"ana"}\'',
    );

    // A toast is also read out in a live region, so its text can be found twice.
    await expect(page.getByText('Request filled from curl').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Method / })).toHaveText('POST');
    // The address is one field: the query the command carried stays written in it.
    await expect(page.getByRole('textbox', { name: 'URL' })).toHaveText(
        `${server.origin}/echo?x=1`,
    );

    await openSection(page, 'Params');
    await expect(page.getByRole('textbox', { exact: true, name: 'Key' }).first()).toHaveText('x');
    await expect(page.getByRole('textbox', { exact: true, name: 'Value' }).first()).toHaveText('1');

    await openSection(page, 'Headers');

    const credential = page.locator('[data-part="key-value-row"]').filter({
        hasText: 'Authorization',
    });

    await expect(credential.getByRole('textbox', { name: 'Value' })).toHaveText(
        'Bearer abc.def.ghi',
    );
    await expect(credential.getByRole('checkbox', { name: 'Send this entry' })).toBeChecked();

    await openSection(page, 'Body');
    await expect(page.locator('[data-part="code-editor"] .view-lines').first()).toContainText(
        '"name"',
    );
});

test('the filled request goes out as the command said', async () => {
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');

    expect(server.echoes).toHaveLength(1);
    expect(server.echoes[0]).toMatchObject({ body: '{"name":"ana"}', url: '/echo?x=1' });
    expect(server.echoes[0]?.headers.authorization).toBe('Bearer abc.def.ghi');
});

test('a shell variable in the command enters as a variable of the environment', async () => {
    await paste('curl "{{baseUrl}}/echo" -H "X-Trace: $token"');
    await expect(page.getByRole('textbox', { name: 'URL' })).toHaveText('{{baseUrl}}/echo');

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(responseOf(page).locator('[data-part="response-status"]')).toHaveText('200');

    expect(server.echoes).toHaveLength(2);
    expect(server.echoes[1]?.headers['x-trace']).toBe(TRACE);
});

test('the code of the request shows a credential typed by hand as it was written', async () => {
    // The response has a Headers tab of its own once something was sent: the request's is first.
    await openSection(page, 'Headers');
    await writeNewRow(
        page.getByRole('tabpanel', { name: 'Headers' }).first(),
        'Authorization',
        `Bearer ${CREDENTIAL}`,
    );

    await page.getByRole('button', { name: 'Code' }).click();
    await expect(page.getByRole('dialog', { name: 'Request as code' })).toContainText('X-Trace');
    await copyCode();

    await expect.poll(clipboardText).toContain('X-Trace');
    expect(await clipboardText()).toContain(CREDENTIAL);
});

test('the same request comes out in another language', async () => {
    const dialog = page.getByRole('dialog', { name: 'Request as code' });

    await dialog.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: 'Python requests' }).click();
    await expect(dialog).toContainText('requests.');
    await copyCode();

    await expect.poll(clipboardText).toContain('requests.');
    expect(await clipboardText()).toContain(CREDENTIAL);

    await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
});

test('a curl with no address says so and leaves the request as it was', async () => {
    await paste('curl');

    await expect(page.getByText('The curl command has no URL.').first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'URL' })).toHaveText('{{baseUrl}}/echo');
});
