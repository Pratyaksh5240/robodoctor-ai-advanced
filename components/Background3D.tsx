"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function createParticlePositions() {
  const positions = new Float32Array(4000 * 3);

  for (let i = 0; i < 4000; i++) {
    const base = i * 3;
    const angle = i * 0.37;
    const radius = 1 + (i % 17) * 0.35;
    const depth = ((i * 29) % 100) / 100;

    positions[base] = Math.sin(angle) * radius;
    positions[base + 1] = Math.cos(angle * 1.3) * (radius * 0.8);
    positions[base + 2] = (depth - 0.5) * 15;
  }

  return positions;
}

const PARTICLE_POSITIONS = createParticlePositions();

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.x = time * 0.03;
      ref.current.rotation.y = time * 0.05;
    }
  });

  return (
    <Points ref={ref} positions={PARTICLE_POSITIONS} stride={3}>
      <PointMaterial
        transparent
        color="#22d3ee"
        size={0.03}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}

export default function Background3D() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <FloatingParticles />
      </Canvas>
    </div>
  );
}
