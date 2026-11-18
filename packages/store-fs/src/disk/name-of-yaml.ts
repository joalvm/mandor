import { parseDocument } from 'yaml';

/**
 * The name a yaml text carries, read as far as the text parses. A file that cannot be read still
 * says whose it is when its `name` came before the broken line: `parseDocument` keeps what it
 * understood and collects the errors instead of throwing, so the answer is `''` when no name was
 * understood, or there is no text: a file that left between listing it and reading it.
 */
export function nameOfYaml(text: string | null): string {
    const name: unknown = parseDocument(text ?? '').get('name');

    return typeof name === 'string' ? name : '';
}
