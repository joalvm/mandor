import { createDoorbell } from '@mandor/ui';

/** What the row that rang asks to leave: the route of one collection of the open workspace. */
export type ExportRequest = { collection: string };

/**
 * The doorbell of the collection export. A menu closes the moment a line is chosen and takes its
 * lines with it, so the dialog cannot live in the line: the line rings, and the dialog the app
 * keeps mounted opens.
 */
const EXPORT_REQUESTED = createDoorbell<ExportRequest>();

/** Rings the doorbell for one collection. */
export function requestExport(request: ExportRequest): void {
    EXPORT_REQUESTED.ring(request);
}

/** Listens for the doorbell and returns its way out. */
export function onExportRequested(handler: (request: ExportRequest) => void): () => void {
    return EXPORT_REQUESTED.listen(handler);
}
