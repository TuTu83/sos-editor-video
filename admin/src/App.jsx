import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings, Download, CreditCard, LogOut, Save, Activity, Ticket, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  if (!token) return <Login setToken={setToken} />;
  
  return <Dashboard token={token} setToken={setToken} />;
}

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        setError(data.error || 'Erro ao entrar');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-darker">
      <form onSubmit={handleSubmit} className="bg-dark p-8 rounded-xl border border-white/10 w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary">Admin Login</h2>
        {error && <div className="bg-red-500/20 text-red-500 p-2 rounded mb-4 text-sm">{error}</div>}
        <div className="mb-4">
            <label className="block text-sm mb-1">Usuário</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="mb-6">
            <label className="block text-sm mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button className="w-full bg-primary py-2 rounded font-bold hover:bg-blue-500 transition-colors">Entrar</button>
      </form>
    </div>
  );
}

function Dashboard({ token, setToken }) {
  const [activeTab, setActiveTab] = useState('stats');
  
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

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
    <div className="min-h-screen flex bg-darker text-white">
        {/* Sidebar */}
        <div className="w-64 bg-dark border-r border-white/10 p-6 flex flex-col">
            <div className="text-2xl font-bold mb-10 text-primary">Painel Admin</div>
            <nav className="flex-1 space-y-2">
                <NavBtn icon={<LayoutDashboard size={20}/>} label="Estatísticas" active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} />
                <NavBtn icon={<Settings size={20}/>} label="Configurações" active={activeTab==='settings'} onClick={()=>setActiveTab('settings')} />
                <NavBtn icon={<Download size={20}/>} label="Downloads" active={activeTab==='downloads'} onClick={()=>setActiveTab('downloads')} />
                <NavBtn icon={<CreditCard size={20}/>} label="Planos & Preços" active={activeTab==='plans'} onClick={()=>setActiveTab('plans')} />
                <NavBtn icon={<Ticket size={20}/>} label="Cupons" active={activeTab==='coupons'} onClick={()=>setActiveTab('coupons')} />
                <NavBtn icon={<Users size={20}/>} label="Usuários" active={activeTab==='users'} onClick={()=>setActiveTab('users')} />
            </nav>
            <button onClick={logout} className="flex items-center gap-3 p-3 text-red-400 hover:bg-white/5 rounded transition-colors mt-auto">
                <LogOut size={20} /> Sair
            </button>
        </div>
        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
            {renderContent()}
        </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${active ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            {icon} {label}
        </button>
    );
}

// --- TABS ---

function StatsTab({ token }) {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(setStats)
            .catch(err => console.error(err));
    }, [token]);

    if (!stats) return <div>Carregando...</div>;

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total de Visitas" value={stats.totalVisits} icon={<Activity className="text-blue-400"/>} />
                <StatCard title="Total de Downloads" value={stats.totalDownloads} icon={<Download className="text-green-400"/>} />
                {stats.downloadsByOS.map(d => (
                    <StatCard key={d.os} title={`Downloads (${d.os})`} value={d.count} icon={<MonitorIcon os={d.os}/>} />
                ))}
            </div>
            
            <div className="bg-dark p-6 rounded-xl border border-white/10 h-80">
                <h3 className="text-xl font-bold mb-4">Histórico de Visitas (7 dias)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.visitsHistory.reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip contentStyle={{backgroundColor: '#333', border: 'none'}} />
                        <Line type="monotone" dataKey="count" stroke="#00c3ff" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function SettingsTab({ token }) {
    const [settings, setSettings] = useState({});
    
    useEffect(() => {
        fetch('/api/config').then(res => res.json()).then(setSettings);
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(settings)
        }).then(() => alert('Salvo com sucesso!'));
    };

    return (
        <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-8">Configurações Gerais</h2>
            <div className="bg-dark p-6 rounded-xl border border-white/10 space-y-4">
                <InputGroup label="Nome do Site" name="site_name" val={settings.site_name} onChange={handleChange} />
                <InputGroup label="Título Hero" name="hero_title" val={settings.hero_title} onChange={handleChange} />
                <InputGroup label="Subtítulo Hero" name="hero_subtitle" val={settings.hero_subtitle} onChange={handleChange} />
                <InputGroup label="Logo URL" name="logo_url" val={settings.logo_url} onChange={handleChange} />
                <InputGroup label="Email de Contato" name="contact_email" val={settings.contact_email} onChange={handleChange} />
                <div className="flex items-center gap-2">
                    <label>Modo Manutenção:</label>
                    <select name="maintenance_mode" value={settings.maintenance_mode} onChange={handleChange} className="w-auto">
                        <option value="false">Desativado</option>
                        <option value="true">Ativado</option>
                    </select>
                </div>
                
                <h3 className="text-xl font-bold mt-6 mb-4 pt-4 border-t border-white/10">Pagamentos</h3>
                <div className="flex items-center gap-2">
                    <label>Sistema de Pagamento:</label>
                    <select name="payment_active" value={settings.payment_active} onChange={handleChange} className="w-auto">
                        <option value="false">Desativado (Modo Teste)</option>
                        <option value="true">Ativado (Produção)</option>
                    </select>
                </div>
                <InputGroup label="Chave PIX" name="pix_key" val={settings.pix_key} onChange={handleChange} />

                <button onClick={handleSave} className="btn btn-primary flex items-center gap-2 mt-4"><Save size={18}/> Salvar Alterações</button>
            </div>
        </div>
    );
}

function DownloadsTab({ token }) {
    const [downloads, setDownloads] = useState([]);

    useEffect(() => {
        fetch('/api/downloads').then(res => res.json()).then(setDownloads);
    }, []);

    const handleUpdate = (dl) => {
        fetch('/api/admin/download', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(dl)
        }).then(() => alert('Atualizado!'));
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8">Gerenciar Downloads</h2>
            <div className="grid gap-6">
                {downloads.map((dl, idx) => (
                    <div key={dl.os} className="bg-dark p-6 rounded-xl border border-white/10 flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Sistema ({dl.os})</label>
                            <input disabled value={dl.os} className="opacity-50 cursor-not-allowed" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-1">Versão</label>
                            <input value={dl.version} onChange={e => {
                                const newDl = [...downloads];
                                newDl[idx].version = e.target.value;
                                setDownloads(newDl);
                            }} />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-sm text-gray-400 mb-1">URL do Arquivo</label>
                            <input value={dl.url} onChange={e => {
                                const newDl = [...downloads];
                                newDl[idx].url = e.target.value;
                                setDownloads(newDl);
                            }} />
                        </div>
                        <button onClick={() => handleUpdate(dl)} className="btn bg-green-600 hover:bg-green-500 text-white"><Save size={18}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PlansTab({ token }) {
    const [plans, setPlans] = useState([]);

    useEffect(() => {
        fetch('/api/plans').then(res => res.json()).then(setPlans);
    }, []);

    const handleUpdate = (plan) => {
        fetch('/api/admin/plans', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(plan)
        }).then(() => alert('Plano atualizado!'));
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8">Gerenciar Planos</h2>
            <div className="grid gap-6">
                {plans.map((p, idx) => (
                    <div key={p.id} className="bg-dark p-6 rounded-xl border border-white/10 flex gap-4 items-end">
                        <div className="w-32">
                            <label className="block text-sm text-gray-400 mb-1">Nome</label>
                            <input disabled value={p.name} className="opacity-50" />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
                            <input type="number" step="0.01" value={p.price} onChange={e => {
                                const newPlans = [...plans];
                                newPlans[idx].price = e.target.value;
                                setPlans(newPlans);
                            }} />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm text-gray-400 mb-1">Status</label>
                            <select value={p.active} onChange={e => {
                                const newPlans = [...plans];
                                newPlans[idx].active = parseInt(e.target.value);
                                setPlans(newPlans);
                            }}>
                                <option value={1}>Ativo</option>
                                <option value={0}>Inativo</option>
                            </select>
                        </div>
                         <button onClick={() => handleUpdate(p)} className="btn bg-green-600 hover:bg-green-500 text-white"><Save size={18}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CouponsTab({ token }) {
    const [coupons, setCoupons] = useState([]);
    const [newCode, setNewCode] = useState('');
    const [newDiscount, setNewDiscount] = useState('');

    const fetchCoupons = () => {
        fetch('/api/admin/coupons', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(setCoupons);
    };

    useEffect(fetchCoupons, []);

    const handleAdd = () => {
        if (!newCode || !newDiscount) return;
        fetch('/api/admin/coupons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ code: newCode, discount: newDiscount })
        }).then(() => {
            setNewCode('');
            setNewDiscount('');
            fetchCoupons();
        });
    };

    const handleDelete = (id) => {
        if (!confirm('Tem certeza?')) return;
        fetch(`/api/admin/coupons/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(fetchCoupons);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-8">Gerenciar Cupons</h2>
            
            <div className="bg-dark p-6 rounded-xl border border-white/10 mb-8 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-1">Código do Cupom</label>
                    <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="EX: PROMO10" />
                </div>
                <div className="w-32">
                    <label className="block text-sm text-gray-400 mb-1">Desconto (%)</label>
                    <input type="number" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} placeholder="10" />
                </div>
                <button onClick={handleAdd} className="btn btn-primary">Adicionar</button>
            </div>

            <div className="grid gap-4">
                {coupons.map(c => (
                    <div key={c.id} className="bg-dark p-4 rounded-xl border border-white/10 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-lg">{c.code}</div>
                            <div className="text-sm text-gray-400">{c.discount}% de desconto</div>
                        </div>
                        <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300"><LogOut size={18}/></button>
                    </div>
                ))}
                {coupons.length === 0 && <p className="text-gray-500">Nenhum cupom ativo.</p>}
            </div>
        </div>
    );
}

function UsersTab({ token }) {
    return (
        <div>
            <h2 className="text-3xl font-bold mb-8">Gerenciar Usuários</h2>
            <div className="bg-dark p-12 rounded-xl border border-white/10 text-center">
                <Users size={48} className="mx-auto text-gray-600 mb-4"/>
                <h3 className="text-xl font-bold mb-2">Em Breve</h3>
                <p className="text-gray-400">O sistema de login de usuários estará disponível nas próximas atualizações.</p>
            </div>
        </div>
    );
}

// Components
function StatCard({ title, value, icon }) {
    return (
        <div className="bg-dark p-6 rounded-xl border border-white/10 flex items-center justify-between">
            <div>
                <div className="text-gray-400 text-sm mb-1">{title}</div>
                <div className="text-3xl font-bold">{value}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">{icon}</div>
        </div>
    );
}

function InputGroup({ label, name, val, onChange }) {
    return (
        <div>
            <label className="block text-sm text-gray-400 mb-1">{label}</label>
            <input name={name} value={val || ''} onChange={onChange} />
        </div>
    );
}

function MonitorIcon({ os }) {
    return <div className="text-xl font-bold">{os.substring(0,3).toUpperCase()}</div>;
}

export default App;
