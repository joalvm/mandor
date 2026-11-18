/**
 * A file that could not be loaded. It travels next to the data instead of as an exception,
 * so one unreadable file costs the user that file and not the whole repo. `name` is the one the
 * file carries when its text got that far: what a person can be told it is.
 */
export type LoadWarning = {
    path: string;
    message: string;
    name?: string | undefined;
};
