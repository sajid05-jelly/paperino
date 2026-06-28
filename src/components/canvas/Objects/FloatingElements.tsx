"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Icosahedron, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

export function FloatingElements() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    groupRef.current.rotation.y = time * 0.1;
    groupRef.current.position.y = Math.sin(time * 0.5) * 1.5;
  });

  // Generate 20 floating abstract shapes
  const elements = Array.from({ length: 20 }).map((_, i) => {
    const position = [
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 15 - 5,
    ] as [number, number, number];

    const scale = Math.random() * 0.5 + 0.2;
    const speed = Math.random() * 0.2 + 0.1;

    return <FloatingShape key={i} position={position} scale={scale} speed={speed} index={i} />;
  });

  return <group ref={groupRef}>{elements}</group>;
}

function FloatingShape({ position, scale, speed, index }: { position: [number, number, number], scale: number, speed: number, index: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.getElapsedTime();
    ref.current.rotation.x = time * speed + index;
    ref.current.rotation.y = time * speed * 1.5 + index;
    ref.current.position.y = position[1] + Math.sin(time * speed * 2 + index) * 2;
  });

  return (
    <Icosahedron args={[1, 1]} position={position} scale={scale} ref={ref}>
      <MeshDistortMaterial
        color={index % 2 === 0 ? "#7b61ff" : "#00f0ff"}
        emissive={index % 2 === 0 ? "#7b61ff" : "#00f0ff"}
        emissiveIntensity={0.5}
        distort={0.4}
        speed={2}
        roughness={0.2}
        metalness={0.8}
        wireframe={index % 3 === 0}
      />
    </Icosahedron>
  );
}
