/** The ways a document is picked: its files, or the folder that holds them. */
const IMPORT_PICKS = ['files', 'folder'] as const;

export type ImportPick = (typeof IMPORT_PICKS)[number];

/** One format the dialog says it takes: the name the app gives it, and what its files are. */
export type ImportChoice = {
    /** What the dropzone and the unknown-file error call it. */
    label: string;
    /** What its files are, said after the label: «3.x or Swagger 2.0, as JSON or YAML». */
    hint: string;
    /** What the person picks to bring it: the files of the document, or the folder it lives in. */
    input: ImportPick;
};

/** The ways to pick that the formats ask for, in the order the dropzone offers them. */
export function picksOf(formats: readonly ImportChoice[]): ImportPick[] {
    return IMPORT_PICKS.filter((pick) => formats.some(({ input }) => input === pick));
}
