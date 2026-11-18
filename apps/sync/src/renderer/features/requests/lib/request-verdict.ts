import { validateTemplateText, type TemplateIssue } from '@mandor/validate';
import type { RequestBody } from '@mandor/schema';

/**
 * The rules of its schema a body breaks, read as the JSONC it is written in. Only a json body
 * has a shape to meet, and only a written schema asks for one: anything else breaks nothing.
 */
export function bodyVerdict(body: RequestBody, schema: string | undefined): TemplateIssue[] {
    if (body.type !== 'json' || (schema ?? '').trim() === '') {
        return [];
    }

    return validateTemplateText(schema ?? '', body.content);
}
