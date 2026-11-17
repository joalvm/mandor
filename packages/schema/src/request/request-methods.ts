/** The methods a picker offers. The schema takes any HTTP token, this list is only the shortcut. */
export const STANDARD_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'HEAD',
    'OPTIONS',
] as const;

/** What a method may look like: an upper-case word, digits and dashes allowed, nothing else. */
export const METHOD_PATTERN = /^[A-Z][A-Z0-9-]*$/;
