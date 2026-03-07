import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Star, Layout, Smartphone, Cloud } from 'lucide-react';

const features = [
  {
    icon: <Zap className="text-yellow-400" size={32} />,
    title: "Ultra Rápido",
    desc: "Motor de renderização otimizado que aproveita 100% da sua GPU para exportações instantâneas."
  },
  {
    icon: <Shield className="text-green-400" size={32} />,
    title: "100% Seguro",
    desc: "Sem malwares, sem rastreadores ocultos e total respeito à sua privacidade de dados."
  },
  {
    icon: <Layout className="text-primary" size={32} />,
    title: "Interface Intuitiva",
    desc: "Design arrastar-e-soltar que permite que iniciantes editem como profissionais em minutos."
  },
  {
    icon: <Star className="text-purple-400" size={32} />,
    title: "Efeitos Premium",
    desc: "Biblioteca com +500 transições, filtros e efeitos visuais prontos para usar."
  },
  {
    icon: <Smartphone className="text-pink-400" size={32} />,
    title: "Modo Vertical",
    desc: "Ferramentas dedicadas para TikTok, Reels e Shorts com ajuste automático de proporção."
  },
  {
    icon: <Cloud className="text-blue-400" size={32} />,
    title: "Backup na Nuvem",
    desc: "Salve seus projetos automaticamente e continue editando de qualquer lugar."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-dark-lighter relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="container-custom relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-display font-bold mb-6"
          >
            Poderoso. <span className="text-gradient">Simples.</span> Completo.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400"
          >
            Tudo o que você precisa para transformar suas ideias em vídeos incríveis, sem a complexidade dos softwares tradicionais.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-8 group hover:-translate-y-2 transition-transform duration-300"
    >
      <div className="mb-6 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-white/10">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {feature.desc}
      </p>
    </motion.div>
  );
}
