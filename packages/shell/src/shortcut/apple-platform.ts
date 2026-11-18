/** Whether the keyboard being read has a `Cmd` key, which is all the difference that matters. */
export function isApplePlatform(): boolean {
    return /Mac|iPhone|iPad/u.test(navigator.userAgent);
}
