/** Where a node lands among its siblings: above one of them, or last when there is none. */
export type CollectionPlacement = {
    name: string;
    /** The sibling the node lands above, or `null` to send it to the end of the order. */
    before: string | null;
};
