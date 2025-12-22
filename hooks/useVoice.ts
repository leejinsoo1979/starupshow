'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export function useVoice() {
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const audioContextRef = useRef<AudioContext | null>(null)
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)
    const recognitionRef = useRef<any>(null)

    // Initialize Web Speech API for STT
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = false
            recognitionRef.current.lang = 'ko-KR' // Default to Korean
        }
    }, [])

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop()
            } catch (e) {
                // Already stopped
            }
            audioSourceRef.current = null
        }
        setIsPlaying(false)
    }, [])

    const playSpeech = useCallback(async (text: string, voice: OpenAIVoice = 'alloy') => {
        if (!text || !isVoiceEnabled) return

        stopPlayback()
        setIsPlaying(true)

        try {
            const response = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice }),
            })

            if (!response.ok) throw new Error('TTS request failed')

            const arrayBuffer = await response.arrayBuffer()

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }

            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
            const source = audioContextRef.current.createBufferSource()
            source.buffer = audioBuffer
            source.connect(audioContextRef.current.destination)

            source.onended = () => {
                setIsPlaying(false)
                audioSourceRef.current = null
            }

            audioSourceRef.current = source
            source.start(0)
        } catch (error) {
            console.error('[playSpeech Error]:', error)
            setIsPlaying(false)
        }
    }, [isVoiceEnabled, stopPlayback])

    const toggleVoiceMode = useCallback(() => {
        setIsVoiceEnabled(prev => {
            const next = !prev
            if (!next) stopPlayback()
            return next
        })
    }, [stopPlayback])

    const startTranscription = useCallback((onResult: (text: string) => void) => {
        if (!recognitionRef.current) {
            alert('이 브라우저는 음성 인식을 지원하지 않습니다.')
            return
        }

        setIsTranscribing(true)

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            onResult(transcript)
            setIsTranscribing(false)
        }

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error)
            setIsTranscribing(false)
        }

        recognitionRef.current.onend = () => {
            setIsTranscribing(false)
        }

        recognitionRef.current.start()
    }, [])

    const stopTranscription = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
        setIsTranscribing(false)
    }, [])

    return {
        isVoiceEnabled,
        isPlaying,
        isTranscribing,
        toggleVoiceMode,
        playSpeech,
        stopPlayback,
        startTranscription,
        stopTranscription,
    }
}
