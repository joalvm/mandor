/** The two ways a doc is shown: read as a page, or written as markdown. */
export type DocMode = 'read' | 'write';

/**
 * How one tab is showing its doc. It belongs to the tab and not to the file: the same doc open
 * twice is read in one group while it is written in the other, and neither view moves the other.
 *
 * `mode` is missing until somebody picks a side, and that is not the same as picking the page:
 * a doc with nothing in it opens on the editor, so the answer is read off the file the first
 * time it is drawn and stops being read the moment the reader disagrees.
 */
export type DocViewState = {
    mode: DocMode | null;
    /** Whether the writing side shows the page beside it. Off until the reader asks for it. */
    preview: boolean;
};

/** What a surface is showing: the side, and the page beside the markdown when it is written. */
export type DocSurfaceView = { mode: DocMode; preview: boolean };

/** The doc a surface shows: its text, whoever writes it, and the keys it is remembered by. */
export type DocSurfaceDoc = {
    /** The name of the editor, read where it is drawn: this package holds no text of its own. */
    label: string;
    /** The model of the editor. Two views of one text share it, and the undo with it. */
    modelKey: string;
    /** Every change, as it is typed or as a box of the page is pressed. */
    onChange: (text: string) => void;
    /** Where the page is kept scrolled to: the tab, or the item a description belongs to. */
    place: string;
    value: string;
};

/** What each side of a surface is handed: the doc, what is shown, and how to change it. */
export type DocSide = {
    doc: DocSurfaceDoc;
    view: DocSurfaceView;
    onView: (patch: Partial<DocSurfaceView>) => void;
};
