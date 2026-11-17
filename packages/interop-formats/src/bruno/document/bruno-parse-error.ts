import { FormatInputError } from '@mandor/interop-core';

/**
 * The folder refused to be read. What was wrong travels with the error, so the caller can say it
 * without parsing again.
 */
export class BrunoParseError extends FormatInputError {
    constructor(problems: string[]) {
        super(problems, 'the folder is not a collection of Bruno');

        this.name = 'BrunoParseError';
    }
}
