import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { HealthMetrics } from '@/types'
import { useUiStore } from '@/store/uiStore'

interface HealthCharts3DProps {
  health: HealthMetrics
}

function ExtrudedBars({ health }: HealthCharts3DProps) {
  const barsData = useMemo(() => {
    const maxVal = Math.max(1, health.total_bugs, 5)
    return [
      { label: 'Critical', count: health.critical_count, color: '#EF4444', x: -2.1 },
      { label: 'High', count: health.high_count, color: '#F97316', x: -0.7 },
      { label: 'Medium', count: health.medium_count, color: '#F59E0B', x: 0.7 },
      { label: 'Low', count: health.low_count, color: '#06B6D4', x: 2.1 },
    ].map((item) => ({
      ...item,
      targetHeight: Math.max(0.2, (item.count / maxVal) * 2.8),
    }))
  }, [health])

  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0.15, delta * 2)
    }
  })

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {barsData.map((bar) => (
        <group key={bar.label} position={[bar.x, 0, 0]}>
          {/* Bar box */}
          <mesh position={[0, bar.targetHeight / 2, 0]}>
            <boxGeometry args={[0.8, bar.targetHeight, 0.8]} />
            <meshStandardMaterial
              color={bar.color}
              emissive={bar.color}
              emissiveIntensity={1.2}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>

          {/* Value on top of bar */}
          <Text
            position={[0, bar.targetHeight + 0.3, 0]}
            fontSize={0.28}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {String(bar.count)}
          </Text>

          {/* Label below bar */}
          <Text
            position={[0, -0.3, 0.4]}
            fontSize={0.24}
            color="#94A3B8"
            anchorX="center"
            anchorY="middle"
          >
            {bar.label}
          </Text>
        </group>
      ))}
    </group>
  )
}

export default function HealthCharts3D({ health }: HealthCharts3DProps) {
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
    const items = [
      { label: 'Critical', count: health.critical_count, color: 'bg-red-500' },
      { label: 'High', count: health.high_count, color: 'bg-orange-500' },
      { label: 'Medium', count: health.medium_count, color: 'bg-amber-500' },
      { label: 'Low', count: health.low_count, color: 'bg-cyan-500' },
    ]
    return (
      <div className="p-6 rounded-glass bg-[#0A0B10] border border-white/[0.08] space-y-4">
        <h4 className="text-xs font-mono text-text-muted uppercase">Findings by Severity</h4>
        <div className="grid grid-cols-4 gap-3 text-center">
          {items.map((it) => (
            <div key={it.label} className="p-3 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${it.color} mb-1`} />
              <div className="text-lg font-bold text-white">{it.count}</div>
              <div className="text-[11px] font-mono text-text-muted">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64 rounded-glass overflow-hidden bg-[#0A0B10]/80 border border-white/[0.06] relative">
      <Suspense fallback={<div className="h-full flex items-center justify-center font-mono text-xs text-text-muted">Rendering 3D Metrics...</div>}>
        <Canvas camera={{ position: [0, 1.2, 5.5], fov: 45 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.5} />
          <pointLight position={[3, 5, 4]} intensity={2} color="#00F5FF" />
          <pointLight position={[-3, -2, 2]} intensity={1} color="#8B5CF6" />
          <ExtrudedBars health={health} />
        </Canvas>
      </Suspense>
    </div>
  )
}
