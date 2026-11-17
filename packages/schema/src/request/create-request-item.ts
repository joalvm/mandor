import { parseWith } from '../format/parse-with.js';
import type { RequestItem } from './request-item.js';
import { requestItemSchema } from './request-item-schema.js';

export type CreateRequestItemInput = {
    name: string;
};

/** Makes a request with nothing but a name. The rest is what the person has not written yet. */
export function createRequestItem(input: CreateRequestItemInput): RequestItem {
    return parseWith(requestItemSchema, input);
}
