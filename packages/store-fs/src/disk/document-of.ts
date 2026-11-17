import { Document } from 'yaml';

/**
 * Builds the document of a brand new file. Key order is the one the domain factory produced,
 * so two repos created by the same build serialize identically and diffs stay small.
 */
export function documentOf(value: object): Document {
    return new Document(value);
}
