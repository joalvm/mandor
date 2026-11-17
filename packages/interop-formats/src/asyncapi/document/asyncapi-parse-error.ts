import { FormatInputError } from '@mandor/interop-core';

/**
 * The document refused to be read. What the parser complained about travels with the error, so
 * the caller can say what is wrong without parsing again.
 */
export class AsyncapiParseError extends FormatInputError {
    constructor(problems: string[]) {
        super(problems, 'the document does not meet the specification');

        this.name = 'AsyncapiParseError';
    }
}
