export type RequestParts = {
    method?: string;
    secondAccept?: string;
    content?: readonly string[];
};

const JSON_BODY = ['{', '  "user": "a",', '  "pass": "b",', '  "x": 1,', '  "y": 2', '}'];

/**
 * A Sync request as the file keeps it: a comment on top, a quoted url, a header repeated under
 * the same key and a body whose content is a block of lines. Each test changes only the parts
 * it is about.
 */
export function requestText({
    method = 'POST',
    secondAccept = 'text/plain',
    content = JSON_BODY,
}: RequestParts = {}): string {
    const lines = content.map((line) => `    ${line}`);

    return [
        '# Login request',
        'name: Login',
        `method: ${method}`,
        'url: "{{host}}/login"',
        'headers:',
        '  - key: Accept',
        '    value: application/json',
        '    enabled: true',
        '  - key: Accept',
        `    value: ${secondAccept}`,
        '    enabled: true',
        'body:',
        '  type: json',
        '  content: |',
        ...lines,
        '',
    ].join('\n');
}

/** The lines of the body with some of them changed, by position. */
export function contentWith(changes: Readonly<Record<number, string>>): string[] {
    return JSON_BODY.map((line, index) => changes[index] ?? line);
}
