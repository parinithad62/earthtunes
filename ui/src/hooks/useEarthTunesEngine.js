import { useCallback, useEffect, useRef, useState } from 'react'
import { sourceData } from '../data/climateData.js'

const initialLayers = [
  { name: 'temperature', on: true, volume: 0.8 },
  { name: 'sea_ice', on: true, volume: 0.7 },
  { name: 'wildfire', on: true, volume: 0.6 },
  { name: 'harmony', on: true, volume: 0.7 },
]

export default function useEarthTunesEngine({ onYearChange } = {}) {
  const engineRef = useRef(null)
  const activationRef = useRef(null)
  const onYearChangeRef = useRef(onYearChange)
  const unsubscribersRef = useRef([])
  const mountedRef = useRef(true)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)
  const [currentHit, setCurrentHit] = useState(null)
  const [speed, setSpeedState] = useState(1)
  const [masterVolume, setMasterVolumeState] = useState(0.8)
  const [layers, setLayers] = useState(initialLayers)

  useEffect(() => {
    onYearChangeRef.current = onYearChange
  }, [onYearChange])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      for (const unsubscribe of unsubscribersRef.current) unsubscribe()
      if (engineRef.current) engineRef.current.dispose()
    }
  }, [])

  const activate = useCallback(async () => {
    if (engineRef.current) return engineRef.current
    if (activationRef.current) return activationRef.current

    setState('loading')
    setError('')
    activationRef.current = Promise.all([
      import('tone'),
      import('../../../audio/audio.js'),
    ])
      .then(async ([Tone, { createEngine }]) => {
        const engine = createEngine({ Tone })
        await engine.load(sourceData)

        const unsubscribeYear = engine.onYear((nextPayload) => {
          if (!mountedRef.current) return
          setPayload(nextPayload)
          onYearChangeRef.current?.(nextPayload.year)
        })
        const unsubscribeState = engine.onStateChange((nextState) => {
          if (mountedRef.current) setState(nextState)
        })
        const unsubscribeEnd = engine.onEnd(() => {
          if (mountedRef.current) setCurrentHit(null)
        })

        unsubscribersRef.current = [unsubscribeYear, unsubscribeState, unsubscribeEnd]
        engineRef.current = engine
        if (mountedRef.current) {
          setLayers(engine.getLayers())
          setState('ready')
        }
        return engine
      })
      .catch((activationError) => {
        activationRef.current = null
        const message = activationError instanceof Error ? activationError.message : 'Audio could not be started.'
        if (mountedRef.current) {
          setError(message)
          setState('error')
        }
        throw activationError
      })

    return activationRef.current
  }, [])

  const playAll = useCallback(async () => {
    try {
      const engine = await activate()
      setCurrentHit(null)
      await engine.playAll(speed)
    } catch {
      // activate() publishes the actionable error state.
    }
  }, [activate, speed])

  const playHit = useCallback(async (hit) => {
    try {
      const engine = await activate()
      setCurrentHit(hit)
      await engine.play(hit, speed)
    } catch {
      // activate() publishes the actionable error state.
    }
  }, [activate, speed])

  const toggle = useCallback(async () => {
    if (!engineRef.current) {
      await playAll()
      return
    }
    if (state === 'ready' || state === 'ended') {
      await playAll()
      return
    }
    try {
      await engineRef.current.toggle()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Playback could not continue.')
      setState('error')
    }
  }, [playAll, state])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    setCurrentHit(null)
    setPayload(null)
  }, [])

  const setSpeed = useCallback((value) => {
    const nextSpeed = Number(value)
    setSpeedState(nextSpeed)
    engineRef.current?.setSpeed(nextSpeed)
  }, [])

  const setMasterVolume = useCallback((value) => {
    const nextVolume = Number(value)
    setMasterVolumeState(nextVolume)
    engineRef.current?.setVolume(nextVolume)
  }, [])

  const setLayerEnabled = useCallback((name, on) => {
    engineRef.current?.setLayer(name, on)
    setLayers((current) => current.map((layer) => layer.name === name ? { ...layer, on } : layer))
  }, [])

  const setLayerVolume = useCallback((name, volume) => {
    const nextVolume = Number(volume)
    engineRef.current?.setVolume(nextVolume, name)
    setLayers((current) => current.map((layer) => layer.name === name ? { ...layer, volume: nextVolume } : layer))
  }, [])

  return {
    state,
    error,
    payload,
    currentHit,
    speed,
    masterVolume,
    layers,
    isActivated: Boolean(engineRef.current),
    isPlaying: state === 'playing',
    isPaused: state === 'paused',
    isBusy: state === 'loading',
    playAll,
    playHit,
    toggle,
    stop,
    setSpeed,
    setMasterVolume,
    setLayerEnabled,
    setLayerVolume,
  }
}
