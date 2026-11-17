/**
 * A document the format cannot read: the files are not its input, or what they say does not
 * parse. What is wrong travels with the error as `problems`. Each format names its own refusal
 * after this one, so the host tells every refusal to read by one class it can import.
 */
export class FormatInputError extends Error {
    readonly problems: string[];

    constructor(problems: string[], fallback = 'the files are not the input of the format') {
        super(problems[0] ?? fallback);

        this.name = 'FormatInputError';
        this.problems = problems;
    }
}
