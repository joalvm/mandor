import { FormatInputError } from '@mandor/interop-core';

/**
 * The file refused to be read as an Mandor workspace. What was wrong travels with the error, so
 * the caller can say it without parsing again.
 */
export class MandorParseError extends FormatInputError {
    constructor(problems: string[]) {
        super(problems, 'the file is not an Mandor workspace');

        this.name = 'MandorParseError';
    }
}
