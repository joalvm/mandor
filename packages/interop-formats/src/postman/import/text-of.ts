/**
 * What a variable value says as text. Postman lets a value be anything JSON holds; Mandor keeps
 * text. Nothing becomes empty, a number or a boolean reads as it prints, and the rest as JSON.
 */
export function textOf(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value === null || value === undefined) {
        return '';
    }

    return JSON.stringify(value);
}
