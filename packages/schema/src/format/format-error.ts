/** Parsing failed. Carries the dot path of every issue so the UI can point at the field. */
export class FormatError extends Error {
    constructor(readonly issues: string[]) {
        super(`Invalid format: ${issues.join(', ')}`);
        this.name = 'FormatError';
    }
}
