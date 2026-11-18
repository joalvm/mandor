/**
 * One declared variable of an environment. `secret` is a mark and nothing more for now:
 * nothing reads it yet, and the value still lives here until redaction lands.
 */
export type Variable = {
    name: string;
    value: string;
    enabled: boolean;
    secret: boolean;
};
