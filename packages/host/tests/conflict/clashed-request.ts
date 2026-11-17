export type ClashedParts = {
    accept?: string;
    content?: readonly string[];
    user?: string;
};

/**
 * A Sync request with a header repeated under one key and a body block: the two places two copies
 * can both change, so a clash of a row and a clash of a text come out of one file.
 */
export function clashedRequest({
    accept = 'text/plain',
    content,
    user = 'a',
}: ClashedParts): string {
    const lines = (content ?? ['{', `  "user": "${user}",`, '  "pass": "b",', '  "x": 1', '}']).map(
        (line) => `    ${line}`,
    );

    return [
        'name: Login',
        'method: POST',
        'url: "{{host}}/login"',
        'headers:',
        '  - key: Accept',
        '    value: application/json',
        '    enabled: true',
        '  - key: Accept',
        `    value: ${accept}`,
        '    enabled: true',
        'body:',
        '  type: json',
        '  content: |',
        ...lines,
        '',
    ].join('\n');
}
