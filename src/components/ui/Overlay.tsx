"use client";

import { motion } from "framer-motion";

export function Overlay() {
  return (
    <div className="absolute top-0 left-0 w-full z-10 pointer-events-none">
      <nav className="w-full p-8 flex justify-between items-center pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-white font-bold text-2xl tracking-widest"
        >
          NEXUS<span className="text-[#00f0ff]">3D</span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex gap-8 text-white/80 text-sm tracking-widest uppercase"
        >
          <a href="#" className="hover:text-[#00f0ff] transition-colors">Features</a>
          <a href="#" className="hover:text-[#00f0ff] transition-colors">Technology</a>
          <a href="#" className="hover:text-[#00f0ff] transition-colors">Contact</a>
        </motion.div>
      </nav>

      <main className="h-[200vh] w-full">
        {/* Section 1 */}
        <section className="h-screen w-full flex flex-col justify-center px-[10vw] pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="max-w-2xl"
          >
            <h1 className="text-6xl md:text-8xl font-black text-white leading-tight mb-6">
              THE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7b61ff]">
                FUTURE
              </span>
              <br /> IS HERE.
            </h1>
            <p className="text-lg text-white/70 mb-8 max-w-md">
              Experience the next generation of web design. Premium 3D interactions, 
              glassmorphism UI, and blazing fast performance.
            </p>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/20 transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              EXPLORE NOW
            </button>
          </motion.div>
        </section>

        {/* Section 2 */}
        <section className="h-screen w-full flex flex-col justify-center items-end px-[10vw] pointer-events-auto text-right">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 1 }}
            className="max-w-2xl p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              IMMERSIVE <br />
              <span className="text-[#7b61ff]">EXPERIENCES</span>
            </h2>
            <p className="text-lg text-white/70">
              Break the boundaries of flat design. 
              Our WebGL technology brings your ideas to life in stunning three-dimensional space, 
              running flawlessly at 60 FPS across all devices.
            </p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
