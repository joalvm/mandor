import type { CodegenArea } from '../codegen/codegen-area.js';
import { success } from '../result/success.js';

/**
 * The codegen area a test gets when it says nothing about it: a paste that names no URL, and a
 * snippet with no code, the smallest answers their channels accept.
 */
export function defaultCodegen(): CodegenArea {
    return {
        fromCurl: () => Promise.resolve(success({ kind: 'invalid', reason: 'noUrl' })),
        snippet: () => Promise.resolve(success({ code: '', leftOutFile: null })),
    };
}
