import { bridge } from '@mandor/shell';

/**
 * Whether the open origin still keeps the clash a link names, asked before the link opens a tab
 * that would have nothing in it. A clash is kept under the workspace it clashed in, so a link
 * that names the right id under another workspace holds nothing.
 */
export async function holdsConflict(workspaceId: string, id: string): Promise<boolean> {
    const list = await bridge.conflict.list();

    return (
        list.ok &&
        list.value.some(
            (clash) =>
                clash.id === id &&
                'workspaceId' in clash.entity &&
                clash.entity.workspaceId === workspaceId,
        )
    );
}
