import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, CreditCard, Copy } from 'lucide-react';

export default function PaymentModal({ plan, onClose, config }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');

  const finalPrice = Math.max(0, plan.price * (1 - discount / 100)).toFixed(2);

  const checkCoupon = () => {
    fetch('/api/check-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            setCouponMsg('Cupom inválido');
            setDiscount(0);
        } else {
            setCouponMsg(`Desconto de ${data.discount}% aplicado!`);
            setDiscount(data.discount);
        }
    });
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { scale: 0.8, opacity: 0, y: 50 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 500 } },
    exit: { scale: 0.8, opacity: 0, y: 50 }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="bg-dark-card border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-primary/20"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h3 className="text-xl font-bold font-display">
              {plan.price === 0 ? 'Plano Gratuito' : `Checkout - ${plan.name}`}
            </h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-8">
            {plan.price === 0 ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 animate-bounce">
                  <Check size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Sucesso!</h2>
                <p className="text-gray-400 mb-8">Seu plano gratuito foi ativado.</p>
                <button onClick={onClose} className="btn-primary w-full">Continuar</button>
              </div>
            ) : (
              <>
                {step === 1 ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-gray-400">Total a pagar:</span>
                      <span className="text-3xl font-bold text-white">R$ {finalPrice}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400 ml-1">Cupom de Desconto</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={coupon}
                          onChange={(e) => setCoupon(e.target.value)}
                          placeholder="DIGITE AQUI" 
                          className="flex-1 bg-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors uppercase"
                        />
                        <button 
                          onClick={checkCoupon}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
                        >
                          Aplicar
                        </button>
                      </div>
                      {couponMsg && (
                        <p className={`text-sm ml-1 ${discount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {couponMsg}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <p className="text-sm font-medium text-gray-400 mb-4 ml-1">Escolha o método de pagamento:</p>
                      <div className="grid gap-3">
                        <button 
                          onClick={() => { setMethod('pix'); setStep(2); }}
                          className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                              <Zap size={20} />
                            </div>
                            <span className="font-bold">PIX</span>
                          </div>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Instantâneo</span>
                        </button>

                        <button 
                          onClick={() => { setMethod('card'); setStep(2); }}
                          className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                              <CreditCard size={20} />
                            </div>
                            <span className="font-bold">Cartão de Crédito</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    {method === 'pix' ? (
                      <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg shadow-primary/20">
                           {/* Placeholder QR Code */}
                           <div className="w-full h-full bg-black/10 flex items-center justify-center text-black font-bold text-xs">QR CODE AQUI</div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-gray-400">Ou copie a chave PIX:</p>
                          <div className="flex items-center gap-2 p-3 bg-dark rounded-lg border border-white/10">
                            <code className="text-xs text-gray-300 flex-1 truncate font-mono">
                              {config.pix_key || '00020126360014BR.GOV.BCB.PIX...'}
                            </code>
                            <button className="p-2 hover:text-primary transition-colors" title="Copiar">
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
                          Após o pagamento, seu plano será ativado automaticamente em até 5 minutos.
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-gray-400">
                        <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Integração com cartão em manutenção.</p>
                        <button onClick={() => setStep(1)} className="mt-4 text-primary hover:underline text-sm">Voltar</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
