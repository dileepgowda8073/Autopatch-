import React, { useRef, useMemo, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useUiStore } from '@/store/uiStore'

interface HeroSceneProps {
  patched?: boolean
}

function BugParticles({ patched = false }: { patched?: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const count = 70

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      radius: 2 + (i % 3) * 1.2,
      speed: 0.4 + Math.random() * 0.8,
      angle: Math.random() * Math.PI * 2,
      y: (Math.random() - 0.5) * 3,
      scale: 0.08 + Math.random() * 0.08,
    }))
  }, [count])

  const targetColor = useMemo(
    () => new THREE.Color(patched ? '#10B981' : '#EF4444'),
    [patched]
  )
  const currentColor = useRef(new THREE.Color('#EF4444'))

  useFrame((_, delta) => {
    if (!meshRef.current) return
    currentColor.current.lerp(targetColor, delta * 3)

    particles.forEach((p, i) => {
      p.angle += p.speed * delta
      const x = Math.cos(p.angle) * p.radius
      const z = Math.sin(p.angle) * p.radius
      dummy.position.set(x, p.y + Math.sin(p.angle * 2) * 0.2, z)
      dummy.scale.setScalar(p.scale)
      dummy.rotation.x += delta
      dummy.rotation.y += delta
      dummy.updateMatrix()

      meshRef.current!.setMatrixAt(i, dummy.matrix)
      meshRef.current!.setColorAt(i, currentColor.current)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.8}
        emissive={patched ? '#059669' : '#DC2626'}
        emissiveIntensity={1.5}
      />
    </instancedMesh>
  )
}

function CodeBlocks() {
  return (
    <>
      <Float speed={2} rotationIntensity={1} floatIntensity={2} position={[-3, 1.5, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 0.7, 0.1]} />
          <meshPhysicalMaterial
            color="#00F5FF"
            transmission={0.7}
            opacity={0.8}
            transparent
            roughness={0.1}
            metalness={0.2}
          />
        </mesh>
      </Float>

      <Float speed={2.5} rotationIntensity={1.2} floatIntensity={2} position={[3, -1, 1]}>
        <mesh>
          <boxGeometry args={[1, 0.9, 0.1]} />
          <meshPhysicalMaterial
            color="#8B5CF6"
            transmission={0.7}
            opacity={0.8}
            transparent
            roughness={0.1}
            metalness={0.2}
          />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.8} floatIntensity={1.5} position={[-2.2, -2, 0.5]}>
        <mesh>
          <boxGeometry args={[1.4, 0.6, 0.1]} />
          <meshPhysicalMaterial
            color="#00F5FF"
            transmission={0.8}
            opacity={0.6}
            transparent
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>
      </Float>
    </>
  )
}

function CentralCore() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
      meshRef.current.rotation.x += delta * 0.2
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color="#00F5FF"
          emissive="#00F5FF"
          emissiveIntensity={1.2}
          wireframe
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          color="#8B5CF6"
          emissive="#8B5CF6"
          emissiveIntensity={2}
          roughness={0.2}
        />
      </mesh>
    </group>
  )
}

function SceneContent({ patched }: { patched?: boolean }) {
  useFrame(({ camera, mouse }) => {
    // Parallax mouse damping
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 1.2, 0.05)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 0.8, 0.05)
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={2} color="#00F5FF" />
      <pointLight position={[-5, -5, -2]} intensity={1.5} color="#8B5CF6" />
      <Stars radius={50} depth={50} count={300} factor={3} fade speed={1} />

      <CentralCore />
      <BugParticles patched={patched} />
      <CodeBlocks />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          intensity={1.2}
        />
      </EffectComposer>
    </>
  )
}

export default function HeroScene({ patched = false }: HeroSceneProps) {
  const reducedMotion = useUiStore((s) => s.reducedMotion)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const supported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
      setHasWebGL(supported)
    } catch {
      setHasWebGL(false)
    }
  }, [])

  if (reducedMotion || !hasWebGL) {
    return (
      <div className="w-full h-full min-h-[360px] flex items-center justify-center bg-gradient-to-br from-cyan/10 via-base to-violet/10 rounded-glass-xl border border-white/[0.08] relative overflow-hidden">
        <div className="text-center p-6 space-y-2">
          <div className="w-16 h-16 rounded-full bg-cyan/20 border border-cyan/40 flex items-center justify-center mx-auto text-2xl text-cyan shadow-[0_0_20px_rgba(0,245,255,0.3)]">
            🛡️
          </div>
          <h3 className="text-lg font-bold text-white font-mono">Autonomous Bug Shield</h3>
          <p className="text-xs text-text-muted font-mono">
            {patched ? 'All detected bugs patched & verified.' : 'Active monitoring of signal sources.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[420px] relative">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-cyan">
            Initializing 3D Canvas...
          </div>
        }
      >
        <Canvas
          camera={{ fov: 60, position: [0, 0, 8] }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneContent patched={patched} />
        </Canvas>
      </Suspense>
    </div>
  )
}
