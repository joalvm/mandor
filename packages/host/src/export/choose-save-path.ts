/**
 * How the export asks the user where to write. Named as a port: the handler runs whole in a
 * plain node test, and the dialog of the system is one implementation of it.
 *
 * `null` is the user closing the dialog without choosing, which is an answer.
 */
export type ChooseSavePath = (suggestedName: string) => Promise<string | null>;
