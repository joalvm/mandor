const TEXT_MIMES = [
    /^text\//,
    /^application\/(json|xml|javascript|graphql|x-www-form-urlencoded)$/,
    /\+(json|xml)$/,
];

/** The media type alone: lower case, no parameters. `Application/JSON; charset=utf-8` → `application/json`. */
export function baseMime(contentType: string): string {
    return contentType.replace(/;.*$/s, '').trim().toLowerCase();
}

/** Whether a body of this type is text a person reads. An empty type counts as text. */
export function isTextMime(mime: string): boolean {
    return mime === '' || TEXT_MIMES.some((pattern) => pattern.test(mime));
}
