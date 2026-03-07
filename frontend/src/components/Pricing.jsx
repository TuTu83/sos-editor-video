import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

export default function Pricing({ plans, onSelect }) {
  return (
    <section id="pricing" className="py-24 bg-dark-lighter">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Planos Transparentes</h2>
          <p className="text-xl text-gray-400">Comece grátis, faça upgrade quando precisar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={plan.id} plan={plan} onSelect={onSelect} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({ plan, onSelect, index }) {
  const isPro = plan.type === 'lifetime';
  const isFree = plan.price === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-8 rounded-3xl border flex flex-col ${
        isPro 
          ? 'bg-dark-card border-primary shadow-2xl shadow-primary/10 scale-105 z-10' 
          : 'bg-dark-card/50 border-white/5 hover:border-white/10'
      }`}
    >
      {isPro && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
          Mais Popular
        </div>
      )}

      <h3 className={`text-xl font-bold mb-2 ${isPro ? 'text-primary' : 'text-gray-200'}`}>
        {plan.name}
      </h3>
      
      <div className="mb-6">
        <span className="text-4xl font-display font-bold">
          {isFree ? 'Grátis' : `R$ ${plan.price}`}
        </span>
        {plan.type === 'monthly' && <span className="text-gray-500 ml-2">/mês</span>}
        {plan.type === 'lifetime' && <span className="text-gray-500 ml-2">/única vez</span>}
      </div>

      <div className="flex-1 space-y-4 mb-8">
        <FeatureItem included={true} text="Exportação em HD (1080p)" />
        <FeatureItem included={true} text="Ferramentas de Corte e Edição" />
        <FeatureItem included={!isFree} text="Exportação 4K Ultra HD" />
        <FeatureItem included={!isFree} text="Sem Marca d'água" />
        <FeatureItem included={isPro} text="Atualizações Vitalícias" />
        <FeatureItem included={isPro} text="Suporte Prioritário" />
      </div>

      <button
        onClick={() => onSelect(plan)}
        className={`w-full py-4 rounded-xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 ${
          isPro
            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25'
            : 'bg-white/10 hover:bg-white/20 text-white'
        }`}
      >
        {isFree ? 'Começar Agora' : 'Assinar Agora'}
      </button>
    </motion.div>
  );
}

function FeatureItem({ included, text }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${included ? 'bg-green-500/20 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
        {included ? <Check size={12} /> : <X size={12} />}
      </div>
      <span className={included ? 'text-gray-300' : 'text-gray-600'}>{text}</span>
    </div>
  );
}
