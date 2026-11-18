/** The reason phrase each code the picker offers goes by, as the protocol names it. */
const STATUS_NAMES = new Map([
    ['200', 'OK'],
    ['201', 'Created'],
    ['202', 'Accepted'],
    ['204', 'No Content'],
    ['301', 'Moved Permanently'],
    ['302', 'Found'],
    ['304', 'Not Modified'],
    ['400', 'Bad Request'],
    ['401', 'Unauthorized'],
    ['403', 'Forbidden'],
    ['404', 'Not Found'],
    ['409', 'Conflict'],
    ['422', 'Unprocessable Entity'],
    ['429', 'Too Many Requests'],
    ['500', 'Internal Server Error'],
    ['502', 'Bad Gateway'],
    ['503', 'Service Unavailable'],
    ['504', 'Gateway Timeout'],
]);

/** A code with its name — `404 Not Found` — and a code nobody named as the code alone. */
export function statusLabelOf(code: string): string {
    const name = STATUS_NAMES.get(code);

    return name === undefined ? code : `${code} ${name}`;
}
