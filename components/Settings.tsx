
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Clock, Save, CheckCircle2, LogOut, Database, Lock, Unlock, Server, ShieldAlert, Eye, EyeOff, Loader2, Code, Copy, Check, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { saveConnectionSettings, clearConnectionSettings, isSupabaseConfigured, isKeyLikelyStripe, isKeyCorrectFormat } from '../lib/supabase';
import { useData } from '../lib/DataContext';
import Modal from './ui/Modal';

const Settings: React.FC = () => {
    const { user, signIn, signOut } = useAuth();
    const { saveSystemSetting } = useData();
    
    const [timeoutMinutes, setTimeoutMinutes] = useState('15');
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [isDbLocked, setIsDbLocked] = useState(true);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [showSchema, setShowSchema] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const storedTimeout = localStorage.getItem('custom_session_timeout');
        if (storedTimeout) setTimeoutMinutes(storedTimeout);
        const storedUrl = localStorage.getItem('custom_supabase_url');
        const storedKey = localStorage.getItem('custom_supabase_key');
        if (storedUrl) setDbUrl(storedUrl);
        if (storedKey) setDbKey(storedKey);
    }, []);

    const handleSaveAppConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        if (timeoutMinutes) {
            await saveSystemSetting('custom_session_timeout', timeoutMinutes);
        }
        setSaved(true);
        setIsSaving(false);
        setTimeout(async () => {
            localStorage.removeItem('active_mock_user');
            await signOut();
            window.location.reload();
        }, 1000);
    };

    const handleUnlockDbSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setDbError(null);
        if (user && user.email) {
            const result = await signIn(user.email, unlockPassword);
            if (result.error) {
                setDbError("Incorrect password.");
                setIsVerifying(false);
            } else {
                setIsDbLocked(false);
                setIsVerifying(false);
                setUnlockPassword('');
            }
        } else {
            setDbError("User session not found.");
            setIsVerifying(false);
        }
    };

    const handleSaveDatabase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dbUrl.startsWith('http')) { alert("Invalid URL."); return; }
        if (dbKey.length < 20) { alert("Invalid Key."); return; }
        saveConnectionSettings(dbUrl, dbKey);
    };

    const handleDisconnectDatabase = () => {
        if(window.confirm("Are you sure?")) clearConnectionSettings();
    }

    const dbSchemaSql = `
-- FIX FOR ACCOUNT LINKAGE (BUSINESS ENTITY ID TYPE MISMATCH)
CREATE TABLE IF NOT EXISTS business_entities (
  id text primary key,
  name text not null,
  structure text not null,
  tax_form text not null,
  ein text,
  created_at timestamp with time zone default now()
);

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='business_entity_id') THEN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name='accounts' AND column_name='business_entity_id') != 'text' THEN
       ALTER TABLE accounts DROP COLUMN business_entity_id;
       ALTER TABLE accounts ADD COLUMN business_entity_id text REFERENCES business_entities(id) ON DELETE SET NULL;
    END IF;
  ELSE
    ALTER TABLE accounts ADD COLUMN business_entity_id text REFERENCES business_entities(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS app_settings (key text primary key, value text not null);
CREATE TABLE IF NOT EXISTS categories (id text primary key default gen_random_uuid()::text, name text not null, type text not null, is_tax_deductible boolean DEFAULT true);
CREATE TABLE IF NOT EXISTS trucks (id text primary key default gen_random_uuid()::text, unit_number text not null, make text, model text, year numeric);
CREATE TABLE IF NOT EXISTS fiscal_year_records (year integer primary key, status text not null, manual_balance numeric, notes text);
CREATE TABLE IF NOT EXISTS transactions (
    id text primary key default gen_random_uuid()::text,
    date timestamp with time zone not null,
    description text not null,
    amount numeric not null,
    type text not null,
    account_id text,
    to_account_id text,
    category_id text,
    truck_id text,
    receipts text[]
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_year_records ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all' AND tablename = 'accounts') THEN
        CREATE POLICY "Enable all" ON accounts FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Enable all" ON business_entities FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Enable all" ON categories FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Enable all" ON trucks FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Enable all" ON transactions FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Enable all" ON app_settings FOR ALL USING (true) WITH CHECK (true);
        CREATE POLICY "Enable all" ON fiscal_year_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`.trim();

    return (
        <div className="mb-5" style={{ maxWidth: '800px' }}>
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Settings</h2>
                  <p className="text-muted mb-0">System configuration and database bridge.</p>
                </div>
            </div>

            <Card className="mb-4 border-primary border-opacity-25 shadow-sm overflow-hidden">
                <CardHeader className="bg-primary bg-opacity-10 border-bottom-0 py-3">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center">
                            <Database className="me-2 text-primary" size={20} />
                            <CardTitle>Database Connection (Supabase)</CardTitle>
                        </div>
                        {!isDbLocked && (
                             <button onClick={() => setShowSchema(true)} className="btn btn-sm btn-primary d-flex align-items-center shadow-sm">
                                <Code size={14} className="me-1"/> Run Migration
                             </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {isDbLocked ? (
                        <div className="text-center py-4">
                            <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
                                <Lock size={32} className="text-muted opacity-50" />
                            </div>
                            <h6 className="fw-bold text-dark mb-1">Settings Locked</h6>
                            <p className="text-muted small mb-4">Enter admin password to access Database & Migration tools.</p>
                            
                            <form onSubmit={handleUnlockDbSettings} className="d-inline-block text-start w-100" style={{maxWidth: '320px'}}>
                                <div className="input-group mb-2 shadow-sm">
                                    <input type="password"  className="form-control" placeholder="Admin Password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} required />
                                    <button className="btn btn-primary px-4" type="submit" disabled={isVerifying}>
                                        {isVerifying ? <Loader2 size={16} className="animate-spin" /> : 'Unlock'}
                                    </button>
                                </div>
                                {dbError && <div className="text-danger small fw-bold mt-2 text-center"><ShieldAlert size={14} className="me-1"/> {dbError}</div>}
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveDatabase}>
                            <div className="alert alert-success d-flex align-items-center small mb-4 py-2 bg-opacity-10 border-success border-opacity-25">
                                <Unlock size={16} className="me-2 text-success" />
                                <div className="fw-bold text-success">Configuration Unlocked</div>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label fw-bold small text-muted">Project URL</label>
                                <input type="url" className="form-control" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} placeholder="https://your-project.supabase.co" required />
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted">Anon API Key</label>
                                <div className="input-group">
                                    <input type={showKey ? "text" : "password"} className={`form-control ${dbKey && !isKeyCorrectFormat(dbKey) ? 'border-warning shadow-none' : ''}`} value={dbKey} onChange={(e) => setDbKey(e.target.value)} required placeholder="eyJ..." />
                                    <button type="button" className="btn btn-light border" onClick={() => setShowKey(!showKey)}>
                                        {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                
                                {dbKey && isKeyLikelyStripe(dbKey) && (
                                    <div className="alert alert-warning mt-2 mb-0 py-2 small d-flex align-items-start">
                                        <AlertTriangle size={16} className="me-2 flex-shrink-0 mt-1" />
                                        <div>
                                            <strong>Warning:</strong> This looks like a <strong>Stripe key</strong> (starts with sb_ or pk_). 
                                            Supabase keys always start with <strong>eyJ...</strong>. Please check your Supabase Dashboard.
                                        </div>
                                    </div>
                                )}

                                {dbKey && !isKeyLikelyStripe(dbKey) && !isKeyCorrectFormat(dbKey) && (
                                    <div className="alert alert-info mt-2 mb-0 py-2 small d-flex align-items-start">
                                        <Info size={16} className="me-2 flex-shrink-0 mt-1" />
                                        <div>
                                            A typical Supabase Anon Key starts with <strong>eyJ...</strong>. If connection fails, double check the key.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-4">
                                {isSupabaseConfigured && (
                                    <button type="button" onClick={handleDisconnectDatabase} className="btn btn-outline-danger btn-sm px-3">
                                        Disconnect
                                    </button>
                                )}
                                <div className="d-flex gap-2 ms-auto">
                                    <button type="button" onClick={() => setIsDbLocked(true)} className="btn btn-light border">Lock</button>
                                    <button type="submit" className="btn btn-primary px-4">Save & Reload</button>
                                </div>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Card className="mb-4">
                <CardHeader><div className="d-flex align-items-center"><Clock className="me-2 text-primary" size={20} /><CardTitle>Application Settings</CardTitle></div></CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveAppConfig}>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Session Timeout (Minutes)</label>
                            <div className="input-group" style={{ maxWidth: '300px' }}>
                                <input type="number" className="form-control" value={timeoutMinutes} onChange={(e) => setTimeoutMinutes(e.target.value)} min="1" max="1440" required />
                                <span className="input-group-text bg-light">minutes</span>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-3 mt-4">
                            <button type="submit" className="btn btn-primary d-flex align-items-center px-4" disabled={isSaving}>
                                {isSaving ? <Loader2 size={18} className="me-2 animate-spin"/> : <Save size={18} className="me-2" />}
                                Save Config
                            </button>
                            {saved && <span className="text-success d-flex align-items-center small fw-bold"><CheckCircle2 size={18} className="me-1" /> Saved!</span>}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Modal isOpen={showSchema} onClose={() => setShowSchema(false)} title="Database Migration" size="lg">
                <div className="mb-4">
                    <div className="alert alert-info small mb-3">
                        Copy and run this in your Supabase SQL Editor to prepare your database.
                    </div>
                    <div className="position-relative">
                        <pre className="bg-dark text-success p-3 rounded small mb-0" style={{maxHeight: '300px', overflowY: 'auto'}}><code>{dbSchemaSql}</code></pre>
                        <button className="btn btn-sm btn-light border position-absolute top-0 end-0 m-2" onClick={() => { navigator.clipboard.writeText(dbSchemaSql); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
