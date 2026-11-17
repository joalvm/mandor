/** The fields of a urlencoded body as the text a client sends, each name and value encoded. */
export function urlencodedOf(fields: [string, string][]): string {
    return fields
        .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
        .join('&');
}
