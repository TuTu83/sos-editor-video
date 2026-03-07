import PreviewEditor from './PreviewEditor';

// ... (imports remain the same)

// ... (slides definition remains the same)

export default function Hero({ config }) {
  // ... (state and effects remain the same)

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* ... (background and floating elements remain the same) ... */}

      <div className="container-custom relative z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <div className="text-center lg:text-left">
           {/* ... (text content remains exactly the same) ... */}
           <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300 mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Versão 5.0 Disponível
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
