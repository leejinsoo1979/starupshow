'use client'

import { useEffect, useState } from 'react'

export function TitleBar() {
    const [isElectronApp, setIsElectronApp] = useState(false)

    useEffect(() => {
        // More robust check for Electron
        const checkElectron = () => {
            const isElectron = typeof window !== 'undefined' &&
                (!!(window as any).electron ||
                    navigator.userAgent.toLowerCase().includes('electron') ||
                    (window as any).process?.versions?.electron);

            if (isElectron) {
                setIsElectronApp(true)
                document.body.classList.add('electron-app')
                // Force sync the CSS variable if needed, though globals.css handles it
            }
        }

        checkElectron()
    }, [])

    return null
}
