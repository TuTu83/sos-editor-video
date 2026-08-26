import React from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Smartphone } from 'lucide-react';

export default function DownloadSection({ downloads, onDownload }) {
  const win = downloads.find(d => d.os === 'windows') || { os: 'windows', version: '5.0', active: 1 };
  const android = downloads.find(d => d.os === 'android') || { os: 'android', version: null, active: 0 };
  const ios = downloads.find(d => d.os === 'ios') || { os: 'ios', version: null, active: 0 };

  const isActive = (dl) => Number(dl?.active ?? 1) === 1;
  const versionLabel = (dl) => {
    if (!isActive(dl)) return 'Em breve';
    return dl?.version ? `v${dl.version}` : '';
  };

  const handleCardClick = (dl) => {
    if (!isActive(dl)) return;
    onDownload?.(dl.os);
  };

  const mobileActive = isActive(android) || isActive(ios);

  return (
    <section id="download" className="py-24 relative overflow-hidden">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* DESKTOP — WINDOWS (ATIVO) */}
          <DownloadCard
            icon={<Monitor size={48} />}
            groupTitle="Desktop"
            title="Windows"
            version={versionLabel(win)}
            reqs="Windows 10/11 (64-bit)"
            color="text-blue-400"
            active={isActive(win)}
            onClick={() => handleCardClick(win)}
            badge={isActive(win) ? 'Disponível' : 'Indisponível'}
            badgeColor={isActive(win) ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-slate-500/15 text-slate-300 border-slate-400/30'}
          />

          {/* MOBILE — ANDROID + iOS (INATIVOS por enquanto) */}
          <DownloadCard
            icon={<Smartphone size={48} />}
            groupTitle="Mobile"
            title="Android · iOS"
            version="Em breve"
            reqs="Android 8.0+ · iPhone / iPad iOS 15+"
            color="text-fuchsia-300"
            active={mobileActive}
            onClick={() => mobileActive ? handleCardClick(isActive(android) ? android : ios) : undefined}
            badge="Lançamento em breve"
            badgeColor="bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30"
            subtitle={
              <div className="mt-4 grid grid-cols-2 gap-2 w-full text-left">
                <PlatformMini name="Android" active={isActive(android)} version={versionLabel(android)} />
                <PlatformMini name="iOS" active={isActive(ios)} version={versionLabel(ios)} />
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

function PlatformMini({ name, active, version }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs transition-all ${active ? 'bg-white/5 border-white/10' : 'bg-white/[.03] border-dashed border-white/10 opacity-80'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`font-bold ${active ? 'text-white' : 'text-slate-400'}`}>{name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}`}>
          {active ? version || 'OK' : '⏳ Em breve'}
        </span>
      </div>
    </div>
  );
}

function DownloadCard({ icon, groupTitle, title, version, reqs, color, active, onClick, badge, badgeColor, subtitle }) {
  const disabled = !active;
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      className={`glass-card p-7 sm:p-8 flex flex-col items-start text-left group border-white/5 ${
        disabled
          ? 'opacity-80 cursor-not-allowed select-none border-dashed border-white/10'
          : 'cursor-pointer hover:border-primary/50'
      } transition-all`}
      role={disabled ? 'article' : 'button'}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <div className="w-full flex items-start justify-between gap-3 mb-5">
        <div className={`p-3.5 rounded-2xl bg-white/5 ${color} ${!disabled ? 'group-hover:bg-white/10' : ''} transition-colors shadow-[0_12px_30px_-16px_rgba(255,255,255,.25)]`}>
          {icon}
        </div>
        <span className={`text-[10.5px] uppercase tracking-[.18em] font-extrabold px-2.5 py-1 rounded-full border ${badgeColor || ''}`}>
          {badge || ''}
        </span>
      </div>

      <div className="text-[11px] uppercase tracking-[.22em] font-bold text-slate-400">{groupTitle}</div>
      <h3 className="mt-1.5 text-2xl font-extrabold font-display tracking-tight text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400">{reqs}</p>

      {subtitle || null}

      <div className="mt-auto pt-6 w-full">
        <div className={`w-full py-3.5 rounded-xl border font-bold flex items-center justify-center gap-2.5 transition-all ${
          disabled
            ? 'bg-white/5 border-white/10 text-gray-400'
            : 'bg-white/5 border-white/10 group-hover:bg-primary group-hover:border-primary group-hover:text-white shadow-[0_16px_36px_-18px_rgba(59,130,246,.55)]'
        }`}>
          {disabled ? (
            <>
              <span>⏳</span>
              <span>Em breve</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Download {version}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
