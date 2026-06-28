import { Scene } from "@/components/canvas/Scene";
import { Overlay } from "@/components/ui/Overlay";

export const metadata = {
  title: "Nexus 3D | Premium Futuristic Experience",
  description: "A premium 3D futuristic website built with Next.js, React Three Fiber, and Tailwind CSS.",
};

export default function ThreeDemoPage() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#050510]">
      {/* 3D Canvas Layer */}
      <Scene />
      
      {/* UI Overlay Layer with smooth scrolling */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <Overlay />
      </div>
    </main>
  );
}
