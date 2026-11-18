/**
 * How the export asks the user where to write several files: a folder, which may be new. The
 * handler runs whole in a plain node test, and the dialog of the system is one way to answer.
 *
 * `null` is the user closing the dialog without choosing, which is an answer.
 */
export type ChooseSaveFolder = () => Promise<string | null>;
