import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, SplitSquareHorizontal, Layers, Play, Pause } from 'lucide-react';

// Tool Icon Component
const ToolIcon = ({ icon, label, isActive }) => (
  <div className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-500'}`}>
    <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20' : 'bg-white/5'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </div>
);

// Timeline Clip Component
const Clip = ({ width, color, opacity = 1, x = 0 }) => (
  <motion.div
    className={`h-12 rounded-md absolute top-1 ${color} border border-white/10`}
    style={{ width: `${width}%`, left: `${x}%`, opacity }}
    initial={{ scaleY: 0 }}
    animate={{ scaleY: 1 }}
    transition={{ duration: 0.3 }}
  />
);

export default function PreviewEditor() {
  const [activeMode, setActiveMode] = useState(0); // 0: Trim, 1: Split, 2: Transition
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMode((prev) => (prev + 1) % 3);
    }, 4000); // Change mode every 4 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full bg-dark-card/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 flex flex-col shadow-2xl">
      {/* Top Bar: Preview Area */}
      <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        
        {/* Animated Preview Screen */}
        <div className="w-3/4 h-3/4 bg-dark-lighter rounded-lg overflow-hidden relative border border-white/5 shadow-inner flex items-center justify-center">
           <AnimatePresence mode="wait">
             <motion.div 
               key={activeMode}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="text-center"
             >
                <div className="text-4xl mb-2">
                  {activeMode === 0 && "✂️"}
                  {activeMode === 1 && "⚡"}
                  {activeMode === 2 && "🌫️"}
                </div>
                <div className="text-gray-400 font-display font-bold text-lg">
                  {activeMode === 0 && "Corte Preciso"}
                  {activeMode === 1 && "Divisão Rápida"}
                  {activeMode === 2 && "Transição Suave"}
                </div>
             </motion.div>
           </AnimatePresence>
           
           {/* Fake Playhead Overlay */}
           <motion.div 
             className="absolute top-0 bottom-0 w-[2px] bg-primary/50 z-10"
             animate={{ left: ["0%", "100%"] }}
             transition={{ duration: 4, ease: "linear", repeat: Infinity }}
           />
        </div>
      </div>

      {/* Middle Bar: Tools */}
      <div className="h-14 border-y border-white/5 bg-dark-lighter px-6 flex items-center justify-between">
        <div className="flex gap-6">
          <ToolIcon icon={<Scissors size={18} />} label="Cortar" isActive={activeMode === 0} />
          <ToolIcon icon={<SplitSquareHorizontal size={18} />} label="Dividir" isActive={activeMode === 1} />
          <ToolIcon icon={<Layers size={18} />} label="Transição" isActive={activeMode === 2} />
        </div>
        <div className="flex items-center gap-3 text-gray-500">
           <span className="text-xs font-mono">00:00:12:05</span>
           {isPlaying ? <Pause size={16} className="text-primary"/> : <Play size={16} />}
        </div>
      </div>

      {/* Bottom Bar: Timeline */}
      <div className="h-24 bg-dark-card p-4 relative overflow-hidden">
        {/* Timeline Ruler */}
        <div className="absolute top-0 left-0 right-0 h-4 border-b border-white/5 flex justify-between px-2">
           {[...Array(20)].map((_, i) => (
             <div key={i} className="w-[1px] h-2 bg-white/10 mt-2" />
           ))}
        </div>

        {/* Tracks Container */}
        <div className="relative mt-2 h-full w-full">
           <AnimatePresence mode="wait">
             {activeMode === 0 && (
               <motion.div key="trim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                  {/* Original Clip */}
                  <Clip width={80} x={10} color="bg-blue-500/40" />
                  {/* Trim Action: Brackets moving in */}
                  <motion.div 
                    className="absolute top-1 h-12 border-l-2 border-primary w-4 z-20 bg-primary/10"
                    initial={{ left: "0%" }}
                    animate={{ left: "10%" }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                  />
                  <motion.div 
                    className="absolute top-1 h-12 border-r-2 border-primary w-4 z-20 bg-primary/10"
                    style={{ left: "auto", right: 0 }}
                    initial={{ right: "0%" }}
                    animate={{ right: "10%" }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                  />
               </motion.div>
             )}

             {activeMode === 1 && (
               <motion.div key="split" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                  {/* Clip Splitting */}
                  <motion.div
                    className="h-12 rounded-md absolute top-1 bg-purple-500/40 border border-white/10"
                    initial={{ width: "100%", left: "0%", gap: 0 }}
                    animate={{ 
                       width: ["100%", "48%"], // Split into two
                       left: ["0%", "0%"]
                    }}
                    transition={{ duration: 1, times: [0, 0.5], repeat: Infinity, repeatDelay: 1 }}
                  />
                  <motion.div
                    className="h-12 rounded-md absolute top-1 bg-purple-500/40 border border-white/10"
                    initial={{ width: "0%", left: "50%", opacity: 0 }}
                    animate={{ 
                       width: ["0%", "48%"], 
                       left: ["50%", "52%"],
                       opacity: [0, 1]
                    }}
                    transition={{ duration: 1, times: [0, 0.5], repeat: Infinity, repeatDelay: 1 }}
                  />
                  {/* Split Line Indicator */}
                  <motion.div 
                    className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-30"
                    initial={{ left: "50%", opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                  />
               </motion.div>
             )}

             {activeMode === 2 && (
               <motion.div key="transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                  {/* Clip A */}
                  <Clip width={45} x={0} color="bg-pink-500/40" />
                  {/* Clip B */}
                  <Clip width={45} x={55} color="bg-cyan-500/40" />
                  {/* Transition Block */}
                  <motion.div 
                    className="absolute top-1 h-12 bg-white/20 z-20 rounded-sm backdrop-blur-sm"
                    initial={{ width: "0%", left: "50%", opacity: 0 }}
                    animate={{ width: "10%", left: "45%", opacity: 1 }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                  />
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
