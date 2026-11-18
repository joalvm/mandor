import type { NetworkFilePurpose } from '@mandor/ipc';
import type { FileFilter } from 'electron';

import { systemOpenDialog } from '../import/system-open-dialog.js';

/** The files each purpose names, by the extensions they carry; the names are of the formats. */
const FILTERS: Record<NetworkFilePurpose, FileFilter[]> = {
    ca: [{ name: 'PEM', extensions: ['pem', 'crt', 'cer'] }],
    cert: [{ name: 'PEM', extensions: ['pem', 'crt', 'cer'] }],
    key: [{ name: 'PEM', extensions: ['pem', 'key'] }],
    pfx: [{ name: 'PKCS#12', extensions: ['pfx', 'p12'] }],
};

/** The open dialog of the system for one certificate file: its path, or null if none was picked. */
export async function systemChooseNetworkFile(purpose: NetworkFilePurpose): Promise<string | null> {
    const picked = await systemOpenDialog(FILTERS[purpose])('file');

    return picked?.[0] ?? null;
}
