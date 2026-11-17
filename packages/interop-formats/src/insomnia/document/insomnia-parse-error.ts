import { FormatInputError } from '@mandor/interop-core';

/**
 * The file refused to be read. What was wrong travels with the error, so the caller can say it
 * without parsing again.
 */
export class InsomniaParseError extends FormatInputError {
    constructor(problems: string[]) {
        super(problems, 'the file is not an Insomnia export');

        this.name = 'InsomniaParseError';
    }
}
