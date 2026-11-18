/** Two parts, never four: the key of a variable cannot come out of this shape. */
const NAMESPACE = 'origin';

/**
 * The key the token of an origin is kept under. It says what the secret is, which the bare id
 * did not: the same store holds the secrets of the variables, and a workspace is free to be
 * named after an origin. Encoding the id is what keeps the two parts two.
 */
export function originSecretKey(id: string): string {
    return `${NAMESPACE}/${encodeURIComponent(id)}`;
}
