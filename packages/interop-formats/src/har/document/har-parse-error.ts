import { FormatInputError } from '@mandor/interop-core';

/**
 * The file refused to be read. What was wrong travels with the error, so the caller can say it
 * without parsing again.
 */
export class HarParseError extends FormatInputError {
    constructor(problems: string[]) {
        super(problems, 'the HAR cannot be read');

        this.name = 'HarParseError';
    }
}
