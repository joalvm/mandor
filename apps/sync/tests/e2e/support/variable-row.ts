import { expect, type Locator } from '@playwright/test';

/**
 * The row of a variable in a table of variables, found by the key it is written under.
 * The key is matched whole: a value that names the variable, like `{{port}}`, is not its row.
 * The key is looked for from the page: an inner locator of `has` is read inside each row.
 */
export function variableRow(table: Locator, name: string): Locator {
    const key = table
        .page()
        .getByRole('textbox', { exact: true, name: 'Key' })
        .filter({ hasText: new RegExp(`^${name}$`, 'u') });

    return table.locator('[data-part="key-value-row"]').filter({ has: key });
}

/** The value field of a variable, in the row its key names. */
export function variableValueField(table: Locator, name: string): Locator {
    return variableRow(table, name).getByRole('textbox', { exact: true, name: 'Value' });
}

/** The names a table of pairs gives its two fields, in the language the window speaks. */
export type RowLabels = { key: string; value: string };

const ENGLISH: RowLabels = { key: 'Key', value: 'Value' };

/**
 * Writes a key and its value into a row. When the row is the empty one a table ends in, the
 * first keystroke turns it into a line and the focus follows, so the rest lands in that line.
 */
export async function writeRowAt(
    key: Locator,
    field: Locator,
    name: string,
    value: string,
): Promise<void> {
    await key.click();
    await key.pressSequentially(name);
    await expect(key).toHaveText(name);
    await field.click();
    await field.pressSequentially(value);
    await expect(field).toHaveText(value);
}

/** A new line written into the empty row a table of pairs always ends in: its last key. */
export async function writeNewRow(
    table: Locator,
    name: string,
    value: string,
    labels: RowLabels = ENGLISH,
): Promise<void> {
    const keys = table.getByRole('textbox', { exact: true, name: labels.key });

    await expect(keys.last()).toBeVisible();

    const at = (await keys.count()) - 1;
    const field = table.getByRole('textbox', { exact: true, name: labels.value }).nth(at);

    await writeRowAt(keys.nth(at), field, name, value);
}
