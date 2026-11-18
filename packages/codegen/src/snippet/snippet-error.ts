import type { SnippetTarget } from '@mandor/schema';

/** The library wrote nothing for a language: it has no way to say why. */
export class SnippetError extends Error {
    constructor(readonly target: SnippetTarget) {
        super(`the snippet library wrote nothing for ${target}`);
        this.name = 'SnippetError';
    }
}
