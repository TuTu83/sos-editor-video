import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import DownloadSection from './components/DownloadSection';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import PaymentModal from './components/PaymentModal';
import { API_URL } from './config/api';

function App() {
  const [config, setConfig] = useState({
    site_name: 'S.O.S Editor',
    hero_title: 'Edite vídeos como um profissional',
    hero_subtitle: 'O editor mais leve e poderoso para Windows, Mac e Linux.',
    maintenance_mode: 'false'
  });
  const [plans, setPlans] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

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
            { id: 1, name: 'Iniciante', price: 0, type: 'free' },
            { id: 2, name: 'Pro Mensal', price: 29.90, type: 'monthly' },
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
        alert('Download não disponível no momento. Tente novamente mais tarde.');
    }
  };

  if (config.maintenance_mode === 'true') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-white">
            <div className="text-center p-8 glass-card max-w-lg mx-auto">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500 animate-pulse">
                   <div className="text-4xl">⚠️</div>
                </div>
                <h1 className="text-4xl font-display font-bold mb-4">Em Manutenção</h1>
                <p className="text-gray-400 text-lg">Estamos fazendo melhorias no sistema. Voltamos em breve!</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 font-sans selection:bg-primary selection:text-white overflow-x-hidden">
      <Navbar />
      <Hero config={config} version={downloads.find(d => d.os === 'windows')?.version} />
      <Features />
      <DownloadSection downloads={downloads} onDownload={handleDownload} />
      <Pricing plans={plans} onSelect={setSelectedPlan} />
      <Footer />
      
      {selectedPlan && (
        <PaymentModal 
            plan={selectedPlan} 
            onClose={() => setSelectedPlan(null)} 
            config={config}
        />
      )}
    </div>
  );
}

export default App;
