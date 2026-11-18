/** The folder holds auth or scripts this import did not put there, and an import does not overwrite them. */
export class FolderImportTakenError extends Error {
    readonly route: string;

    constructor(route: string) {
        super(`the folder "${route}" has auth or scripts set by hand`);
        this.name = 'FolderImportTakenError';
        this.route = route;
    }
}
