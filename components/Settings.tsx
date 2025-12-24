
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Database, Lock, Loader2, Code, Copy, Check, AlertTriangle, UserCircle, LogOut, RefreshCw, Trash2, Activity, ShieldCheck, ShieldAlert, Settings as SettingsIcon, CloudUpload } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { saveConnectionSettings, clearConnectionSettings, isSupabaseConfigured } from '../lib/supabase';
import { useData } from '../lib/DataContext';
import Modal from './ui/Modal';

const Settings: React.FC = () => {
    const { user, signIn, signOut } = useAuth();
    const { isCloudConnected, refreshData, loadRecords, transactions, trucks, accounts, pushLocalDataToCloud } = useData();
    
    const [isDbLocked, setIsDbLocked] = useState(true);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{success: boolean, message: string} | null>(null);
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [dbError, setDbError] = useState<string | null>(null);
    const [showSchema, setShowSchema] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setDbUrl(localStorage.getItem('custom_supabase_url') || '');
        setDbKey(localStorage.getItem('custom_supabase_key') || '');
    }, []);

    const handleUnlockDbSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        const res = await signIn(user?.email || 'admin', unlockPassword);
        if (res.error) setDbError("Incorrect password.");
        else setIsDbLocked(false);
        setIsVerifying(false);
    };

    const handlePushToCloud = async () => {
        if (!confirm("Isso enviará todos os seus dados locais (Caminhões, Contas, Transações) para a nuvem. Deseja continuar?")) return;
        setIsSyncing(true);
        setSyncResult(null);
        const res = await pushLocalDataToCloud();
        setSyncResult(res);
        setIsSyncing(false);
    };

    const schemaSQL = `-- TRUCKING.IO - USA ACCOUNTING ENGINE (v15)
-- FIX: user_id ALLOW NULL para permitir seeding via SQL Editor

-- 1. Limpeza
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.loads CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.business_entities CASCADE;
DROP TABLE IF EXISTS public.trucks CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- 2. Estrutura (Removido NOT NULL de user_id para compatibilidade com Seeding Manual)
CREATE TABLE public.business_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    name TEXT NOT NULL,
    structure TEXT,
    tax_form TEXT,
    ein TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_tax_deductible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    unit_number TEXT NOT NULL,
    make TEXT,
    model TEXT,
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT,
    initial_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    type TEXT NOT NULL,
    to_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT auth.uid(),
    truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
    current_location TEXT,
    pickup_location TEXT,
    pickup_date DATE,
    delivery_location TEXT,
    delivery_date DATE,
    miles_to_pickup DECIMAL(15,2) DEFAULT 0,
    miles_to_delivery DECIMAL(15,2) DEFAULT 0,
    total_miles DECIMAL(15,2) DEFAULT 0,
    payment_type TEXT,
    rate DECIMAL(15,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'Planned',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Inserção de Categorias Contábeis USA Padrão
-- Estas categorias ficarão com user_id NULL, tornando-as "globais" ou "sugeridas"
INSERT INTO public.categories (name, type, is_tax_deductible) VALUES
('Freight Revenue', 'Income', false),
('Fuel Surcharge', 'Income', false),
('Detention / Layover', 'Income', false),
('Fuel & DEF', 'Expense', true),
('Repairs & Maintenance', 'Expense', true),
('Tires', 'Expense', true),
('Insurance Premiums', 'Expense', true),
('Licenses & Permits', 'Expense', true),
('Tolls & Scales', 'Expense', true),
('Factoring Fees', 'Expense', true),
('Dispatch Fees', 'Expense', true),
('Driver Wages', 'Expense', true),
('Meals & Per Diem', 'Expense', true),
('Office & Software', 'Expense', true),
('Communications', 'Expense', true),
('Professional Services (CPA/Legal)', 'Expense', true),
('Loan Interest', 'Expense', true),
('Equipment Lease', 'Expense', true),
('HVUT 2290 Tax', 'Expense', true),
('Owner Draw / Distributions', 'Expense', false),
('Loan Principal Payment', 'Expense', false),
('Personal Expenses', 'Expense', false);

-- 4. RLS
ALTER TABLE public.business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

-- 5. Políticas (Permite ver itens com user_id NULL ou do próprio usuário)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('business_entities', 'categories', 'trucks', 'bank_accounts', 'transactions', 'loads')
    LOOP
        EXECUTE format('CREATE POLICY "FullAccess" ON public.%I FOR ALL USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id)', t);
    END LOOP;
END $$;

-- 6. Trigger (Garante que novos inserts via APP peguem o user_id do logado)
CREATE OR REPLACE FUNCTION public.set_user_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('business_entities', 'categories', 'trucks', 'bank_accounts', 'transactions', 'loads')
    LOOP
        EXECUTE format('CREATE TRIGGER tr_set_uid BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION set_user_id()', t);
    END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;`;

    return (
        <div className="container py-4 animate-slide-up">
            <div className="d-flex align-items-center gap-3 mb-4">
                <SettingsIcon className="text-primary" size={32} />
                <div>
                    <h2 className="fw-bold mb-0">System Settings</h2>
                    <p className="text-muted mb-0">Cloud management and data integrity.</p>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-7">
                    <Card className="mb-4 border-0 shadow-sm overflow-hidden">
                        <CardHeader className="bg-dark text-white py-3">
                            <div className="d-flex align-items-center justify-content-between w-100">
                                <div className="d-flex align-items-center gap-2">
                                    <Activity size={20} className="text-success" />
                                    <CardTitle className="text-white">Integrity Monitor</CardTitle>
                                </div>
                                <button onClick={handlePushToCloud} disabled={isSyncing || !isCloudConnected} className="btn btn-sm btn-primary d-flex align-items-center gap-2 px-3 shadow">
                                    {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <CloudUpload size={14}/>}
                                    Push Local Data to Cloud
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 bg-light bg-opacity-50">
                            {syncResult && (
                                <div className={`alert ${syncResult.success ? 'alert-success' : 'alert-danger'} small mb-3 border-0 shadow-sm`}>
                                    {syncResult.success ? <Check size={16} className="me-2"/> : <AlertTriangle size={16} className="me-2"/>}
                                    {syncResult.message}
                                </div>
                            )}
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className="p-3 bg-white rounded-3 border shadow-sm h-100">
                                        <small className="text-muted d-block fw-bold text-uppercase" style={{fontSize: '0.6rem'}}>Local Browser Items</small>
                                        <div className="d-flex align-items-baseline gap-2 mt-2">
                                            <h2 className="fw-900 mb-0">{loadRecords.length + transactions.length + trucks.length}</h2>
                                            <span className="text-success small fw-bold"><ShieldCheck size={14}/> Safe</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 bg-white rounded-3 border shadow-sm h-100">
                                        <small className="text-muted d-block fw-bold text-uppercase" style={{fontSize: '0.6rem'}}>Cloud Sync Status</small>
                                        <div className="d-flex align-items-baseline gap-2 mt-2">
                                            <h2 className={`fw-900 mb-0 ${isCloudConnected ? 'text-primary' : 'text-warning'}`}>{isCloudConnected ? 'Connected' : 'Offline'}</h2>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-25 d-flex align-items-start gap-3">
                                <ShieldCheck className="text-primary mt-1" size={20} />
                                <div className="small">
                                    <strong>Offline-First Active:</strong> Data is safe in browser storage. Se o seu banco estiver vazio, use o botão <strong>Push</strong> acima para enviar seus dados locais para a nuvem.
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0">
                        <CardHeader className="py-3 border-bottom">
                            <div className="d-flex align-items-center justify-content-between w-100">
                                <div className="d-flex align-items-center"><Database className="text-primary me-2" size={20}/><CardTitle>Cloud Configuration</CardTitle></div>
                                {!isDbLocked && <button onClick={() => setShowSchema(true)} className="btn btn-sm btn-danger px-3 shadow-sm d-flex align-items-center gap-2"><Code size={16}/> NUCLEAR RESET SQL</button>}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {isDbLocked ? (
                                <div className="text-center py-4">
                                    <h6 className="fw-bold">Security Lock</h6>
                                    <p className="text-muted small mb-4">Confirm password to edit DB settings.</p>
                                    <form onSubmit={handleUnlockDbSettings} className="mt-3 mx-auto" style={{maxWidth: '300px'}}>
                                        <div className="input-group mb-2">
                                            <input type="password"  className="form-control" placeholder="App Password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} required />
                                            <button className="btn btn-primary px-4" type="submit" disabled={isVerifying}>{isVerifying ? <Loader2 className="animate-spin" size={16}/> : 'Unlock'}</button>
                                        </div>
                                        {dbError && <div className="text-danger small mt-2 fw-bold">{dbError}</div>}
                                    </form>
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); saveConnectionSettings(dbUrl, dbKey); }}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">SUPABASE PROJECT URL</label>
                                        <input type="text" className="form-control bg-light" value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="https://..." />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label small fw-bold text-muted">ANON API KEY</label>
                                        <input type="password"  className="form-control bg-light" value={dbKey} onChange={e => setDbKey(e.target.value)} placeholder="eyJ..." />
                                    </div>
                                    <div className="d-flex justify-content-between pt-3 border-top">
                                        <button type="button" onClick={clearConnectionSettings} className="btn btn-outline-danger btn-sm px-3">Clear Settings</button>
                                        <div className="d-flex gap-2">
                                            <button type="button" onClick={() => setIsDbLocked(true)} className="btn btn-light btn-sm px-3 border">Lock</button>
                                            <button type="submit" className="btn btn-primary btn-sm px-4 shadow-sm">Save & Sync</button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="col-lg-5">
                    <Card className="h-100 bg-white border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 border"><UserCircle size={64} className="text-primary"/></div>
                            <h4 className="fw-bold mb-1">{user?.email || 'Guest User'}</h4>
                            <div className={`badge ${isCloudConnected ? 'bg-success' : 'bg-warning'} rounded-pill px-3 py-2 mt-2 mb-4 shadow-sm`}>
                                {isCloudConnected ? 'Cloud Real-time Engine' : 'Offline Engine Active'}
                            </div>
                            
                            <div className="d-grid gap-2 mt-2">
                                <button onClick={refreshData} className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-2 py-2">
                                    <RefreshCw size={18} /> Refresh Data
                                </button>
                                <button onClick={() => { if(confirm("Clear local cache? This won't delete cloud data.")) { localStorage.clear(); window.location.reload(); }}} className="btn btn-link text-danger small mt-2">
                                    <Trash2 size={14} className="me-1" /> Clear Local Cache
                                </button>
                            </div>
                            <hr className="my-4 opacity-5" />
                            <button onClick={() => signOut()} className="btn btn-outline-danger w-100 py-2 rounded-3">
                                <LogOut size={18} className="me-2" /> Sign Out
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal isOpen={showSchema} onClose={() => setShowSchema(false)} title="NUCLEAR RESET SQL (v15)" size="lg">
                <div className="alert alert-danger small mb-3 shadow-sm border-0 d-flex align-items-start">
                    <AlertTriangle size={24} className="me-3 mt-1 flex-shrink-0" />
                    <div>
                        <h6 className="fw-bold mb-1">CUIDADO: ESTE SCRIPT APAGA TUDO</h6>
                        Para que o cadastro funcione, o Supabase precisa de uma estrutura limpa e do cache atualizado.
                        <ol className="ps-3 mt-2 mb-0">
                            <li>Copie o script v15 abaixo (corrigido para Seeding).</li>
                            <li>No Supabase, vá em <strong>SQL Editor</strong> e rode o script.</li>
                            <li><strong>PASSO CRÍTICO:</strong> Vá em <strong>Settings {' > '} API {' > '} PostgREST</strong> e clique no botão <strong>'Reload Schema Cache'</strong>. Sem isso, o Supabase continuará achando que as tabelas são as antigas.</li>
                        </ol>
                    </div>
                </div>
                <div className="position-relative bg-dark rounded p-3">
                    <pre className="text-white small mb-0 p-2" style={{maxHeight: '400px', overflow: 'auto', fontFamily: 'monospace'}}>{schemaSQL}</pre>
                    <button className="btn btn-sm btn-white position-absolute top-0 end-0 m-3 d-flex align-items-center gap-2 shadow" onClick={() => { navigator.clipboard.writeText(schemaSQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                        {copied ? <Check size={14} className="text-success" /> : <Copy size={14}/>}
                        {copied ? 'Copied!' : 'Copy Script'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
