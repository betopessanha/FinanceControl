
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Clock, Save, CheckCircle2, LogOut, Database, Lock, Unlock, Server, ShieldAlert, Eye, EyeOff, Loader2, Code, Copy, Check, Info, AlertTriangle, UserCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { saveConnectionSettings, clearConnectionSettings, isSupabaseConfigured, isKeyLikelyStripe, isKeyCorrectFormat } from '../lib/supabase';
import { useData } from '../lib/DataContext';
import Modal from './ui/Modal';

const Settings: React.FC = () => {
    const { user, signIn, signOut, updateLocalCredentials } = useAuth();
    const { saveSystemSetting } = useData();
    
    const [timeoutMinutes, setTimeoutMinutes] = useState('15');
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // DB Settings
    const [isDbLocked, setIsDbLocked] = useState(true);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [showSchema, setShowSchema] = useState(false);
    const [copied, setCopied] = useState(false);

    // Local Auth Settings
    const [localUser, setLocalUser] = useState(user?.email || '');
    const [localPass, setLocalPass] = useState('');
    const [isUpdatingAuth, setIsUpdatingAuth] = useState(false);
    const [authSuccess, setAuthSuccess] = useState(false);

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
        setTimeout(() => setSaved(false), 2000);
    };

    const handleUpdateLocalAuth = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingAuth(true);
        updateLocalCredentials(localUser, localPass);
        setAuthSuccess(true);
        setIsUpdatingAuth(false);
        setLocalPass('');
        setTimeout(() => setAuthSuccess(false), 3000);
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
        if(window.confirm("Are you sure? This will disconnect your Cloud Database.")) clearConnectionSettings();
    }

    const schemaSQL = `-- SUPABASE SQL SETUP
-- Run this in your Supabase SQL Editor to enable the required tables and security.

-- 1. Create Tables with UUID support and user ownership
CREATE TABLE IF NOT EXISTS business_entities (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
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
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    business_entity_id UUID REFERENCES business_entities(id),
    name TEXT NOT NULL,
    type TEXT,
    initial_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trucks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    unit_number TEXT NOT NULL,
    make TEXT,
    model TEXT,
    year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    name TEXT NOT NULL,
    type TEXT,
    is_tax_deductible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loads (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    truck_id UUID REFERENCES trucks(id),
    current_location TEXT,
    pickup_location TEXT,
    delivery_location TEXT,
    miles_to_pickup DECIMAL(10,2) DEFAULT 0,
    miles_to_delivery DECIMAL(10,2) DEFAULT 0,
    pickup_date DATE,
    delivery_date DATE,
    payment_type TEXT,
    rate DECIMAL(15,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'Planned',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    account_id UUID REFERENCES bank_accounts(id),
    category_id UUID REFERENCES categories(id),
    truck_id UUID REFERENCES trucks(id),
    to_account_id UUID REFERENCES bank_accounts(id),
    date DATE NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS (MANDATORY TO FIX 42501 ERROR)
ALTER TABLE business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES (Allow authenticated users to manage their OWN data)
-- Use this pattern for all tables:
CREATE POLICY "Manage own loads" ON loads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own business_entities" ON business_entities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own bank_accounts" ON bank_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own trucks" ON trucks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

    const handleCopySQL = () => {
        navigator.clipboard.writeText(schemaSQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mb-5" style={{ maxWidth: '1000px' }}>
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Settings</h2>
                  <p className="text-muted mb-0">Control your system security, session and cloud bridge.</p>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-7">
                    {/* Database Section */}
                    <Card className="mb-4 border-primary border-opacity-25 shadow-sm overflow-hidden">
                        <CardHeader className="bg-primary bg-opacity-10 border-bottom-0 py-3 px-4">
                            <div className="d-flex align-items-center justify-content-between w-100">
                                <div className="d-flex align-items-center">
                                    <Database className="me-2 text-primary" size={20} />
                                    <CardTitle>Cloud Connection Bridge</CardTitle>
                                </div>
                                {!isDbLocked && (
                                    <button onClick={() => setShowSchema(true)} className="btn btn-sm btn-primary d-flex align-items-center shadow-sm">
                                        <Code size={14} className="me-1"/> SQL Editor
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 px-4">
                            {isDbLocked ? (
                                <div className="text-center py-4">
                                    <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
                                        <Lock size={32} className="text-muted opacity-50" />
                                    </div>
                                    <h6 className="fw-bold text-dark mb-1">Connection Settings Locked</h6>
                                    <p className="text-muted small mb-4">Enter your login password to modify database settings.</p>
                                    
                                    <form onSubmit={handleUnlockDbSettings} className="d-inline-block text-start w-100" style={{maxWidth: '320px'}}>
                                        <div className="input-group mb-2 shadow-sm border rounded">
                                            <input type="password"  className="form-control border-0" placeholder="Verification Password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} required />
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
                                        <div className="fw-bold text-success">Identity Verified: Bridge Unlocked</div>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-muted">Supabase Project URL</label>
                                        <input type="url" className="form-control bg-light" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} placeholder="https://..." required />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label fw-bold small text-muted">Anon API Key</label>
                                        <div className="input-group">
                                            <input type={showKey ? "text" : "password"} className={`form-control bg-light ${dbKey && !isKeyCorrectFormat(dbKey) ? 'border-warning' : ''}`} value={dbKey} onChange={(e) => setDbKey(e.target.value)} required placeholder="eyJ..." />
                                            <button type="button" className="btn btn-light border" onClick={() => setShowKey(!showKey)}>
                                                {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center border-top pt-3">
                                        <button type="button" onClick={handleDisconnectDatabase} className="btn btn-outline-danger btn-sm">Disconnect Cloud</button>
                                        <div className="d-flex gap-2">
                                            <button type="button" onClick={() => setIsDbLocked(true)} className="btn btn-light border btn-sm">Re-lock</button>
                                            <button type="submit" className="btn btn-primary btn-sm px-3">Save & Sync</button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* App Settings */}
                    <Card>
                        <CardHeader className="px-4 pt-4"><div className="d-flex align-items-center"><Clock className="me-2 text-primary" size={20} /><CardTitle>Session Control</CardTitle></div></CardHeader>
                        <CardContent className="px-4">
                            <form onSubmit={handleSaveAppConfig}>
                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted">Auto-logout Inactivity Timeout</label>
                                    <div className="input-group" style={{ maxWidth: '200px' }}>
                                        <input type="number" className="form-control" value={timeoutMinutes} onChange={(e) => setTimeoutMinutes(e.target.value)} min="1" max="1440" required />
                                        <span className="input-group-text bg-light border">min</span>
                                    </div>
                                    <div className="form-text small">Session expires after inactivity. Setting this too high may reduce security.</div>
                                </div>
                                <div className="d-flex align-items-center gap-3 mt-4">
                                    <button type="submit" className="btn btn-primary d-flex align-items-center px-4" disabled={isSaving}>
                                        {isSaving ? <Loader2 size={18} className="me-2 animate-spin"/> : <Save size={18} className="me-2" />}
                                        Save Session Config
                                    </button>
                                    {saved && <span className="text-success small fw-bold"><CheckCircle2 size={18} className="me-1" /> Config Updated</span>}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-lg-5">
                    {/* Local User Management */}
                    <Card className="mb-4">
                        <CardHeader className="px-4 pt-4">
                            <div className="d-flex align-items-center">
                                <ShieldCheck className="me-2 text-primary" size={20} />
                                <CardTitle>Local Account Security</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4">
                            <div className="alert alert-secondary bg-opacity-10 border-0 small py-2 mb-4">
                                <Info size={14} className="me-2"/> You can define your own user and password for Local Mode access.
                            </div>
                            <form onSubmit={handleUpdateLocalAuth}>
                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted">User Name / Email</label>
                                    <input type="text" className="form-control" value={localUser} onChange={e => setLocalUser(e.target.value)} required />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label fw-bold small text-muted">New Password</label>
                                    <input type="password" placeholder="••••••••" className="form-control" value={localPass} onChange={e => setLocalPass(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn btn-dark w-100 d-flex align-items-center justify-content-center gap-2" disabled={isUpdatingAuth}>
                                    {isUpdatingAuth ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                    Update Local Credentials
                                </button>
                                {authSuccess && <div className="text-success small fw-bold mt-2 text-center animate-pulse"><CheckCircle2 size={14} /> Credentials updated successfully!</div>}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Current Profile Card */}
                    <Card className="bg-primary bg-opacity-10 border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-center mb-3">
                                <div className="bg-white rounded-circle d-inline-flex p-3 mb-2 shadow-sm border border-primary border-opacity-25">
                                    <UserCircle size={48} className="text-primary" />
                                </div>
                                <h5 className="fw-bold text-dark mb-0">{user?.email || 'Active User'}</h5>
                                <span className="badge bg-primary rounded-pill small">{user?.role?.toUpperCase()}</span>
                            </div>
                            <hr className="opacity-10" />
                            <div className="small mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Status:</span>
                                    <span className="text-success fw-bold">Active Session</span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-muted">Environment:</span>
                                    <span className="text-dark fw-bold">{isSupabaseConfigured ? 'Cloud Bridge' : 'Local Instance'}</span>
                                </div>
                            </div>
                            <button onClick={() => signOut()} className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2">
                                <LogOut size={16} /> End Current Session
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SQL Schema Modal */}
            <Modal isOpen={showSchema} onClose={() => setShowSchema(false)} title="SQL Schema & RLS Setup" size="lg">
                <div className="p-2">
                    <div className="alert alert-warning small d-flex align-items-start mb-4">
                        <AlertTriangle size={18} className="me-2 mt-1 flex-shrink-0" />
                        <div>
                            <strong>Action Required:</strong> To fix the "42501 - Row Level Security" error, you must copy the code below and run it in your <strong>Supabase SQL Editor</strong>. This will enable proper ownership tracking using <code>user_id</code>.
                        </div>
                    </div>
                    <div className="position-relative bg-dark rounded-4 overflow-hidden">
                        <pre className="p-4 text-light small overflow-auto" style={{ maxHeight: '400px' }}>
                            <code>{schemaSQL}</code>
                        </pre>
                        <button 
                            className="btn btn-sm btn-white position-absolute top-0 end-0 m-3 d-flex align-items-center gap-2 shadow"
                            onClick={handleCopySQL}
                        >
                            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            {copied ? 'Copied!' : 'Copy SQL'}
                        </button>
                    </div>
                    <div className="mt-4 pt-3 border-top text-end">
                        <button className="btn btn-black px-4 rounded-3" onClick={() => setShowSchema(false)}>Close Editor</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
