/** A path segment written `{name}`, the way Mandor keeps a path parameter in a url. */
const PATH_VARIABLE = /(^|\/)\{([A-Za-z_][\w.-]*)\}(?=[/?#]|$)/g;

/**
 * Postman, Insomnia and Bruno write a path parameter `:name` in the url, the only form they read
 * as one, and keep its value apart. Only whole segments are rewritten: a `{name}` inside a word
 * is text.
 */
export function colonPathOf(url: string): string {
    return url.replace(PATH_VARIABLE, '$1:$2');
}
