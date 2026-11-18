export type PackageLayer = 'dom' | 'platform' | 'pure';

export type WorkspacePackage = {
    name: string;
    dir: string;
    internal: string[];
    layer: PackageLayer;
};

export function workspacePackages(root: string): WorkspacePackage[];

export function packageClasses(root: string): { features: string[]; pure: string[] };
