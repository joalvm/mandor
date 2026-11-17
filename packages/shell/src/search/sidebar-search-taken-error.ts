/** Two features answering for the search of one sidebar, named both: either could be the mistake. */
export class SidebarSearchTakenError extends Error {
    constructor(one: string, other: string) {
        super(`Two features registered the search of the sidebar: ${one} and ${other}`);

        this.name = 'SidebarSearchTakenError';
    }
}
