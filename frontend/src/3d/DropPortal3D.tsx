import React, { useRef, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useUiStore } from '@/store/uiStore'

interface DropPortal3DProps {
  isActive: boolean
}

function PortalRings({ isActive }: { isActive: boolean }) {
  const innerRef = useRef<THREE.Mesh>(null)
  const midRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)

  const targetScale = isActive ? 1.25 : 1.0
  const currentScale = useRef(1.0)

  useFrame((_, delta) => {
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, delta * 4)

    if (innerRef.current) {
      innerRef.current.rotation.z += delta * (isActive ? 2.5 : 1.2)
      innerRef.current.scale.setScalar(currentScale.current)
    }
    if (midRef.current) {
      midRef.current.rotation.z -= delta * (isActive ? 1.8 : 0.8)
      midRef.current.scale.setScalar(currentScale.current)
    }
    if (outerRef.current) {
      outerRef.current.rotation.z += delta * (isActive ? 1.0 : 0.4)
      outerRef.current.scale.setScalar(currentScale.current)
    }
  })

  return (
    <group>
      {/* Inner ring */}
      <mesh ref={innerRef}>
        <torusGeometry args={[1.2, 0.03, 16, 64]} />
        <meshStandardMaterial
          color="#8B5CF6"
          emissive="#8B5CF6"
          emissiveIntensity={isActive ? 3 : 1}
        />
      </mesh>

      {/* Middle ring */}
      <mesh ref={midRef}>
        <torusGeometry args={[1.6, 0.025, 16, 64]} />
        <meshStandardMaterial
          color="#00F5FF"
          emissive="#00F5FF"
          emissiveIntensity={isActive ? 3.5 : 1.2}
        />
      </mesh>

      {/* Outer ring */}
      <mesh ref={outerRef}>
        <torusGeometry args={[2.0, 0.02, 16, 64]} />
        <meshStandardMaterial
          color="#8B5CF6"
          emissive="#8B5CF6"
          emissiveIntensity={isActive ? 2 : 0.6}
        />
      </mesh>

      {/* Center text prompt */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.28}
        color={isActive ? '#00F5FF' : '#F1F5F9'}
        anchorX="center"
        anchorY="middle"
      >
        {isActive ? 'Release archive into Portal' : 'Drop project here (.zip, .py, .java)'}
      </Text>
    </group>
  )
}

export default function DropPortal3D({ isActive }: DropPortal3DProps) {
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
    return (
      <div
        className={`w-full h-44 rounded-glass border-2 border-dashed flex flex-col items-center justify-center transition-colors ${
          isActive
            ? 'border-cyan bg-cyan/10 shadow-[0_0_30px_rgba(0,245,255,0.2)]'
            : 'border-white/[0.12] bg-white/[0.02]'
        }`}
      >
        <span className="text-3xl mb-2">{isActive ? '📥' : '📦'}</span>
        <p className="text-sm font-mono font-medium text-text-primary">
          {isActive ? 'Release archive to upload' : 'Drag & drop project or single file'}
        </p>
        <p className="text-xs text-text-muted font-mono mt-1">Supports Python & Java (.zip, .py, .java)</p>
      </div>
    )
  }

  return (
    <div className="w-full h-48 rounded-glass overflow-hidden bg-black/40 border border-white/[0.08] relative">
      <Suspense fallback={<div className="h-full flex items-center justify-center font-mono text-xs text-text-muted">Loading Portal...</div>}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 3]} intensity={2} color="#00F5FF" />
          <PortalRings isActive={isActive} />
        </Canvas>
      </Suspense>
    </div>
  )
}
