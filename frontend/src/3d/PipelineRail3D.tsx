import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { ScanStatus, PIPELINE_STAGES, PipelineStage } from '@/types'
import { useUiStore } from '@/store/uiStore'

interface PipelineRail3DProps {
  currentStatus: ScanStatus
  stages?: PipelineStage[]
}

function RailMesh({ currentStatus, stages = PIPELINE_STAGES }: PipelineRail3DProps) {
  const orbRef = useRef<THREE.Mesh>(null)

  // Map 7 stages across an undulating curve from x = -5 to x = 5
  const points = useMemo(() => {
    return [
      new THREE.Vector3(-5, -0.4, 0),
      new THREE.Vector3(-3.3, 0.4, 0),
      new THREE.Vector3(-1.6, -0.4, 0),
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(1.6, -0.4, 0),
      new THREE.Vector3(3.3, 0.4, 0),
      new THREE.Vector3(5, -0.4, 0),
    ]
  }, [])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points])
  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.05, 8, false), [curve])

  // Determine stage progress (0 to 6)
  const currentIndex = useMemo(() => {
    const idx = stages.findIndex((s) => s.id === currentStatus)
    return idx >= 0 ? idx : 2 // default to SCANNING if not directly mapped
  }, [stages, currentStatus])

  const targetProgress = currentIndex / (stages.length - 1)
  const currentProgress = useRef(0)

  useFrame((_, delta) => {
    currentProgress.current = THREE.MathUtils.lerp(
      currentProgress.current,
      targetProgress,
      delta * 2.5
    )
    if (orbRef.current) {
      const pos = curve.getPointAt(Math.min(1, Math.max(0, currentProgress.current)))
      orbRef.current.position.copy(pos)
    }
  })

  return (
    <group>
      {/* Background track tube */}
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#1E293B"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Stage Nodes */}
      {stages.map((stage, i) => {
        const t = i / (stages.length - 1)
        const pos = curve.getPointAt(t)
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex

        const nodeColor = isDone ? '#10B981' : isCurrent ? '#00F5FF' : '#475569'

        return (
          <group key={stage.id} position={pos}>
            <mesh>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isCurrent ? 2 : isDone ? 1 : 0.2}
              />
            </mesh>

            {/* Label */}
            <Text
              position={[0, i % 2 === 0 ? -0.55 : 0.55, 0]}
              fontSize={0.24}
              color="#F1F5F9"
              anchorX="center"
              anchorY="middle"
            >
              {stage.label}
            </Text>
          </group>
        )
      })}

      {/* Glowing traveling orb */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial
          color="#00F5FF"
          emissive="#00F5FF"
          emissiveIntensity={3}
        />
      </mesh>
    </group>
  )
}

export default function PipelineRail3D({
  currentStatus,
  stages = PIPELINE_STAGES,
}: PipelineRail3DProps) {
  const reducedMotion = useUiStore((s) => s.reducedMotion)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setHasWebGL(
        !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        )
      )
    } catch {
      setHasWebGL(false)
    }
  }, [])

  if (reducedMotion || !hasWebGL) {
    const currentIndex = stages.findIndex((s) => s.id === currentStatus)
    return (
      <div className="w-full p-4 rounded-glass bg-[#0A0B10] border border-white/[0.08]">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {stages.map((st, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex
            return (
              <div key={st.id} className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                    isDone
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isCurrent
                      ? 'bg-cyan/20 text-cyan border-cyan shadow-[0_0_10px_rgba(0,245,255,0.3)]'
                      : 'bg-white/[0.03] text-text-muted border-white/[0.06]'
                  }`}
                >
                  {st.icon} {st.label}
                </span>
                {i < stages.length - 1 && (
                  <span className="text-text-muted text-xs">→</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-36 rounded-glass overflow-hidden border border-white/[0.06] bg-[#0A0B10]/80">
      <Suspense fallback={<div className="h-full flex items-center justify-center font-mono text-xs text-text-muted">Loading 3D Pipeline...</div>}>
        <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 4, 3]} intensity={1.5} color="#00F5FF" />
          <RailMesh currentStatus={currentStatus} stages={stages} />
        </Canvas>
      </Suspense>
    </div>
  )
}
