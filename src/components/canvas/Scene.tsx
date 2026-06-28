"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, PresentationControls, PerformanceMonitor } from "@react-three/drei";
import { Suspense, useState } from "react";
import { HeroModel } from "./Objects/HeroModel";
import { FloatingElements } from "./Objects/FloatingElements";
import { Effects } from "./Effects";

export function Scene() {
  const [dpr, setDpr] = useState(1.5);

  return (
    <div className="absolute inset-0 z-0 h-screen w-full bg-[#050510]">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        dpr={dpr}
        gl={{ antialias: false, alpha: false }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)}>
          <color attach="background" args={["#050510"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} color="#00f0ff" />
          <directionalLight position={[-10, -10, -10]} intensity={1} color="#7b61ff" />
          
          <Suspense fallback={null}>
            <Environment preset="city" />
            <PresentationControls
              global
              rotation={[0, 0, 0]}
              polar={[-Math.PI / 4, Math.PI / 4]}
              azimuth={[-Math.PI / 4, Math.PI / 4]}
            >
              <HeroModel />
            </PresentationControls>
            
            <FloatingElements />
            <Effects />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
