import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Play, ChevronRight, Monitor, Star } from 'lucide-react';
import PreviewEditor from './PreviewEditor';

const slides = [
  {
    id: 1,
    title: "Edite vídeos como um profissional",
    subtitle: "O editor mais leve e poderoso para Windows, Mac e Linux.",
    bgGradient: "from-primary/20 via-background to-background",
    accent: "text-primary"
  },
  {
    id: 2,
    title: "Crie conteúdo viral em minutos",
    subtitle: "Ferramentas inteligentes que aceleram seu fluxo de trabalho.",
    bgGradient: "from-secondary/20 via-background to-background",
    accent: "text-secondary"
  },
  {
    id: 3,
    title: "Performance máxima no seu PC",
    subtitle: "Otimizado para rodar suave até em computadores mais antigos.",
    bgGradient: "from-accent/20 via-background to-background",
    accent: "text-accent"
  }
];

export default function Hero({ config, version }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const versionLabel = version || '1.0.5';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Dynamic Background */}
      <AnimatePresence mode='wait'>
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className={`absolute inset-0 bg-gradient-radial ${slides[currentSlide].bgGradient} opacity-30 -z-10`}
        />
      </AnimatePresence>

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-10 w-24 h-24 bg-primary/10 rounded-full blur-xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-secondary/10 rounded-full blur-xl animate-pulse-slow delay-1000"></div>

      <div className="container-custom relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <div className="text-center lg:text-left">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300 mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Versão {versionLabel} Disponível
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              {slides[currentSlide].title.split(' ').map((word, i) => (
                <span key={i} className={i === 1 || i === 2 ? `text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary` : ''}>
                  {word}{' '}
                </span>
              ))}
            </h1>
            
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {slides[currentSlide].subtitle}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <a href="#download" className="btn-primary flex items-center justify-center gap-2 text-lg group">
              <Download size={20} className="group-hover:animate-bounce" /> 
              Download Grátis
            </a>
            <a href="#features" className="btn-secondary flex items-center justify-center gap-2 text-lg group">
              <Play size={20} className="group-hover:text-primary transition-colors" />
              Ver Demo
            </a>
          </motion.div>
          
          <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-dark-card border border-dark flex items-center justify-center text-xs font-bold text-gray-400">
                  U{i}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex text-yellow-500">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
              <span>+10k usuários</span>
            </div>
          </div>
        </div>

        {/* Hero Visual/Carousel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative hidden lg:block h-[400px]"
        >
          {/* Replaced static mock with PreviewEditor */}
          <div className="relative z-10 w-full h-full transform hover:scale-[1.02] transition-transform duration-500">
             <PreviewEditor />
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-primary to-secondary rounded-full opacity-20 blur-3xl animate-float"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-secondary to-accent rounded-full opacity-20 blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        </motion.div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentSlide === index ? 'bg-primary w-8' : 'bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
