import { parseWith } from '../format/parse-with.js';
import type { FolderSettings } from './folder-settings.js';
import { folderSettingsSchema } from './folder-settings-schema.js';

/**
 * Reads one `collection.yaml` or `folder.yaml`. What the order says is checked against disk
 * elsewhere, on reading.
 */
export function parseFolderSettings(input: unknown): FolderSettings {
    const settings = parseWith(folderSettingsSchema, input);

    return { ...settings, order: settings.order ?? [] };
}
