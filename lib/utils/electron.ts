export function isElectron() {
    return typeof window !== 'undefined' && 'electron' in window;
}
