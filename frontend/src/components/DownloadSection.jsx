import React from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Command, Laptop } from 'lucide-react';

export default function DownloadSection({ downloads, onDownload }) {
  return (
    <section id="download" className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-dark to-background -z-20"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[100px] -z-10"></div>

      <div className="container-custom text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Comece a Criar Agora</h2>
          <p className="text-xl text-gray-400">Escolha sua plataforma e baixe o S.O.S Editor gratuitamente.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <DownloadCard 
            icon={<Monitor size={48} />} 
            os="Windows" 
            version={downloads.find(d => d.os === 'windows')?.version || '5.0'} 
            reqs="Windows 10/11 (64-bit)"
            color="text-blue-400"
            onClick={() => onDownload('windows')}
          />
          <DownloadCard 
            icon={<Command size={48} />} 
            os="macOS" 
            version={downloads.find(d => d.os === 'mac')?.version || '5.0'}
            reqs="macOS 11.0+"
            color="text-gray-200"
            onClick={() => onDownload('mac')}
          />
          <DownloadCard 
            icon={<Laptop size={48} />} 
            os="Linux" 
            version={downloads.find(d => d.os === 'linux')?.version || '5.0'}
            reqs="Ubuntu, Fedora, Arch"
            color="text-yellow-500"
            onClick={() => onDownload('linux')}
          />
        </div>
      </div>
    </section>
  );
}

function DownloadCard({ icon, os, version, reqs, color, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="glass-card p-8 flex flex-col items-center text-center group cursor-pointer border-white/5 hover:border-primary/50"
    >
      <div className={`mb-6 p-4 rounded-full bg-white/5 ${color} group-hover:bg-white/10 transition-colors`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-2">{os}</h3>
      <p className="text-sm text-gray-400 mb-6">{reqs}</p>
      
      <div className="mt-auto w-full">
        <div className="w-full py-3 rounded-lg bg-white/5 border border-white/10 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all font-bold flex items-center justify-center gap-2">
          <Download size={18} />
          <span>Download v{version}</span>
        </div>
      </div>
    </motion.button>
  );
}
