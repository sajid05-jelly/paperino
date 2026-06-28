"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, Text3D, Float, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { easing } from "maath";

export function HeroModel() {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Smooth mouse parallax
    easing.dampE(
      groupRef.current.rotation,
      [(state.pointer.y * Math.PI) / 10, (state.pointer.x * Math.PI) / 10, 0],
      0.1,
      delta
    );
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Center>
          <mesh
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            scale={hovered ? 1.1 : 1}
          >
            <torusKnotGeometry args={[2, 0.6, 256, 64]} />
            <MeshTransmissionMaterial
              backside
              samples={4}
              thickness={2}
              chromaticAberration={0.1}
              anisotropy={0.1}
              distortion={0.5}
              distortionScale={0.5}
              temporalDistortion={0.2}
              color="#ffffff"
              roughness={0.1}
            />
          </mesh>
        </Center>
      </Float>
    </group>
  );
}
