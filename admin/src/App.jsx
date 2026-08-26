import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Settings, Download, CreditCard, LogOut, Save, Activity,
  Ticket, Users, User, Menu, X, Search, Ban, CheckCircle, Clock, Shield, AlertTriangle,
  Zap, Copy, ExternalLink, Plus, Trash2, Calendar, Smartphone, Monitor,
  KeyRound, Tag
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { API_URL, setApiBaseOverride, getApiBaseOverride, clearApiBaseOverride } from './config/api';

/* =========================================================
   SOS EDITOR — ADMIN PAINEL v2.0
   Liga 100% das rotas do Worker (Cloudflare D1):
   Stats, Settings (manutenção, preços, pix, trial),
   Downloads (windows/android/ios), Plans (preços admin),
   Coupons (criar/ativar/delete), Users (lista/detalhe/
   status/grant/activate-subscription-vitalicio).
   ========================================================= */

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [overrideInput, setOverrideInput] = useState(() => getApiBaseOverride() || API_URL);

  if (!token) return (
    <Login
      setToken={setToken}
      overrideInput={overrideInput}
      setOverrideInput={setOverrideInput}
    />
  );
  return <Dashboard token={token} setToken={setToken} />;
}

/* ================= HELPERS ================= */
function authH(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
function toast(msg, kind = 'info') {
  const colors = {
    ok: 'bg-emerald-600', err: 'bg-red-600', warn: 'bg-amber-600', info: 'bg-sky-700',
  };
  const id = 't_' + Date.now();
  const d = document.createElement('div');
  d.id = id;
  d.className = `fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg shadow-2xl text-white font-bold border border-white/10 ${colors[kind] || colors.info}`;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}
function fmtBRL(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return String(s); }
}
function daysBetweenIso(a, b) {
  try {
    const ms = new Date(b) - new Date(a);
    return Math.max(0, Math.ceil(ms / 86400000));
  } catch { return 0; }
}

/* ================= LOGIN ================= */
function Login({ setToken, overrideInput, setOverrideInput }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const applyOverride = () => {
    const v = String(overrideInput || '').trim().replace(/\/+$/, '');
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) { toast('URL inválida (precisa de http:// ou https://)', 'err'); return; }
    if (v === API_URL) { clearApiBaseOverride(); toast('Override limpo — usando padrão.', 'ok'); }
    else { setApiBaseOverride(v); toast('API URL alterada. Recarregando…', 'ok'); }
    setTimeout(() => location.reload(), 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        toast('Login OK', 'ok');
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err) {
      const msg = err?.message ? err.message : String(err || 'Network error');
      setError(
        '⚠️ Erro de conexão com a API (' + API_URL + '). Verifique Worker deploy. ' +
        'Detalhes: ' + msg.slice(0, 90)
      );
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#07090f] via-[#0a1020] to-[#0d0516] px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <div className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            SOS Editor · Painel Admin
          </div>
          <p className="mt-2 text-slate-400 text-sm">Gerencie usuários, planos, cupons, manutenção e downloads.</p>
        </div>

        <div className="bg-dark p-6 sm:p-7 rounded-2xl border border-white/10 shadow-[0_24px_80px_-30px_rgba(56,189,248,.35)]">
          <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">
            <div className="font-bold mb-1">🔌 URL da API (atual: {API_URL})</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white"
                value={overrideInput}
                onChange={e => setOverrideInput(e.target.value)}
                placeholder="https://sos-editor-api.etc.workers.dev"
              />
              <button type="button" onClick={applyOverride}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold">
                Aplicar / Testar URL
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Admin Login</h2>
            {error && <div className="bg-red-500/20 text-red-300 border border-red-400/30 p-3 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm mb-1.5 text-slate-300">Usuário</label>
              <input type="text" autoComplete="username" required
                value={username} onChange={e => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="tutupoker" />
            </div>
            <div>
              <label className="block text-sm mb-1.5 text-slate-300">Senha</label>
              <input type="password" autoComplete="current-password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                placeholder="••••••••" />
            </div>
            <button disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 rounded-xl font-extrabold hover:opacity-90 disabled:opacity-60 text-white shadow-[0_12px_40px_-18px_rgba(56,189,248,.6)]">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function Dashboard({ token, setToken }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const logout = () => {
    if (!confirm('Sair do painel admin?')) return;
    localStorage.removeItem('token'); setToken(null);
  };

  const tabs = [
    { id: 'stats', label: 'Estatísticas', icon: <LayoutDashboard size={20}/> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20}/> },
    { id: 'downloads', label: 'Downloads', icon: <Download size={20}/> },
    { id: 'plans', label: 'Planos & Preços', icon: <CreditCard size={20}/> },
    { id: 'coupons', label: 'Cupons', icon: <Ticket size={20}/> },
    { id: 'users', label: 'Usuários & Licenças', icon: <Users size={20}/> },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'stats': return <StatsTab token={token} />;
      case 'settings': return <SettingsTab token={token} />;
      case 'downloads': return <DownloadsTab token={token} />;
      case 'plans': return <PlansTab token={token} />;
      case 'coupons': return <CouponsTab token={token} />;
      case 'users': return <UsersTab token={token} />;
      default: return <StatsTab token={token} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#06080f] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-fuchsia-500/10 blur-[120px] rounded-full" />

      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-dark border-b border-white/10 flex items-center justify-between px-4 z-30">
        <div className="text-lg font-bold bg-gradient-to-r from-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
          SOS Editor Admin
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5"><Menu size={22}/></button>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-dark/80 backdrop-blur border-r border-white/10 p-5 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-2xl font-extrabold bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              SOS Editor
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Painel Administrativo</div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-lg hover:bg-white/5"><X size={20}/></button>
        </div>

        <nav className="flex-1 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,.6)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <button onClick={logout}
          className="mt-6 flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 border border-red-400/20 transition-colors">
          <LogOut size={18}/> <span className="font-semibold">Sair</span>
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto pt-20 md:pt-8 h-screen w-full relative z-10">
        {renderContent()}
      </main>
    </div>
  );
}

/* ================= STATS ================= */
function StatsTab({ token }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(p => {
        const d = p?.data || p || {};
        setStats({
          total_users: Number(d.total_users || 0),
          trial_active: Number(d.trial_active || 0),
          total_videos: Number(d.total_videos || 0),
          total_videos_size_bytes: Number(d.total_videos_size_bytes || 0),
          total_downloads: Number(d.total_downloads || 0),
          downloadsByOS: Array.isArray(d.downloadsByOS) ? d.downloadsByOS : [],
        });
      })
      .catch(() => toast('Erro ao carregar estatísticas', 'err'));
  }, [token]);

  const dlArr = Array.isArray(stats?.downloadsByOS) ? stats.downloadsByOS : [];
  const chartOS = useMemo(() => dlArr.map(x => ({ os: (x.os||'?').toUpperCase(), count: Number(x.count||0) })), [dlArr]);
  if (!stats) return <Loader />;

  const sizeGB = (stats.total_videos_size_bytes / 1024 / 1024 / 1024);

  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Visão Geral</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard title="Usuários (total)" value={stats.total_users} icon={<Users className="text-sky-400"/>} sub={`${stats.trial_active} em trial ativo`} />
        <StatCard title="Vídeos publicados" value={stats.total_videos} icon={<Activity className="text-fuchsia-400"/>} sub={`${sizeGB.toFixed(2)} GB armazenados`} />
        <StatCard title="Downloads (total)" value={stats.total_downloads} icon={<Download className="text-emerald-400"/>} />
        {dlArr.slice(0, 1).map(d => (
          <StatCard key={String(d.os||'dl-1')} title={`Downloads ${(d.os||'').toUpperCase()}`} value={Number(d.count||0)} icon={<OSIcon os={d.os}/>} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Downloads por plataforma">
          {chartOS.length === 0
            ? <Empty>Nenhum download contabilizado ainda.</Empty>
            : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartOS}>
                  <CartesianGrid stroke="#24304a" strokeDasharray="3 3" />
                  <XAxis stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0b1222', border: '1px solid #1f2a44', borderRadius: 12 }} />
                  <Bar dataKey="count" fill="url(#gradDownloads)" radius={[8,8,0,0]} />
                  <defs>
                    <linearGradient id="gradDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8"/>
                      <stop offset="100%" stopColor="#a855f7"/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
        </Card>

        <Card title="Saúde da Licença (7 dias trava trial)">
          <div className="grid grid-cols-2 gap-4">
            <Mini title="Trial ativo agora" value={stats.trial_active} color="from-emerald-400 to-teal-500" icon={<Clock size={22}/>} />
            <Mini title="Usuários" value={stats.total_users} color="from-sky-400 to-indigo-500" icon={<Users size={22}/>} />
            <Mini title="Vídeos" value={stats.total_videos} color="from-fuchsia-400 to-pink-500" icon={<Activity size={22}/>} />
            <Mini title="Armazenamento" value={`${sizeGB.toFixed(2)} GB`} color="from-amber-400 to-orange-500" icon={<Shield size={22}/>} />
          </div>
          <div className="mt-5 rounded-xl border border-sky-400/20 bg-sky-500/5 p-4 text-xs text-sky-200">
            <div className="font-bold mb-1">🧭 Como funciona o bloqueio após 7 dias:</div>
            1. Usuário abre App Electron → device_id é criado → trial de 7 dias inicia (trial_ends_at).<br/>
            2. Todo início do app consulta /api/license/status → buildUserStatus().<br/>
            3. Expirou trial (allowed=false) e NÃO tem grant → App trava tela de pagamento.<br/>
            4. Pagou PIX ou usou cupom 100%? → grant vitalício (3650 dias) ou 30 dias.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= SETTINGS (MANUTENÇÃO + PREÇOS + PIX + TRIAL) ================= */
function SettingsTab({ token }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      // (A) settings do Admin (todas as configs, inclusive manutenção/pagamento)
      const r1 = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());
      const fromAdmin = r1?.data || r1?.settings || {};
      // (B) preços dos plans (mensal = id 2, vitalício = id 3)
      const r2 = await fetch(`${API_URL}/api/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());
      const plans = Array.isArray(r2?.plans) ? r2.plans : (Array.isArray(r2?.data) ? r2.data : []);
      const monthly = plans.find(p => Number(p.id) === 2 || p.type === 'monthly') || { id: 2, price: 4.99 };
      const lifetime = plans.find(p => Number(p.id) === 3 || p.type === 'lifetime') || { id: 3, price: 199.90 };

      setSettings({
        ...fromAdmin,
        plan_monthly_price: Number(monthly.price || 0),
        plan_monthly_id: Number(monthly.id || 2),
        plan_lifetime_price: Number(lifetime.price || 0),
        plan_lifetime_id: Number(lifetime.id || 3),
      });
    } catch { toast('Erro ao carregar configurações', 'err'); }
  };

  useEffect(() => { fetchSettings(); }, [token]);

  const setVal = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setLoading(true);
    try {
      // (1) Salva settings globais (allowedKeys do Worker)
      const bodySettings = {};
      [
        'site_name','hero_title','hero_subtitle','logo_url','contact_email','maintenance_mode',
        'payment_active','pix_key','trial_days','free_trial_enabled'
      ].forEach(k => {
        if (k in settings) bodySettings[k] = String(settings[k]);
      });
      const r1 = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT', headers: authH(token), body: JSON.stringify(bodySettings)
      }).then(r => r.json());
      if (r1?.status !== 'success') throw new Error(r1?.error || 'Falha ao salvar settings');

      // (2) Salva preços dos plans (mensal 2 e vitalício 3)
      const plans = [
        { id: settings.plan_monthly_id || 2, price: Number(settings.plan_monthly_price) },
        { id: settings.plan_lifetime_id || 3, price: Number(settings.plan_lifetime_price) },
      ];
      for (const p of plans) {
        const r2 = await fetch(`${API_URL}/api/admin/plans/${p.id}`, {
          method: 'PUT', headers: authH(token), body: JSON.stringify({ price: Number(p.price) })
        }).then(r => r.json());
        if (r2?.status !== 'success') throw new Error(`Plano ${p.id}: ${r2?.error || 'falha'}`);
      }
      toast('Todas as configurações salvas!', 'ok');
      await fetchSettings();
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); }
    finally { setLoading(false); }
  };

  const maintenanceOn = String(settings.maintenance_mode || 'false') === 'true' || String(settings.maintenance_mode) === '1';
  const paymentOn = String(settings.payment_active || 'true') === 'true' || String(settings.payment_active) === '1';
  const freeTrialOn = String(settings.free_trial_enabled || 'true') === 'true' || String(settings.free_trial_enabled) === '1';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight">Configurações Gerais</h2>
        <button onClick={save} disabled={loading}
          className="btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 font-extrabold shadow-lg disabled:opacity-60">
          <Save size={18}/> {loading ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="space-y-6">
        <Card title="⚠️ Modo Manutenção do Site/App" icon={<AlertTriangle size={20} className="text-amber-400"/>}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-slate-400 mb-1">Quando ativado, site oficial e player podem exibir banner de manutenção.</div>
              <select
                value={maintenanceOn ? 'true' : 'false'}
                onChange={e => setVal('maintenance_mode', e.target.value)}
                className="w-full sm:w-60 bg-black/30 border border-white/10 rounded-xl p-3 text-white">
                <option value="false">❌ Desativado</option>
                <option value="true">🟡 Ativado (manutenção)</option>
              </select>
            </div>
            <div className={`rounded-xl border px-4 py-3 font-bold text-sm ${maintenanceOn ? 'bg-amber-500/10 border-amber-400/40 text-amber-300' : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'}`}>
              {maintenanceOn ? 'MANUTENÇÃO ATIVA' : 'Site/App operando normalmente'}
            </div>
          </div>
        </Card>

        <Card title="💰 Planos & Preços (autoridade comercial aqui no Admin)" icon={<CreditCard size={20} className="text-fuchsia-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Plano Mensal (id 2) — preço em R$</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">R$</span>
                <input type="number" step="0.01" min="0"
                  value={settings.plan_monthly_price ?? ''}
                  onChange={e => setVal('plan_monthly_price', e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold" />
              </div>
              <div className="mt-1 text-xs text-slate-400">Valor exibido no App após 7 dias de trial expirar. = {fmtBRL(settings.plan_monthly_price)}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Plano Único Vitalício (id 3) — preço em R$</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">R$</span>
                <input type="number" step="0.01" min="0"
                  value={settings.plan_lifetime_price ?? ''}
                  onChange={e => setVal('plan_lifetime_price', e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold" />
              </div>
              <div className="mt-1 text-xs text-slate-400">Pagamento único → App liberado permanentemente. = {fmtBRL(settings.plan_lifetime_price)}</div>
            </div>
          </div>
        </Card>

        <Card title="💳 Pagamentos (PIX Chave + Modo Produção)" icon={<Zap size={20} className="text-emerald-400"/>}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm text-slate-400 mb-1">Sistema de Pagamento</label>
                <select value={paymentOn ? 'true' : 'false'}
                  onChange={e => setVal('payment_active', e.target.value)}
                  className="w-full sm:w-72 bg-black/30 border border-white/10 rounded-xl p-3 text-white">
                  <option value="false">🧪 Desativado (Modo Teste)</option>
                  <option value="true">✅ Ativado (Produção — cobra de verdade)</option>
                </select>
              </div>
              <div className={`rounded-xl border px-4 py-3 font-bold text-sm ${paymentOn ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300' : 'bg-slate-500/10 border-slate-400/30 text-slate-300'}`}>
                {paymentOn ? 'MODO PRODUÇÃO' : 'MODO TESTE (grátis)'}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Chave PIX (receber pagamentos)</label>
              <input value={settings.pix_key || ''}
                onChange={e => setVal('pix_key', e.target.value)}
                placeholder="ex: 12345678900 (CPF) ou email@email.com ou chave aleatória"
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white" />
            </div>
          </div>
        </Card>

        <Card title="⏳ Trial (período grátis antes de travar o App)" icon={<Clock size={20} className="text-sky-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Duração do trial (dias)</label>
              <input type="number" min="0" max="365" step="1"
                value={settings.trial_days ?? ''}
                onChange={e => setVal('trial_days', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold" />
              <div className="mt-1 text-xs text-slate-400">Default = 7 dias. Expirou e não tem cupom/pagamento → App trava.</div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Liberar trial automaticamente?</label>
              <select value={freeTrialOn ? 'true' : 'false'}
                onChange={e => setVal('free_trial_enabled', e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white">
                <option value="true">✅ Sim (7 dias grátis)</option>
                <option value="false">❌ Não (exige cupom ou pagamento imediato)</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="🎨 Identidade / Contato" icon={<Settings size={20} className="text-indigo-400"/>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome do Site" value={settings.site_name || ''} onChange={v => setVal('site_name', v)} />
            <Field label="Título Hero (landing page)" value={settings.hero_title || ''} onChange={v => setVal('hero_title', v)} />
            <Field label="Subtítulo Hero" value={settings.hero_subtitle || ''} onChange={v => setVal('hero_subtitle', v)} full />
            <Field label="Logo URL (200x60 PNG transparente)" value={settings.logo_url || ''} onChange={v => setVal('logo_url', v)} />
            <Field label="Email de contato / Suporte" value={settings.contact_email || ''} onChange={v => setVal('contact_email', v)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= DOWNLOADS (Windows + Android/iOS inativos) ================= */
function DownloadsTab({ token }) {
  const [rows, setRows] = useState([]);
  const fetchDl = async () => {
    try {
      const r = await fetch(`${API_URL}/api/downloads`).then(r => r.json());
      let list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
      list = list.slice();
      const required = [
        { os: 'windows', label: 'Windows (Desktop)', icon: <Monitor size={18}/>, def_active: 1 },
        { os: 'android', label: 'Android (Mobile)', icon: <Smartphone size={18}/>, def_active: 0 },
        { os: 'ios', label: 'iOS (iPhone/iPad)', icon: <Smartphone size={18}/>, def_active: 0 },
      ];
      const existingOS = new Set((list || []).map(x => String(x?.os||'').toLowerCase()));
      for (const p of required) {
        if (!existingOS.has(p.os)) list.push({ os: p.os, version: null, url: null, count: 0, active: p.def_active, _label: p.label, _icon: p.icon });
      }
      list = list.map(x => ({
        ...x,
        _label: required.find(r => r.os === String(x?.os||'').toLowerCase())?.label || String(x?.os||'').toUpperCase(),
        _icon: required.find(r => r.os === String(x?.os||'').toLowerCase())?.icon || <Download size={18}/>,
      }));
      setRows(list);
    } catch { toast('Erro ao carregar plataformas', 'err'); }
  };

  useEffect(() => { fetchDl(); }, [token]);

  const updateField = (idx, k, v) => setRows(prev => {
    const nx = [...prev]; nx[idx] = { ...nx[idx], [k]: v }; return nx;
  });

  const save = async (idx) => {
    const dl = rows[idx];
    const payload = {
      os: String(dl.os).toLowerCase(),
      version: dl.version || null,
      url: dl.url || null,
      count: parseInt(String(dl.count ?? 0), 10) || 0,
      active: (dl.active === true || dl.active === 1 || String(dl.active) === '1') ? 1 : 0,
    };
    try {
      const r = await fetch(`${API_URL}/api/admin/download`, {
        method: 'PUT', headers: authH(token), body: JSON.stringify(payload)
      }).then(r => r.json());
      if (r?.status === 'success') {
        toast('Atualizado!', 'ok');
        setRows(prev => prev.map(x => x.os === payload.os ? { ...x, ...r.data, _label: x._label, _icon: x._icon } : x));
      } else throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); }
  };

  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Gerenciar Downloads</h2>
      <div className="grid gap-5">
        {rows.map((dl, idx) => (
          <Card key={dl.os}
            icon={<span className={Number(dl.active ?? 1) === 1 ? 'text-emerald-400' : 'text-slate-500'}>{dl._icon}</span>}
            title={<div className="flex items-center gap-3">
              <span>{dl._label}</span>
              <span className={`text-[10.5px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${
                Number(dl.active ?? 1) === 1
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                  : 'bg-slate-500/15 text-slate-300 border-slate-400/30'
              }`}>
                {Number(dl.active ?? 1) === 1 ? 'ATIVO' : 'DESATIVADO'}
              </span>
            </div>}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:items-end">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">OS (fixo)</label>
                <input disabled value={dl.os} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white opacity-60"/>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Versão</label>
                <input value={dl.version || ''}
                  onChange={e => updateField(idx, 'version', e.target.value)}
                  placeholder="ex: 1.0.5"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
              </div>
              <div className="md:col-span-5">
                <label className="block text-xs text-slate-400 mb-1">URL Arquivo (R2 CDN / GitHub Release)</label>
                <input value={dl.url || ''}
                  onChange={e => updateField(idx, 'url', e.target.value)}
                  placeholder="https://cdn.soseditor.com.br/SOS_Editor_Setup.exe"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Contador</label>
                <input type="number" min="0" step="1" value={dl.count ?? 0}
                  onChange={e => updateField(idx, 'count', parseInt(e.target.value || '0', 10))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={Number(dl.active ?? 1)}
                  onChange={e => updateField(idx, 'active', parseInt(e.target.value) === 1 ? 1 : 0)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white">
                  <option value={1}>Ativo</option>
                  <option value={0}>Inativo</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <button onClick={() => save(idx)}
                  className="w-full inline-flex items-center justify-center gap-1 rounded-xl px-3 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 font-bold hover:opacity-90">
                  <Save size={16}/> Salvar
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================= PLANS (autoridade de preços, tela extra se precisar editar outros campos) ================= */
function PlansTab({ token }) {
  const [plans, setPlans] = useState([]);
  const fetchPlans = async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/plans`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      const list = Array.isArray(r?.plans) ? r.plans : (Array.isArray(r?.data) ? r.data : []);
      setPlans(list);
    } catch { toast('Erro ao carregar planos', 'err'); }
  };
  useEffect(() => { fetchPlans(); }, [token]);

  const save = async (planId, patch) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/plans/${planId}`, {
        method: 'PUT', headers: authH(token), body: JSON.stringify(patch)
      }).then(r => r.json());
      if (r?.status === 'success') { toast('Plano atualizado!', 'ok'); fetchPlans(); }
      else throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); }
  };

  const safePlans = Array.isArray(plans) ? plans : [];
  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Planos & Preços (autoridade comercial)</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {safePlans.map(p => {
          const isFree = Number(p.id) === 1 || p.type === 'free';
          const isMonthly = Number(p.id) === 2 || p.type === 'monthly';
          const isLifetime = Number(p.id) === 3 || p.type === 'lifetime';
          const badge = isFree ? { label: 'GRATUITO', cls: 'bg-sky-500/15 text-sky-300 border-sky-400/30' }
            : isMonthly ? { label: 'MENSAL (renova)', cls: 'bg-amber-500/15 text-amber-300 border-amber-400/30' }
            : { label: 'VITALÍCIO (Plano Único)', cls: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30' };

          return (
            <Card key={p.id}
              icon={<CreditCard size={22} className={isLifetime ? 'text-fuchsia-400' : isMonthly ? 'text-amber-400' : 'text-sky-400'}/>}
              title={<div className="flex items-center gap-2">
                <span className="font-bold">{p.name}</span>
                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
              </div>}
            >
              <div className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{fmtBRL(p.price)}</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" min="0" value={p.price ?? 0}
                    onChange={e => setPlans(prev => prev.map(x => x.id === p.id ? { ...x, price: Number(e.target.value) } : x))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white font-bold"/>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select value={Number(p.active ?? 1)}
                    onChange={e => setPlans(prev => prev.map(x => x.id === p.id ? { ...x, active: parseInt(e.target.value) === 1 ? 1 : 0 } : x))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white">
                    <option value={1}>Ativo</option>
                    <option value={0}>Inativo</option>
                  </select>
                </div>
                <button
                  onClick={() => save(p.id, { price: Number(p.price), active: Number(p.active ?? 1) === 1 })}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 font-bold hover:opacity-90">
                  <Save size={16}/> Salvar
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ================= COUPONS ================= */
function CouponsTab({ token }) {
  const [rows, setRows] = useState([]);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');

  const fetchAll = async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      const list = Array.isArray(r?.coupons) ? r.coupons : (Array.isArray(r?.data) ? r.data : []);
      setRows(list);
    } catch { toast('Erro ao carregar cupons', 'err'); }
  };
  useEffect(() => { fetchAll(); }, [token]);

  const add = async () => {
    if (!newCode || !newDiscount) return;
    const discount = Number(newDiscount);
    if (!(discount >= 0 && discount <= 100)) { toast('Desconto deve ser 0..100 %', 'warn'); return; }
    try {
      const r = await fetch(`${API_URL}/api/admin/coupons`, {
        method: 'POST', headers: authH(token),
        body: JSON.stringify({ code: String(newCode).toUpperCase(), discount, active: 1 })
      }).then(r => r.json());
      if (r?.status === 'success') {
        toast(`Cupom ${r.data?.code || r.coupon?.code || newCode} criado!`, 'ok');
        setNewCode(''); setNewDiscount('');
        fetchAll();
      } else throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); }
  };

  const del = async (id) => {
    if (!confirm('Excluir cupom? Não poderá ser utilizado.')) return;
    try {
      const r = await fetch(`${API_URL}/api/admin/coupons/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());
      if (r?.status === 'success') { toast('Cupom removido.', 'ok'); fetchAll(); }
      else throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); }
  };

  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Gerenciar Cupons</h2>

      <Card title="Criar cupom novo" icon={<Plus size={20} className="text-emerald-400"/>}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:items-end">
          <div className="md:col-span-5">
            <label className="block text-xs text-slate-400 mb-1">Código</label>
            <input value={newCode}
              onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="EX: PROMO10, VITALICIO100, MENSAL50"
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-mono uppercase"/>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">Desconto (%)</label>
            <input type="number" step="1" min="0" max="100" value={newDiscount}
              onChange={e => setNewDiscount(e.target.value)}
              placeholder="100 = 100% (grátis, Plano Único)"
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold"/>
          </div>
          <div className="md:col-span-4 text-sm text-slate-400 leading-snug">
            <div className="font-bold text-slate-200 mb-1">Regras de resgate (App Desktop ↔ Cupons):</div>
            • 100% → Plano Único Vitalício (3650 dias)<br/>
            • 50..99% → 90 dias de acesso<br/>
            • 1..49% → 30 dias de acesso
          </div>
          <div className="md:col-span-12 flex justify-end">
            <button onClick={add}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold hover:opacity-90 shadow-lg">
              <Ticket size={18}/> Criar Cupom
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 mt-6">
        {safeRows.length === 0 && <Empty>Nenhum cupom criado ainda.</Empty>}
        {safeRows.map(c => {
          const vitalicio = Number(c.discount) >= 100;
          return (
            <div key={c.id}
              className="bg-dark rounded-2xl border border-white/10 p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:border-fuchsia-400/40 transition-colors">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`p-3 rounded-xl shadow-inner ${vitalicio ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {vitalicio ? <KeyRound size={22}/> : <Tag size={22}/>}
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold font-mono tracking-wider truncate">{c.code}</div>
                  <div className="text-xs text-slate-400">
                    <span className="font-bold">{Number(c.discount)}% OFF</span>
                    {' · '}
                    <span className={Number(c.active) === 1 ? 'text-emerald-300' : 'text-slate-400'}>
                      {Number(c.active) === 1 ? 'Ativo' : 'Inativo'}
                    </span>
                    {' · '}
                    <span className="text-slate-500">id {c.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {vitalicio
                      ? 'Ao resgatar: usuário recebe Plano Único Vitalício (novo bloqueio)'
                      : `Ao resgatar: usuário recebe ${Number(c.discount) >= 50 ? '90 dias' : '30 dias'} de acesso.`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/video/?cupom=${c.code}`).catch(()=>{});
                  toast('Copiado (link com cupom)!', 'ok');
                }} className="p-2.5 rounded-xl hover:bg-white/5 text-slate-300" title="Copiar código">
                  <Copy size={16}/>
                </button>
                <button onClick={() => del(c.id)}
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 hover:bg-red-500/20 text-sm font-bold">
                  <Trash2 size={16}/> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= USERS / LICENÇAS / GRANTS ================= */
function UsersTab({ token }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [grants, setGrants] = useState([]);

  const perPage = 50;

  const fetchList = async (resetTo1 = false) => {
    const p = resetTo1 ? 1 : page;
    try {
      const url = `${API_URL}/api/admin/users?q=${encodeURIComponent(q)}&page=${p}&limit=${perPage}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      const list = Array.isArray(r?.rows) ? r.rows : [];
      setRows(list);
      setTotal(Number(r?.total || 0));
      if (resetTo1) setPage(1);
    } catch { toast('Erro ao carregar usuários', 'err'); }
  };

  useEffect(() => { fetchList(true); }, [token]); // eslint-disable-line

  const openDetail = async (u) => {
    setSel(u.id);
    try {
      const r = await fetch(`${API_URL}/api/admin/users/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());
      if (r?.status === 'success') {
        setDetail(r.user); setGrants(Array.isArray(r.grants) ? r.grants : []);
      }
    } catch { toast('Erro ao carregar detalhe do usuário', 'err'); }
  };

  const changeStatus = async (id, status, reason = '') => {
    if (!confirm(`Alterar status do usuário #${id} para: ${status.toUpperCase()}?`)) return;
    try {
      const r = await fetch(`${API_URL}/api/admin/users/${id}/status`, {
        method: 'PUT', headers: authH(token), body: JSON.stringify({ status, reason })
      }).then(r => r.json());
      if (r?.status === 'success') { toast('Status atualizado!', 'ok'); fetchList(); openDetail(r.user); }
      else throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); }
  };

  const activateSub = async (id, planId, days, provider, ref, reason) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/users/${id}/activate-subscription`, {
        method: 'POST', headers: authH(token),
        body: JSON.stringify({ plan_id: planId, days, provider, ref, reason })
      }).then(r => r.json());
      if (r?.status === 'success') {
        toast('✅ Assinatura ativada (Pagamento confirmado)! Usuário pode fechar e abrir o App.', 'ok');
        fetchList(); openDetail(r.user);
        return true;
      }
      throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); return false; }
  };

  const createGrant = async (id, days, reason) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/access-grants`, {
        method: 'POST', headers: authH(token),
        body: JSON.stringify({ user_id: id, days, reason })
      }).then(r => r.json());
      if (r?.status === 'success') { toast(`Grant de ${days} dias criado!`, 'ok'); fetchList(); openDetail(detail || { id }); return true; }
      throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); return false; }
  };

  const revokeGrant = async (grantId, reason) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/access-grants/${grantId}/revoke`, {
        method: 'POST', headers: authH(token), body: JSON.stringify({ reason })
      }).then(r => r.json());
      if (r?.status === 'success') { toast('Grant revogado.', 'ok'); fetchList(); openDetail(detail || { id: sel }); return true; }
      throw new Error(r?.error || 'falha');
    } catch (e) { toast('Erro: ' + (e?.message || String(e)), 'err'); return false; }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safeRows = Array.isArray(rows) ? rows : [];

  const isTestUser = (u) => {
    try {
      if ((u.email || '').endsWith('@tututhebest.com')) return true;
      if (/^(DESKTOP_|USER_PAGOU_PIX_|NOVO_USUARIO_PIX)/.test(u.device_id || '')) return true;
      const grantReason = (u.license && typeof u.license === 'object' && u.license.grant_reason) ? String(u.license.grant_reason) : '';
      if (/(TESTEVITAL|Pagamento PIX recibido admin Juliano)/i.test(grantReason)) return true;
      return false;
    } catch { return false; }
  };
  const testOriginText = (u) => {
    const parts = [];
    if ((u.email || '').endsWith('@tututhebest.com')) parts.push('email teste @tututhebest');
    if (/^(DESKTOP_|USER_PAGOU_PIX_|NOVO_USUARIO_PIX)/.test(u.device_id || '')) parts.push('device_id padrão teste');
    const grantReason = (u.license && typeof u.license === 'object' && u.license.grant_reason) ? String(u.license.grant_reason) : '';
    if (/TESTEVITAL/i.test(grantReason)) parts.push('grant cupom TESTEVITAL');
    else if (/Pagamento PIX recibido admin Juliano/i.test(grantReason)) parts.push('grant teste pagamento PIX admin');
    return parts.join(' + ') || 'Evidências de teste encontradas';
  };
  const accessTypeLabel = (u) => {
    try {
      const lic = u.license && typeof u.license === 'object' ? u.license : null;
      if (u.status === 'blocked' || (lic && lic.status === 'blocked')) return { text: 'Bloqueado', cls: 'text-red-300 bg-red-500/15 border-red-400/30' };
      if (lic && Number(lic.grant_active) === 1) return { text: 'Grant Admin', cls: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30' };
      if (lic && lic.status === 'subscription_active') return { text: 'Assinatura', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30' };
      if ((lic && lic.status === 'trial') || (u.trial_ends_at && daysBetweenIso(new Date().toISOString(), u.trial_ends_at) > 0))
        return { text: 'Trial', cls: 'text-sky-300 bg-sky-500/15 border-sky-400/30' };
      if ((lic && lic.status === 'trial_expired') || (u.trial_ends_at && daysBetweenIso(new Date().toISOString(), u.trial_ends_at) <= 0))
        return { text: 'Trial Exp.', cls: 'text-amber-300 bg-amber-500/15 border-amber-400/30' };
      if (u.plan_id === 3) return { text: 'Vitalício', cls: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30' };
      if (u.plan_id === 2) return { text: 'Mensal', cls: 'text-amber-300 bg-amber-500/15 border-amber-400/30' };
      return { text: '—', cls: 'text-slate-300 bg-slate-500/15 border-slate-400/30' };
    } catch { return { text: '—', cls: 'text-slate-300 bg-slate-500/15 border-slate-400/30' }; }
  };
  const validityDate = (u) => {
    try {
      const lic = u.license && typeof u.license === 'object' ? u.license : null;
      if (u.plan_id === 3) return 'Permanente';
      if (lic && Number(lic.grant_active) === 1 && lic.grant_expires_at) return fmtDate(lic.grant_expires_at);
      if (u.subscription_expires_at) return fmtDate(u.subscription_expires_at);
      if (u.trial_ends_at) return fmtDate(u.trial_ends_at);
      return '—';
    } catch { return '—'; }
  };
  const trialCell = (u) => {
    try {
      const lic = u.license && typeof u.license === 'object' ? u.license : null;
      const days = Number(lic?.trial_days_left || 0) || (u.trial_ends_at ? daysBetweenIso(new Date().toISOString(), u.trial_ends_at) : 0);
      if ((lic && lic.status === 'trial') || (u.trial_ends_at && days > 0)) {
        return <span className="inline-flex items-center gap-1 text-sky-300 text-xs font-bold"><Clock size={12}/> Sim · {days}d</span>;
      }
      if ((lic && lic.status === 'trial_expired') || (u.trial_ends_at && days <= 0)) {
        return <span className="inline-flex items-center gap-1 text-amber-300 text-xs font-bold"><AlertTriangle size={12}/> Expirado</span>;
      }
      return <span className="text-slate-500 text-xs">Não</span>;
    } catch { return <span className="text-slate-500 text-xs">—</span>; }
  };

  return (
    <div>
      <h2 className="text-3xl font-extrabold mb-8 tracking-tight">Usuários & Licenças</h2>

      <Card title="Buscar usuário" icon={<Search size={20} className="text-sky-400"/>}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
          <div className="md:col-span-8">
            <label className="block text-xs text-slate-400 mb-1">Busca por email, device_id ou nome</label>
            <input value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchList(true)}
              placeholder="ex: fulano@email.com ou device_abc...789"
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
          </div>
          <div className="md:col-span-2">
            <button onClick={() => fetchList(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-sky-500/20 border border-sky-400/30 text-sky-200 hover:bg-sky-500/30 font-bold">
              <Search size={16}/> Buscar
            </button>
          </div>
          <div className="md:col-span-2 text-right text-xs text-slate-400">
            Total: <span className="font-bold text-white">{total}</span><br/>
            Página {page}/{totalPages}
          </div>
        </div>
      </Card>

      <div className="mt-6 bg-dark rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3 font-bold w-[72px]">Origem</th>
                <th className="text-left p-3 font-bold">Email</th>
                <th className="text-left p-3 font-bold">Device ID</th>
                <th className="text-left p-3 font-bold">Status</th>
                <th className="text-left p-3 font-bold">Plano</th>
                <th className="text-left p-3 font-bold">Tipo Acesso</th>
                <th className="text-left p-3 font-bold">Trial</th>
                <th className="text-left p-3 font-bold">Validade</th>
                <th className="text-left p-3 font-bold">Criado em</th>
                <th className="text-left p-3 font-bold">Último Acesso</th>
                <th className="text-right p-3 font-bold w-[110px]"></th>
              </tr>
            </thead>
            <tbody>
              {safeRows.length === 0 && (
                <tr><td colSpan={11} className="p-10 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
              )}
              {safeRows.map(u => {
                const t = isTestUser(u);
                const st = accessTypeLabel(u);
                const isBlockedRow = u.status === 'blocked' || (u.license && u.license.status === 'blocked');
                return (
                <tr key={u.id} className={`border-t border-white/5 hover:bg-white/[0.03] ${t ? 'bg-orange-500/[0.02]' : ''}`}>
                  <td className="p-3 whitespace-nowrap">
                    {t
                      ? <span title={testOriginText(u)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-orange-500/15 border border-orange-400/40 text-orange-300">🧪 Teste</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-emerald-500/10 border border-emerald-400/30 text-emerald-300">👤 Usuário</span>
                    }
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-white truncate max-w-[240px]">
                      {u.email || <span className="text-slate-500 italic">— sem email —</span>}
                    </div>
                    {u.display_name ? <div className="text-[11px] text-slate-500 truncate max-w-[240px]">nome: {u.display_name}</div> : null}
                  </td>
                  <td className="p-3">
                    {u.device_id
                      ? <code title={String(u.device_id)} className="text-[11px] font-mono bg-black/40 border border-white/10 px-2 py-1 rounded-md text-slate-300 break-all max-w-[180px] inline-block align-middle">
                          {String(u.device_id).length > 20 ? String(u.device_id).slice(0,10)+'…'+String(u.device_id).slice(-8) : u.device_id}
                        </code>
                      : <span className="text-slate-600 italic text-xs">—</span>
                    }
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {isBlockedRow
                      ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] uppercase tracking-widest font-bold bg-red-500/15 border border-red-400/30 text-red-300"><Ban size={11}/> Bloqueado</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] uppercase tracking-widest font-bold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300"><CheckCircle size={11}/> Ativo</span>
                    }
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <PlanBadge planId={u.plan_id} type={null}/>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10.5px] tracking-widest uppercase font-bold border ${st.cls}`}>{st.text}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{trialCell(u)}</td>
                  <td className="p-3 whitespace-nowrap text-xs text-slate-300 font-bold">
                    {validityDate(u)}
                  </td>
                  <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(u.created_at)}</td>
                  <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                    {u.last_seen_at ? fmtDate(u.last_seen_at) : <span className="text-slate-600 italic">— nunca —</span>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openDetail(u)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-200 hover:bg-sky-500/25 text-xs font-bold">
                      <ExternalLink size={14}/> Abrir
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => { setPage(p => Math.max(1,p-1)); setTimeout(fetchList, 0); }}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-sm">
            ← Anterior
          </button>
          <div className="text-xs text-slate-400">Página {page} de {totalPages}</div>
          <button disabled={page >= totalPages} onClick={() => { setPage(p => Math.min(totalPages,p+1)); setTimeout(fetchList, 0); }}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-sm">
            Próxima →
          </button>
        </div>
      </div>

      {detail && (
        <UserDetailDrawer
          key={detail.id}
          user={detail}
          grants={grants}
          onClose={() => { setDetail(null); setSel(null); }}
          onChangeStatus={changeStatus}
          onActivateSub={activateSub}
          onCreateGrant={createGrant}
          onRevokeGrant={revokeGrant}
        />
      )}
    </div>
  );
}

function UserDetailDrawer({ user, grants, onClose, onChangeStatus, onActivateSub, onCreateGrant, onRevokeGrant }) {
  const [grantDays, setGrantDays] = useState(3650);
  const [grantReason, setGrantReason] = useState('Pagamento PIX Plano Único');
  const [subPlan, setSubPlan] = useState(3);
  const [subDays, setSubDays] = useState(3650);
  const [subProvider, setSubProvider] = useState('pix');
  const [subRef, setSubRef] = useState('');
  const [subReason, setSubReason] = useState('Pagamento PIX recebido Admin');

  const isBlocked = user.status === 'blocked';
  const daysFromNowTo = (iso) => iso ? daysBetweenIso(new Date().toISOString(), iso) : 0;
  const safeGrants = Array.isArray(grants) ? grants : [];
  const activeGrant = safeGrants.find(g => Number(g.active) === 1 && daysFromNowTo(g.expires_at) > 0) || safeGrants.find(g => Number(g.active) === 1);

  const isTestUserLocal = (() => {
    try {
      if ((user.email || '').endsWith('@tututhebest.com')) return true;
      if (/^(DESKTOP_|USER_PAGOU_PIX_|NOVO_USUARIO_PIX)/.test(user.device_id || '')) return true;
      const gr = safeGrants.map(g => g.reason || '').join(' ');
      if (/(TESTEVITAL|Pagamento PIX recibido admin Juliano)/i.test(gr)) return true;
      return false;
    } catch { return false; }
  })();
  const testOriginLocal = (() => {
    const parts = [];
    if ((user.email || '').endsWith('@tututhebest.com')) parts.push('email teste @tututhebest');
    if (/^(DESKTOP_|USER_PAGOU_PIX_|NOVO_USUARIO_PIX)/.test(user.device_id || '')) parts.push('device_id padrão teste');
    const gr = safeGrants.map(g => g.reason || '').join(' ');
    if (/TESTEVITAL/i.test(gr)) parts.push('grant cupom TESTEVITAL');
    else if (/Pagamento PIX recibido admin Juliano/i.test(gr)) parts.push('grant teste pagamento PIX admin');
    return parts.join(' + ') || 'Evidências de teste encontradas';
  })();
  const accessTypeLocal = (() => {
    const lic = user.license && typeof user.license === 'object' ? user.license : null;
    if (isBlocked || (lic && lic.status === 'blocked')) return { text: 'Bloqueado', cls: 'text-red-300 bg-red-500/15 border-red-400/30' };
    if (activeGrant) return { text: 'Grant Admin', cls: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30' };
    if (lic && lic.status === 'subscription_active') return { text: 'Assinatura', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30' };
    if ((lic && lic.status === 'trial') || (user.trial_ends_at && daysFromNowTo(user.trial_ends_at) > 0))
      return { text: 'Trial', cls: 'text-sky-300 bg-sky-500/15 border-sky-400/30' };
    if ((lic && lic.status === 'trial_expired') || (user.trial_ends_at && daysFromNowTo(user.trial_ends_at) <= 0))
      return { text: 'Trial Expirado', cls: 'text-amber-300 bg-amber-500/15 border-amber-400/30' };
    if (user.plan_id === 3) return { text: 'Vitalício', cls: 'text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30' };
    if (user.plan_id === 2) return { text: 'Mensal', cls: 'text-amber-300 bg-amber-500/15 border-amber-400/30' };
    return { text: '—', cls: 'text-slate-300 bg-slate-500/15 border-slate-400/30' };
  })();
  const validityLocal = (() => {
    if (user.plan_id === 3) return 'Permanente';
    if (activeGrant && activeGrant.expires_at) return fmtDate(activeGrant.expires_at);
    if (user.subscription_expires_at) return fmtDate(user.subscription_expires_at);
    if (user.trial_ends_at) return fmtDate(user.trial_ends_at);
    return '—';
  })();
  const trialDaysLocal = (() => {
    const lic = user.license && typeof user.license === 'object' ? user.license : null;
    const days = Number(lic?.trial_days_left || 0) || (user.trial_ends_at ? daysFromNowTo(user.trial_ends_at) : 0);
    return days;
  })();
  const daysLeftTotal = (() => {
    const d1 = activeGrant ? daysFromNowTo(activeGrant.expires_at) : 0;
    const d2 = user.subscription_expires_at ? daysFromNowTo(user.subscription_expires_at) : 0;
    const d3 = trialDaysLocal > 0 ? trialDaysLocal : 0;
    return Math.max(d1, d2, d3, 0);
  })();
  const isLifetimeLocal = Number(user.plan_id) === 3 || (activeGrant && daysBetweenIso(activeGrant.granted_at, activeGrant.expires_at) >= 3650);
  const copyDevice = () => {
    if (!user.device_id) return;
    try { navigator.clipboard.writeText(String(user.device_id)); toast('Device ID copiado!', 'ok'); } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/70 p-0 md:p-8"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full md:max-w-4xl max-h-[94vh] overflow-y-auto bg-[#0a0f1d] border md:rounded-3xl border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 bg-[#0a0f1d]/95 backdrop-blur border-b border-white/10 px-5 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Usuário #{user.id}</span>
                {isTestUserLocal
                  ? <span title={testOriginLocal} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-orange-500/15 border border-orange-400/40 text-orange-300">🧪 Teste</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold bg-emerald-500/10 border border-emerald-400/30 text-emerald-300">👤 Usuário Real</span>
                }
              </div>
              <div className="text-xl font-extrabold truncate">{user.display_name || user.email || 'Usuário anônimo'}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-300 shrink-0"><X size={22}/></button>
        </div>

        <div className="p-5 md:p-8 space-y-6">
          {/* ==================== BLOCO 1: USUÁRIO ==================== */}
          <Card title="USUÁRIO" icon={<User size={20} className="text-sky-400"/>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Kv k="Email" v={user.email || '—'} />
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Device ID</div>
                  {user.device_id
                    ? <button onClick={copyDevice} title="Copiar Device ID completo" className="text-[10px] uppercase tracking-widest text-sky-300 hover:text-sky-200 font-bold px-2 py-0.5 rounded-md border border-sky-400/30 bg-sky-500/10">Copiar</button>
                    : null
                  }
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                  {user.device_id
                    ? <code className="text-xs font-mono text-slate-200 break-all block leading-relaxed">{user.device_id}</code>
                    : <div className="text-white text-sm">—</div>
                  }
                </div>
              </div>
              <Kv k="Criado em" v={fmtDate(user.created_at)} />
              <Kv k="Último acesso" v={user.last_seen_at ? fmtDate(user.last_seen_at) : <span className="text-slate-500 italic">— nunca registrado —</span>} />
              <Kv k="Nome exibição" v={user.display_name || '—'} />
              <Kv k="Origem (estimativa)" v={isTestUserLocal ? `🧪 ${testOriginLocal}` : 'Usuário real (nenhuma evidência de teste)'} />
              {user.payment_provider || user.payment_ref
                ? <>
                    <Kv k="Pagamento — Provedor" v={user.payment_provider || '—'} />
                    <Kv k="Pagamento — Referência" v={user.payment_ref ? String(user.payment_ref).slice(0, 60) : '—'} mono />
                  </>
                : null
              }
            </div>
          </Card>

          {/* ==================== BLOCO 2: ACESSO ==================== */}
          <Card title="ACESSO" icon={<Shield size={20} className="text-indigo-400"/>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Status</div>
                {isBlocked
                  ? <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold bg-red-500/15 border border-red-400/30 text-red-300"><Ban size={12}/> Bloqueado</span>
                  : <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest font-bold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300"><CheckCircle size={12}/> Ativo</span>
                }
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Plano</div>
                <PlanBadge planId={user.plan_id} type={null}/>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Tipo de Acesso</div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs tracking-widest uppercase font-bold border ${accessTypeLocal.cls}`}>{accessTypeLocal.text}</span>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Trial</div>
                {trialDaysLocal > 0
                  ? <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-500/15 border border-sky-400/30 text-sky-200"><Clock size={12}/> Sim · restam {trialDaysLocal} dias</span>
                  : (user.trial_ends_at && trialDaysLocal <= 0
                      ? <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-400/30 text-amber-200"><AlertTriangle size={12}/> Expirou</span>
                      : <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-500/15 border border-slate-400/30 text-slate-300">Não utilizado / sem trial</span>
                    )
                }
              </div>
              <Kv k="Validade" v={isLifetimeLocal ? '♾️ Permanente' : validityLocal} hint={!isLifetimeLocal && daysLeftTotal > 0 ? `(faltam ~${daysLeftTotal} dias)` : ''} />
              <Kv k="Dias restantes (hoje)" v={isLifetimeLocal ? '♾️ Vitalício' : (daysLeftTotal > 0 ? `${daysLeftTotal} dias` : '0 dias (expirado)')} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-4">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Resumo da licença (como o app vê)</div>
              <LicenseBadge license={buildLicenseFake(user, activeGrant || grants[0])} trialEndsAt={user.trial_ends_at} big />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Kv k="Trial — Início" v={fmtDate(user.trial_started_at)} />
              <Kv k="Trial — Fim" v={fmtDate(user.trial_ends_at)} hint={user.trial_ends_at && trialDaysLocal > 0 ? `(faltam ~${trialDaysLocal} dias)` : ''} />
              <Kv k="Assinatura — Status" v={user.subscription_status || 'nenhuma'} />
              <Kv k="Assinatura — Expira" v={fmtDate(user.subscription_expires_at)} hint={user.subscription_expires_at && daysFromNowTo(user.subscription_expires_at) > 0 ? `(faltam ~${daysFromNowTo(user.subscription_expires_at)} dias)` : ''} />
            </div>
          </Card>

          {/* ==================== BLOCO 3: AÇÕES ==================== */}
          <Card title="AÇÕES" icon={<Zap size={20} className="text-fuchsia-400"/>}>

            {/* 3A) Bloquear / Desbloquear */}
            <div className="mb-6">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">3.1 Status geral do usuário</div>
              <div className="flex flex-wrap gap-3 p-3 rounded-2xl bg-black/30 border border-white/10">
                {isBlocked
                  ? <button onClick={() => onChangeStatus(user.id, 'active', 'Desbloqueado por admin')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/30 font-bold">
                      <CheckCircle size={16}/> Desbloquear usuário
                    </button>
                  : <button onClick={() => onChangeStatus(user.id, 'blocked', 'Bloqueado por admin')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-400/30 text-red-200 hover:bg-red-500/25 font-bold">
                      <Ban size={16}/> Bloquear usuário (app trava)
                    </button>
                }
              </div>
            </div>

            {/* 3B) Confirmar Pagamento (RAPIDO Vitalício + form completo) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">3.2 Pagamento recebido → Confirmar & Liberar</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onActivateSub(user.id, 3, 3650, 'pix', user.payment_ref || null, 'Pagamento PIX Plano Único Vitalício — Admin')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 font-extrabold text-white shadow-[0_18px_50px_-20px_rgba(217,70,239,.55)] hover:opacity-95">
                    <CreditCard size={16}/> ✅ Confirmar Pagamento (Plano Único · Vitalício · 3650 dias · PIX)
                  </button>
                </div>
                <details className="group rounded-xl border border-white/10 bg-black/20">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white select-none list-none">
                    ⚙️ Opções avançadas (outros planos / Stripe / Manual / Cupom)
                  </summary>
                  <div className="p-4 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Plano</label>
                      <select value={subPlan} onChange={e => {
                        const v = parseInt(e.target.value);
                        setSubPlan(v);
                        setSubDays(v === 3 ? 3650 : 30);
                      }} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white">
                        <option value={1}>Plano 1 — Gratuito</option>
                        <option value={2}>Plano 2 — Mensal (30 dias)</option>
                        <option value={3}>Plano 3 — Vitalício / Plano Único (3650 dias)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Duração (dias)</label>
                      <input type="number" min="1" max="3650" value={subDays}
                        onChange={e => setSubDays(parseInt(e.target.value||'30', 10))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold"/>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Meio pgto</label>
                      <select value={subProvider}
                        onChange={e => setSubProvider(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white">
                        <option value="pix">PIX</option>
                        <option value="stripe">Stripe (cartão)</option>
                        <option value="manual">Manual (transferência)</option>
                        <option value="cupom">Cupom resgatado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Referência (TID/Email/Etq)</label>
                      <input value={subRef} onChange={e => setSubRef(e.target.value)}
                        placeholder="ex: PIX ID XYZ ou email pagador"
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Motivo / Observações</label>
                      <input value={subReason} onChange={e => setSubReason(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        onClick={() => onActivateSub(user.id, subPlan, subDays, subProvider, subRef || null, subReason || null)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-100 hover:bg-sky-500/30 font-extrabold">
                        <Zap size={16}/> Confirmar Pagamento customizado (Plano {subPlan} · {subDays} dias · {subProvider})
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* 3C) Grants → Liberar temporariamente RÁPIDO + custom */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">3.3 Liberar acesso manual (Grant)</div>
              </div>
              <div className="p-3 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onCreateGrant(user.id, 30, 'Acesso temporário 30 dias — Admin')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-200 hover:bg-sky-500/25 font-bold">
                    <KeyRound size={16}/> ⏱️ Liberar 30 dias (temporário)
                  </button>
                  <button
                    onClick={() => onCreateGrant(user.id, 3650, 'Grant vitalício manual — Admin')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-200 hover:bg-fuchsia-500/25 font-bold">
                    <KeyRound size={16}/> ♾️ Dar Grant Vitalício (3650 dias)
                  </button>
                </div>
                <details className="group rounded-xl border border-white/10 bg-black/20">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white select-none list-none">
                    ⚙️ Grant customizado (dias e motivo livre)
                  </summary>
                  <div className="p-4 pt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Dias (3650 = vitalício)</label>
                      <input type="number" min="1" max="3650" value={grantDays}
                        onChange={e => setGrantDays(parseInt(e.target.value||'30', 10))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white font-bold"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Motivo</label>
                      <input value={grantReason} onChange={e => setGrantReason(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
                    </div>
                    <div className="md:col-span-3">
                      <button
                        onClick={() => onCreateGrant(user.id, grantDays, grantReason || null)}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-200 hover:bg-sky-500/25 font-bold">
                        <Plus size={16}/> Criar Grant customizado ({grantDays} dias)
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* 3D) Histórico de grants + Revogar */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">3.4 Histórico de acessos manuais (grants) & Revogar</div>
              {safeGrants.length === 0
                ? <div className="p-5 rounded-2xl bg-black/30 border border-white/10 text-center text-slate-500 text-sm">Esse usuário ainda NÃO recebeu nenhum acesso manual (grant).</div>
                : (
                  <div className="space-y-2">
                    {safeGrants.map(g => (
                      <div key={g.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-black/30 rounded-xl border border-white/10 p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                              Number(g.active) === 1
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                                : 'bg-slate-500/15 text-slate-300 border-slate-400/30'
                            }`}>
                              {Number(g.active) === 1 ? 'VÁLIDO' : 'REVOGADO/EXPIRADO'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">grant #{g.id}</span>
                            <span className="text-xs text-slate-400">
                              duração: <b className="text-white">{daysBetweenIso(g.granted_at, g.expires_at)} dias</b>
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 truncate">
                            <span className="mr-3">🗓️ inícia {fmtDate(g.granted_at)}</span>
                            <span>⌛ expira {fmtDate(g.expires_at)}{Number(g.active) === 1 ? ` (faltam ~${daysFromNowTo(g.expires_at)} dias)` : ''}</span>
                          </div>
                          {g.reason ? <div className="text-xs text-slate-300 mt-1">Motivo: <i>{g.reason}</i></div> : null}
                        </div>
                        {Number(g.active) === 1 ? (
                          <button onClick={() => {
                            const r = prompt('Motivo da revogação (opcional):', 'Cancelamento / Pagamento estornado');
                            if (r === null) return;
                            onRevokeGrant(g.id, r || 'Admin revogou manualmente');
                          }} className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 hover:bg-red-500/20 text-xs font-bold">
                            <Ban size={14}/> Revogar Grant
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
            </div>

          </Card>
        </div>
      </div>
    </div>
  );
}

/* ===================== Componentes reutilizáveis ===================== */
function Card({ title, children, icon }) {
  return (
    <section className="bg-dark rounded-2xl border border-white/10 p-5 md:p-6 shadow-[0_16px_40px_-30px_rgba(15,23,42,.8)]">
      {title ? (
        <header className="mb-4 flex items-center gap-2">
          {icon ? <span className="shrink-0">{icon}</span> : null}
          <h3 className="font-extrabold text-lg tracking-tight">{title}</h3>
        </header>
      ) : null}
      {children}
    </section>
  );
}
function Empty({ children }) { return <div className="text-center p-10 rounded-xl border border-dashed border-white/10 text-slate-500 text-sm">{children}</div>; }
function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-sky-500/30 border-t-sky-400 animate-spin" />
      <div className="text-slate-400 text-sm">Carregando dados do painel…</div>
    </div>
  );
}
function StatCard({ title, value, icon, sub }) {
  return (
    <div className="bg-dark rounded-2xl border border-white/10 p-5 flex items-start justify-between gap-3 hover:border-white/20 transition-colors">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">{title}</div>
        <div className="text-3xl font-extrabold mt-2 text-white">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</div>
        {sub ? <div className="text-xs text-slate-400 mt-1">{sub}</div> : null}
      </div>
      <div className="shrink-0 p-3 rounded-xl bg-white/5 border border-white/10">{icon}</div>
    </div>
  );
}
function Mini({ title, value, color, icon }) {
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${color} bg-opacity-10 border border-white/10 relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-white/90">{title}</div>
        <div className="text-white/90">{icon}</div>
      </div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
    </div>
  );
}
function Field({ label, value, onChange, full }) {
  return (
    <div className={full ? '' : ''}>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/>
    </div>
  );
}
function Kv({ k, v, hint, mono }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{k}</div>
      <div className={`mt-0.5 text-sm ${mono ? 'font-mono text-slate-200 break-all' : 'text-white'} truncate`}>{v}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div> : null}
    </div>
  );
}
function OSIcon({ os }) {
  const s = (os||'').toLowerCase();
  if (s.startsWith('win')) return <Monitor size={22} className="text-sky-400"/>;
  if (s === 'android' || s.startsWith('ios') || s === 'iphone' || s === 'ipad') return <Smartphone size={22} className="text-fuchsia-400"/>;
  return <Download size={22} className="text-slate-400"/>;
}
function PlanBadge({ planId, type }) {
  const p = Number(planId);
  if (p === 1 || type === 'free')
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] tracking-widest uppercase font-bold bg-sky-500/15 border border-sky-400/30 text-sky-300">Gratuito</span>;
  if (p === 2 || type === 'monthly')
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] tracking-widest uppercase font-bold bg-amber-500/15 border border-amber-400/30 text-amber-300">Mensal</span>;
  if (p === 3 || type === 'lifetime')
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] tracking-widest uppercase font-bold bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-200">Plano Único Vitalício</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] tracking-widest uppercase font-bold bg-slate-500/15 border border-slate-400/30 text-slate-300">Nenhum</span>;
}
function LicenseBadge({ license, trialEndsAt, big }) {
  // fallback se prop license veio como undefined (UserSummary não tem ainda) — montamos a partir do trial.
  let status = 'unknown';
  let allowed = false;
  let label = '—';
  let daysLeft = 0;
  let grantLabel = null;
  if (license && typeof license === 'object') {
    status = license.status || 'unknown';
    allowed = !!license.allowed;
    daysLeft = Number(license.trial_days_left || 0) || Number(license.grant_days_left || 0) || 0;
    if (Number(license.grant_active) === 1) grantLabel = `Admin grant #${license.grant_id} (${license.grant_days_left || 0}d)`;
  } else if (trialEndsAt) {
    try {
      const ms = new Date(trialEndsAt) - Date.now();
      daysLeft = Math.max(0, Math.ceil(ms / 86400000));
      status = daysLeft > 0 ? 'trial' : 'trial_expired';
      allowed = daysLeft > 0;
    } catch {}
  }

  const map = {
    trial:              { label: `Trial ativo (${daysLeft} dias)`, cls: 'from-sky-500/20 to-sky-500/5 border-sky-400/30 text-sky-200', icon: <Clock size={16}/> },
    subscription_active:{ label: 'Assinatura ativa', cls: 'from-emerald-500/20 to-emerald-500/5 border-emerald-400/30 text-emerald-200', icon: <CheckCircle size={16}/> },
    admin_override_active:{ label: grantLabel || `Liberado Admin (${daysLeft} dias)`, cls: 'from-fuchsia-500/20 to-pink-500/5 border-fuchsia-400/30 text-fuchsia-200', icon: <Shield size={16}/> },
    blocked:            { label: 'Bloqueado (Admin)', cls: 'from-red-500/20 to-red-500/5 border-red-400/30 text-red-200', icon: <Ban size={16}/> },
    trial_expired:      { label: 'Trial expirado — Pagamento exigido', cls: 'from-amber-500/20 to-amber-500/5 border-amber-400/30 text-amber-200', icon: <AlertTriangle size={16}/> },
    no_trial:           { label: 'Sem trial — Pagamento exigido', cls: 'from-slate-500/20 to-slate-500/5 border-slate-400/30 text-slate-200', icon: <Shield size={16}/> },
    unknown:            { label: '—', cls: 'from-slate-500/20 to-slate-500/5 border-slate-400/30 text-slate-200', icon: <Activity size={16}/> },
  };
  const cfg = map[status] || map.unknown;
  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${cfg.cls} border px-4 py-2 ${big ? 'text-sm' : 'text-xs'} font-bold`}>
      <span className="shrink-0">{cfg.icon}</span>
      <span>{cfg.label}</span>
      <span className={`text-[10.5px] uppercase tracking-widest border px-2 py-0.5 rounded-full ${allowed ? 'border-emerald-400/40 text-emerald-300' : 'border-red-400/40 text-red-200'}`}>
        {allowed ? 'APP LIBERADO' : 'APP TRAVADO'}
      </span>
    </div>
  );
}
/* helper fallback: UserSummary só vem com licença resumida, detail vem completa. */
function buildLicenseFake(u, g) {
  if (u && typeof u === 'object' && u.license && typeof u.license === 'object') return u.license;
  return null;
}

export default App;
