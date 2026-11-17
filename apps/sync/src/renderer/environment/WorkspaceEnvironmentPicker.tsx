import { EnvironmentPicker } from '@mandor/env';

import { useWorkspaceEnvironment } from './useWorkspaceEnvironment.js';

/**
 * Who owns the environment in Mandor Request: the workspace, one for every request open at once.
 * Every strip of the window offers the same picker with the same value, because the owner does
 * not change from group to group.
 */
export function WorkspaceEnvironmentPicker() {
    const { onChange, options, value } = useWorkspaceEnvironment();

    return <EnvironmentPicker onChange={onChange} options={options} value={value} />;
}
