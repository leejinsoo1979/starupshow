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

    if (!isElectronApp) return null

    return (
        <div
            className="fixed top-0 left-0 right-0 h-8 z-[9999] flex items-center justify-center pointer-events-none select-none overflow-hidden"
            style={{ WebkitAppRegion: 'drag' } as any}
        >
            {/* Background layer */}
            <div className="absolute inset-0 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-white/10" />

            {/* Window Title */}
            <span className="relative z-10 text-[11px] font-bold text-zinc-400 font-sans tracking-[0.2em] uppercase opacity-80">
                GlowUS
            </span>
        </div>
    )
}
