import type { UserConfig } from 'electron-vite';

export function appBuildConfig(options: {
    appDir: string;
    mainEntry: string;
    main?: UserConfig['main'];
}): Required<Pick<UserConfig, 'main' | 'preload' | 'renderer'>>;
