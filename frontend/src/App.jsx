import React, { useState, useEffect } from 'react';
import { Download, Monitor, Laptop, Command, Check, Menu, X, Star, Shield, Zap } from 'lucide-react';
import { API_URL } from './config/api';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [config, setConfig] = useState({
    site_name: 'S.O.S Editor',
    hero_title: 'Edite vídeos como um profissional',
    hero_subtitle: 'O editor mais leve e poderoso para Windows, Mac e Linux.',
    maintenance_mode: 'false'
  });
  const [plans, setPlans] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null); // For payment modal

  useEffect(() => {
    // Fetch Config
    fetch(`${API_URL}/api/config`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setConfig(prev => ({ ...prev, ...data }));
      })
      .catch(err => console.log('Using default config'));

    // Fetch Plans
    fetch(`${API_URL}/api/plans`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(err => {
        // Fallback plans if API fails
        setPlans([
            { id: 1, name: 'Gratuito', price: 0, type: 'free' },
            { id: 2, name: 'Mensal', price: 29.90, type: 'monthly' },
            { id: 3, name: 'Vitalício', price: 199.90, type: 'lifetime' }
        ]);
      });

    // Fetch Downloads
    fetch(`${API_URL}/api/downloads`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDownloads(data);
      })
      .catch(err => console.log('Error fetching downloads'));
  }, []);

  const handleDownload = (os) => {
    fetch(`${API_URL}/api/track/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ os })
    });
    
    // Find URL
    const dl = downloads.find(d => d.os === os);
    if (dl && dl.url) {
        window.location.href = dl.url;
    } else {
        alert('Download não disponível no momento.');
    }
  };

  if (config.maintenance_mode === 'true') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-darker text-white">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Em Manutenção</h1>
                <p>Voltamos em breve!</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker text-gray-100 font-sans selection:bg-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-darker/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 font-bold text-2xl tracking-tighter">
              <span className="text-primary">S.O.S</span> Editor
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#home" className="hover:text-primary transition-colors">Início</a>
                <a href="#features" className="hover:text-primary transition-colors">Recursos</a>
                <a href="#pricing" className="hover:text-primary transition-colors">Preços</a>
                <a href="#about" className="hover:text-primary transition-colors">Sobre</a>
                <button onClick={() => alert('Área do usuário em breve!')} className="hover:text-primary transition-colors">Login</button>
                <a href="#download" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all">Baixar Agora</a>
              </div>
            </div>
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-400 hover:text-white">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-darker border-b border-white/5 px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#home" className="block px-3 py-2 rounded-md hover:bg-white/5">Início</a>
            <a href="#features" className="block px-3 py-2 rounded-md hover:bg-white/5">Recursos</a>
            <a href="#pricing" className="block px-3 py-2 rounded-md hover:bg-white/5">Preços</a>
            <a href="#download" className="block px-3 py-2 text-primary font-bold">Baixar Agora</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
            {config.hero_title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto">
            {config.hero_subtitle}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="#download" className="btn-primary flex items-center justify-center gap-2 text-lg">
              <Download size={24} /> Download Grátis
            </a>
            <a href="#features" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 px-8 rounded-full transition-all text-lg">
              Ver Recursos
            </a>
          </div>
          
          {/* Mockup / Image */}
          <div className="mt-16 mx-auto max-w-5xl glass-panel p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="aspect-video bg-gray-800 rounded-xl overflow-hidden relative group">
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 group-hover:text-primary transition-colors">
                 <Monitor size={64} />
                 <span className="ml-2">Interface do Software</span>
              </div>
              {/* Replace with actual screenshot later */}
              <img src="/assets/screenshot.png" alt="Screenshot" className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" onError={(e) => e.target.style.display='none'} />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Poderoso e Intuitivo</h2>
            <p className="text-gray-400">Tudo o que você precisa para criar vídeos incríveis.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-yellow-400" />} 
              title="Super Rápido" 
              desc="Renderização otimizada para tirar o máximo do seu hardware." 
            />
            <FeatureCard 
              icon={<Shield className="text-green-400" />} 
              title="100% Seguro" 
              desc="Sem marcas d'água forçadas, sem malwares, privacidade total." 
            />
            <FeatureCard 
              icon={<Star className="text-primary" />} 
              title="Efeitos Premium" 
              desc="Biblioteca com centenas de efeitos, transições e filtros." 
            />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <h2 className="text-3xl md:text-4xl font-bold mb-10">Baixe Agora</h2>
           <div className="flex flex-wrap justify-center gap-6">
              <DownloadButton 
                icon={<Monitor />} 
                os="Windows" 
                version={downloads.find(d => d.os === 'windows')?.version || '1.0'} 
                onClick={() => handleDownload('windows')}
              />
              <DownloadButton 
                icon={<Command />} 
                os="macOS" 
                version={downloads.find(d => d.os === 'mac')?.version || '1.0'}
                onClick={() => handleDownload('mac')}
              />
              <DownloadButton 
                icon={<Laptop />} 
                os="Linux" 
                version={downloads.find(d => d.os === 'linux')?.version || '1.0'}
                onClick={() => handleDownload('linux')}
              />
           </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos Flexíveis</h2>
            <p className="text-gray-400">Escolha a melhor opção para você.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map(plan => (
                <PricingCard key={plan.id} plan={plan} onSelect={() => setSelectedPlan(plan)} />
            ))}
          </div>
        </div>
      </section>

      {/* About & Contact */}
      <section id="about" className="py-20 relative bg-darker">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-3xl font-bold mb-6">Sobre o S.O.S Editor</h2>
                    <p className="text-gray-400 mb-4 text-lg leading-relaxed">
                        Nascido da necessidade de um editor leve, rápido e sem complicações, o S.O.S Editor foi desenvolvido com foco total na experiência do usuário.
                    </p>
                    <p className="text-gray-400 mb-6 text-lg leading-relaxed">
                        Nossa missão é democratizar a edição de vídeo, permitindo que qualquer pessoa crie conteúdo de qualidade profissional sem precisar de computadores da NASA.
                    </p>
                </div>
                <div className="bg-dark p-8 rounded-xl border border-white/10">
                    <h3 className="text-2xl font-bold mb-6">Fale Conosco</h3>
                    <p className="text-gray-400 mb-6">Dúvidas? Sugestões? Estamos aqui para ajudar.</p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-300">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary">@</div>
                            {config.contact_email || 'suporte@soseditor.com'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal 
            plan={selectedPlan} 
            onClose={() => setSelectedPlan(null)} 
            config={config}
        />
      )}

      {/* Footer */}
      <footer className="bg-darker border-t border-white/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
            <div className="flex justify-center items-center gap-2 mb-4 font-bold text-xl text-white">
                <span className="text-primary">S.O.S</span> Editor
            </div>
            <p className="mb-4">&copy; 2026 S.O.S Editor. Todos os direitos reservados.</p>
            <div className="flex justify-center gap-6 text-sm">
                <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                <a href="./admin/" className="hover:text-primary transition-colors">Área Admin</a>
            </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="glass-panel p-8 hover:bg-white/10 transition-colors">
            <div className="mb-4 bg-white/5 w-12 h-12 rounded-lg flex items-center justify-center">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-400">{desc}</p>
        </div>
    );
}

function DownloadButton({ icon, os, version, onClick }) {
    return (
        <button onClick={onClick} className="glass-panel p-6 min-w-[200px] flex flex-col items-center hover:scale-105 transition-transform cursor-pointer text-left group">
            <div className="mb-3 text-gray-400 group-hover:text-primary transition-colors">
                {icon}
            </div>
            <div className="font-bold text-lg mb-1">{os}</div>
            <div className="text-sm text-gray-500">Versão {version}</div>
        </button>
    );
}

function PricingCard({ plan, onSelect }) {
    const isPro = plan.type === 'lifetime';
    return (
        <div className={`glass-panel p-8 relative ${isPro ? 'border-primary/50 shadow-lg shadow-primary/10' : ''}`}>
            {isPro && <div className="absolute top-0 right-0 bg-primary text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>}
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="text-4xl font-extrabold mb-6">
                {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}`}
                {plan.type === 'monthly' && <span className="text-sm font-normal text-gray-500">/mês</span>}
            </div>
            <ul className="space-y-3 mb-8 text-gray-400">
                <li className="flex items-center gap-2"><Check size={16} className="text-primary"/> Exportação 4K</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-primary"/> Sem marca d'água</li>
                {isPro && <li className="flex items-center gap-2"><Check size={16} className="text-primary"/> Updates Vitalícios</li>}
            </ul>
            <button onClick={onSelect} className={`w-full py-3 rounded-lg font-bold transition-all ${isPro ? 'bg-primary text-white hover:bg-blue-400' : 'bg-white/10 hover:bg-white/20'}`}>
                Escolher
            </button>
        </div>
    );
}

function PaymentModal({ plan, onClose, config }) {
    const [step, setStep] = useState(1); // 1: Method, 2: Payment
    const [method, setMethod] = useState(null); // 'pix', 'card'
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

    if (plan.price === 0) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-dark p-8 rounded-xl max-w-md w-full text-center border border-white/10">
                    <Check size={64} className="mx-auto text-green-500 mb-4"/>
                    <h2 className="text-2xl font-bold mb-2">Plano Gratuito Ativado!</h2>
                    <p className="text-gray-400 mb-6">Obrigado por usar o S.O.S Editor.</p>
                    <button onClick={onClose} className="btn btn-primary w-full">Fechar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-dark p-8 rounded-xl max-w-md w-full border border-white/10 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                
                <h2 className="text-2xl font-bold mb-6">Checkout ({plan.name})</h2>
                
                {step === 1 && (
                    <>
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-400">Valor:</span>
                                <span className="text-xl font-bold">R$ {plan.price.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex gap-2 mb-2">
                                <input 
                                    className="bg-white/5 border border-white/10 rounded px-3 py-2 flex-1 text-sm" 
                                    placeholder="Cupom de desconto"
                                    value={coupon}
                                    onChange={e => setCoupon(e.target.value)}
                                />
                                <button onClick={checkCoupon} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-sm font-bold">Aplicar</button>
                            </div>
                            {couponMsg && <div className={`text-xs ${discount > 0 ? 'text-green-400' : 'text-red-400'}`}>{couponMsg}</div>}
                            
                            {discount > 0 && (
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10 text-green-400">
                                    <span>Total com desconto:</span>
                                    <span className="text-2xl font-bold">R$ {finalPrice}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <button onClick={() => { setMethod('pix'); setStep(2); }} className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between group">
                                <span className="font-bold flex items-center gap-2"><Zap className="text-yellow-400"/> PIX</span>
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Aprovação Imediata</span>
                            </button>
                            <button onClick={() => { setMethod('card'); setStep(2); }} className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between">
                                <span className="font-bold flex items-center gap-2"><CreditCard className="text-blue-400"/> Cartão de Crédito</span>
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <div className="text-center">
                        {config.payment_active === 'true' ? (
                            <>
                                {method === 'pix' && (
                                    <div className="space-y-4">
                                        <div className="bg-white p-4 rounded mx-auto w-48 h-48 flex items-center justify-center text-black font-bold">
                                            QR CODE
                                        </div>
                                        <div className="text-sm text-gray-400 break-all bg-white/5 p-2 rounded">
                                            {config.pix_key || '00020126360014BR.GOV.BCB.PIX...'}
                                        </div>
                                        <p className="text-yellow-400 text-sm">Aguardando pagamento...</p>
                                    </div>
                                )}
                                {method === 'card' && (
                                    <div className="space-y-4">
                                        <div className="text-left space-y-3">
                                            <input placeholder="Número do Cartão" className="w-full bg-white/5 border border-white/10 rounded px-3 py-2" />
                                            <div className="flex gap-3">
                                                <input placeholder="MM/AA" className="w-1/2 bg-white/5 border border-white/10 rounded px-3 py-2" />
                                                <input placeholder="CVV" className="w-1/2 bg-white/5 border border-white/10 rounded px-3 py-2" />
                                            </div>
                                            <input placeholder="Nome no Cartão" className="w-full bg-white/5 border border-white/10 rounded px-3 py-2" />
                                        </div>
                                        <button className="btn btn-primary w-full mt-4">Pagar R$ {finalPrice}</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-8">
                                <div className="bg-yellow-500/20 text-yellow-500 p-4 rounded-lg mb-4">
                                    <h3 className="font-bold mb-1">Modo de Teste</h3>
                                    <p className="text-sm">O sistema de pagamentos está em modo de simulação.</p>
                                </div>
                                <button className="btn btn-primary w-full">Simular Pagamento Aprovado</button>
                            </div>
                        )}
                        
                        <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-white mt-4 underline">Voltar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
