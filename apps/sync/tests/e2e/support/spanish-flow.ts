// The doors of the window driven the way a Spanish speaker drives them: a workspace, a request
// in the tree, and the four fields of the request the road of two machines writes and reads back.

import { expect, type Page } from '@playwright/test';

import { editorLines } from '../../../../../packages/ui/tests/support/editor-lines.js';

import { saveRequest } from './send-flow.js';
import { writeNewRow, type RowLabels } from './variable-row.js';
import { openSection } from '../../../../../packages/ui/tests/support/open-section.js';

const SPANISH_ROW: RowLabels = { key: 'Clave', value: 'Valor' };

/** The language is the reader's choice, made in the settings and kept by the window. */
export async function speakSpanish(page: Page): Promise<void> {
    await page.getByRole('button', { exact: true, name: 'Settings' }).click();
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: 'Spanish' }).click();
    // The list fades out after the choice and holds the keys while it does: Escape is for the
    // settings once it is gone.
    await expect(page.locator('[data-part="select-content"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { exact: true, name: 'Configuración' })).toBeVisible();
}

/** A workspace made from the panel the menu of the title row opens, left as the one in use. */
export async function createWorkspaceIn(page: Page, from: string, name: string): Promise<void> {
    await page.getByRole('button', { exact: true, name: from }).click();
    await page.getByRole('menuitem', { name: 'Administrar workspaces' }).click();
    await page.getByRole('button', { name: 'Nuevo workspace' }).first().click();

    const field = page.getByRole('textbox', { name: 'Nombre del workspace' });

    await field.click();
    await field.pressSequentially(name);
    await page.getByRole('button', { exact: true, name: 'Crear' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { exact: true, name })).toBeVisible();
}

/**
 * One request, made the way the user makes it: a folder, then the entry in it. The entry is born
 * under its word with its tab open and the URL in focus, so the name is changed from its row.
 */
export async function createNamedRequest(page: Page, folder: string, name: string): Promise<void> {
    await page.getByRole('button', { name: 'Nueva colección' }).click();
    await page.getByRole('textbox', { name: 'Nombre nuevo' }).fill(folder);
    await page.getByRole('textbox', { name: 'Nombre nuevo' }).press('Enter');

    await page
        .getByRole('treeitem', { name: folder })
        .getByRole('button', { name: 'Opciones de la fila' })
        .click();
    await page.getByRole('menuitem', { name: 'Nuevo request' }).click();
    await expect(page.getByRole('textbox', { name: 'URL' })).toBeFocused();

    await page
        .getByRole('treeitem', { exact: true, name: 'Nuevo request' })
        .getByRole('button', { name: 'Opciones de la fila' })
        .click();
    await page.getByRole('menuitem', { exact: true, name: 'Renombrar' }).click();

    const field = page.getByRole('textbox', { name: 'Nombre nuevo' });

    await field.fill(name);
    await field.press('Enter');
    await expect(page.getByRole('tab', { name })).toBeVisible();
}

/** Opens a request that came with the copy of the origin: the folder opens, then the entry. */
export async function openNamedRequest(page: Page, folder: string, name: string): Promise<void> {
    const parent = page.getByRole('treeitem', { name: folder });

    await parent.click();
    await parent.press('ArrowRight');
    await page.getByRole('treeitem', { name }).click();
    await expect(page.getByRole('tab', { name })).toBeVisible();
}

export type RequestFields = {
    body: string;
    header: [string, string];
    url: string;
};

/** The destination, the header and the JSON body of the request in front, written over nothing. */
export async function writeFields(page: Page, fields: RequestFields): Promise<void> {
    await writeUrl(page, fields.url);

    await openSection(page, 'Headers');
    await writeNewRow(
        page.getByRole('tabpanel', { name: 'Headers' }).first(),
        fields.header[0],
        fields.header[1],
        SPANISH_ROW,
    );

    await openSection(page, 'Body');
    await page.getByRole('combobox', { name: 'Tipo de body' }).click();
    await page.getByRole('option', { name: 'JSON' }).click();
    await writeBody(page, fields.body);
    await saveRequest(page);
}

/** The destination, written over what the field had, and the request saved with it. */
export async function writeUrl(page: Page, url: string): Promise<void> {
    await page.getByRole('textbox', { name: 'URL' }).click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText(url);
    await page.keyboard.press('ControlOrMeta+s');
}

/** The body editor, its text replaced whole. */
export async function writeBody(page: Page, body: string): Promise<void> {
    await expect(page.locator('[data-part="code-editor"]')).toBeVisible();
    await editorLines(page, 'code-editor').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(body);
}

/** The value of the header, replaced in the row that already has it. */
export async function writeHeaderValue(page: Page, value: string): Promise<void> {
    await openSection(page, 'Headers');

    const field = page.getByRole('textbox', { exact: true, name: 'Valor' }).first();

    await field.click();
    await field.press('ControlOrMeta+a');
    await field.pressSequentially(value);
}

/** What the request in front says in its four fields, read the way a user reads them. */
export async function expectFields(page: Page, fields: RequestFields): Promise<void> {
    await expect(page.getByRole('textbox', { name: 'URL' })).toContainText(fields.url);

    await openSection(page, 'Headers');
    await expect(page.getByRole('textbox', { exact: true, name: 'Clave' }).first()).toContainText(
        fields.header[0],
    );
    await expect(page.getByRole('textbox', { exact: true, name: 'Valor' }).first()).toContainText(
        fields.header[1],
    );

    await openSection(page, 'Body');
    await expect(page.locator('[data-part="code-editor"] .view-lines')).toContainText(fields.body);
}
