/**
 * One hop of a redirect chain. `from` and `to` are the full URLs; `strippedHeaders` names the
 * headers the transport dropped before following, because the hop left the origin and the
 * credentials of one origin are not the business of the next.
 */
export type RedirectHop = {
    status: number;
    from: string;
    to: string;
    strippedHeaders: string[];
};
