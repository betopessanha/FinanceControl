
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Clock, Save, CheckCircle2, LogOut, Briefcase, PlusCircle, Trash2, Edit2, Building, Database, Lock, Unlock, Server, ShieldAlert, Eye, EyeOff, Loader2, Code, Copy, Check } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { saveConnectionSettings, clearConnectionSettings, isSupabaseConfigured } from '../lib/supabase';
import { useData } from '../lib/DataContext';
import { BusinessEntity, LegalStructure } from '../types';
import { getTaxFormForStructure } from '../lib/utils'; // Imported shared helper
import Modal from './ui/Modal';

const Settings: React.FC = () => {
    const { user, signIn, signOut } = useAuth();
    const { 
        businessEntities, addLocalEntity, updateLocalEntity, deleteLocalEntity, 
        saveSystemSetting 
    } = useData();
    
    // Config State
    const [timeoutMinutes, setTimeoutMinutes] = useState('15');
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Database Config State
    const [isDbLocked, setIsDbLocked] = useState(true);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [showSchema, setShowSchema] = useState(false);
    const [copied, setCopied] = useState(false);

    // Entity Management State
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<BusinessEntity | null>(null);
    const [entityForm, setEntityForm] = useState<Omit<BusinessEntity, 'id' | 'taxForm'>>({
        name: '',
        structure: 'Sole Proprietorship',
        ein: ''
    });

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
            if (user.role !== 'admin') {
                setDbError("Access Denied: You do not have permission to modify system connections.");
                setIsVerifying(false);
                return;
            }

            const result = await signIn(user.email, unlockPassword);
            if (result.error) {
                setDbError("Incorrect password. Access denied.");
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
        if (!dbUrl.startsWith('http')) {
            alert("Invalid URL. Must start with https://");
            return;
        }
        if (dbKey.length < 20) {
            alert("Invalid Key. It seems too short.");
            return;
        }
        saveConnectionSettings(dbUrl, dbKey);
    };

    const handleDisconnectDatabase = () => {
        if(window.confirm("Are you sure? This will return the app to Demo Mode.")) {
            clearConnectionSettings();
        }
    }

    const handleOpenEntityModal = (entity?: BusinessEntity) => {
        if (entity) {
            setEditingEntity(entity);
            setEntityForm({
                name: entity.name,
                structure: entity.structure,
                ein: entity.ein || ''
            });
        } else {
            setEditingEntity(null);
            setEntityForm({
                name: '',
                structure: 'Sole Proprietorship',
                ein: ''
            });
        }
        setIsEntityModalOpen(true);
    };

    const handleSaveEntity = async (e: React.FormEvent) => {
        e.preventDefault();
        const taxForm = getTaxFormForStructure(entityForm.structure);
        
        const newEntity: BusinessEntity = {
            id: editingEntity ? editingEntity.id : `ent-${Date.now()}`,
            name: entityForm.name,
            structure: entityForm.structure,
            taxForm: taxForm,
            ein: entityForm.ein
        };

        if (editingEntity) {
            await updateLocalEntity(newEntity);
        } else {
            await addLocalEntity(newEntity);
        }
        setIsEntityModalOpen(false);
    };

    const handleDeleteEntity = async (id: string) => {
        if (window.confirm("Delete this business entity? Accounts linked to it may need updating.")) {
            await deleteLocalEntity(id);
        }
    };

    // SAFE MIGRATION SQL: Adds tables/columns only if they are missing.
    // Does NOT delete existing data.
    const dbSchemaSql = `
-- 1. App Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
  key text primary key,
  value text not null
);

-- 2. Business Entities Table
CREATE TABLE IF NOT EXISTS business_entities (
  id text primary key,
  name text not null,
  structure text not null,
  tax_form text not null,
  ein text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Categories Table (ensure table exists)
CREATE TABLE IF NOT EXISTS categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null
);
-- Add missing columns to Categories safely
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_tax_deductible boolean DEFAULT true;

-- 4. Trucks Table
CREATE TABLE IF NOT EXISTS trucks (
  id text primary key default gen_random_uuid()::text,
  unit_number text not null,
  make text,
  model text,
  year numeric
);

-- 5. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null,
  initial_balance numeric default 0
);
-- Add missing Foreign Key to Accounts safely
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS business_entity_id text REFERENCES business_entities(id) ON DELETE SET NULL;

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id text primary key default gen_random_uuid()::text,
  date timestamp with time zone not null,
  description text,
  amount numeric not null,
  type text not null,
  account_id text REFERENCES accounts(id) ON DELETE CASCADE
);
-- Add missing columns/FKs to Transactions safely
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_account_id text REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id text REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS truck_id text REFERENCES trucks(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipts text[] DEFAULT array[]::text[];

-- 7. Enable Security (RLS) - Idempotent
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 8. Access Policies (Drop existing to avoid conflict or use IF NOT EXISTS workaround if supported, 
-- but simpler here to just create generic policies. If they exist, Supabase might return a soft error which is fine).
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access' AND tablename = 'transactions') THEN
    CREATE POLICY "Enable all access" ON transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access' AND tablename = 'accounts') THEN
    CREATE POLICY "Enable all access" ON accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access' AND tablename = 'categories') THEN
    CREATE POLICY "Enable all access" ON categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access' AND tablename = 'trucks') THEN
    CREATE POLICY "Enable all access" ON trucks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access' AND tablename = 'business_entities') THEN
    CREATE POLICY "Enable all access" ON business_entities FOR ALL USING (true) WITH CHECK (true);
  END IF;
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access' AND tablename = 'app_settings') THEN
    CREATE POLICY "Enable all access" ON app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`.trim();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(dbSchemaSql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mb-5" style={{ maxWidth: '800px' }}>
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Settings</h2>
                  <p className="text-muted mb-0">System configuration and business profile.</p>
                </div>
            </div>

            {/* Database Connection Settings (Protected) */}
            <Card className="mb-4 border-primary border-opacity-25">
                <CardHeader className="bg-primary bg-opacity-10 border-bottom-0">
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center">
                            <Database className="me-2 text-primary" size={20} />
                            <CardTitle>Database Connection (Supabase)</CardTitle>
                        </div>
                        {!isDbLocked && (
                             <button 
                                onClick={() => setShowSchema(true)}
                                className="btn btn-sm btn-outline-primary bg-white d-flex align-items-center"
                                type="button"
                             >
                                <Code size={14} className="me-1"/> Update Database (SQL)
                             </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isDbLocked ? (
                        <div className="text-center py-3">
                            <div className="mb-3">
                                <Lock size={32} className="text-muted opacity-25" />
                            </div>
                            <h6 className="fw-bold">Configuration Locked</h6>
                            <p className="text-muted small mb-3">
                                {user?.role === 'admin' 
                                    ? "Enter your Admin password to manage the database connection." 
                                    : "You do not have the required access level to modify this."}
                            </p>
                            
                            <form onSubmit={handleUnlockDbSettings} className="d-inline-block text-start" style={{maxWidth: '300px', width: '100%'}}>
                                <div className="input-group mb-2">
                                    <input 
                                        type="password" 
                                        className="form-control"
                                        placeholder="Enter Password"
                                        value={unlockPassword}
                                        onChange={(e) => setUnlockPassword(e.target.value)}
                                        required
                                        disabled={user?.role !== 'admin'}
                                    />
                                    <button className="btn btn-primary" type="submit" disabled={isVerifying || user?.role !== 'admin'}>
                                        {isVerifying ? <Loader2 size={16} className="animate-spin" /> : 'Unlock'}
                                    </button>
                                </div>
                                {dbError ? (
                                    <small className="text-danger fw-bold d-flex align-items-center">
                                        <ShieldAlert size={14} className="me-1"/> {dbError}
                                    </small>
                                ) : (
                                    user?.role !== 'admin' && (
                                        <small className="text-muted d-block fst-italic">
                                            Current Role: {user?.role.toUpperCase()} (Admin Required)
                                        </small>
                                    )
                                )}
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveDatabase}>
                            <div className="alert alert-info d-flex align-items-center small mb-3">
                                <Unlock size={16} className="me-2 flex-shrink-0" />
                                <div>
                                    <strong>Settings Unlocked.</strong> Enter your project credentials below.
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold small text-muted">Project URL</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light"><Server size={16}/></span>
                                    <input 
                                        type="url" 
                                        className="form-control"
                                        value={dbUrl}
                                        onChange={(e) => setDbUrl(e.target.value)}
                                        placeholder="https://your-project.supabase.co"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted">Anon API Key</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light"><Database size={16}/></span>
                                    <input 
                                        type={showKey ? "text" : "password"}
                                        className="form-control"
                                        value={dbKey}
                                        onChange={(e) => setDbKey(e.target.value)}
                                        placeholder="eyJh..."
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-light border"
                                        onClick={() => setShowKey(!showKey)}
                                    >
                                        {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center border-top pt-3">
                                {isSupabaseConfigured && (
                                    <button type="button" onClick={handleDisconnectDatabase} className="btn btn-outline-danger btn-sm">
                                        Disconnect / Reset
                                    </button>
                                )}
                                <div className="d-flex gap-2 ms-auto">
                                    <button type="button" onClick={() => setIsDbLocked(true)} className="btn btn-light border">Lock</button>
                                    <button type="submit" className="btn btn-primary">
                                        <Save size={16} className="me-2" /> Connect & Reload
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* Business Entities Management */}
            <Card className="mb-4">
                <CardHeader>
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <div className="d-flex align-items-center">
                            <Briefcase className="me-2 text-primary" size={20} />
                            <CardTitle>Business Profiles</CardTitle>
                        </div>
                        <button onClick={() => handleOpenEntityModal()} className="btn btn-sm btn-outline-primary d-flex align-items-center">
                            <PlusCircle size={14} className="me-1" /> Add Entity
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="small text-muted mb-3">
                        Define your company structure(s) here. This determines the tax forms used in reports.
                    </p>
                    <div className="list-group">
                        {businessEntities.length > 0 ? (
                            businessEntities.map(ent => (
                                <div key={ent.id} className="list-group-item d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center">
                                        <div className="rounded-circle p-2 bg-light text-primary me-3">
                                            <Building size={18} />
                                        </div>
                                        <div>
                                            <h6 className="mb-0 fw-bold">{ent.name}</h6>
                                            <small className="text-muted d-block">
                                                {ent.structure} &bull; <span className="text-info">{ent.taxForm}</span>
                                            </small>
                                            {ent.ein && <small className="text-muted d-block">EIN: {ent.ein}</small>}
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button onClick={() => handleOpenEntityModal(ent)} className="btn btn-sm btn-light text-secondary border">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteEntity(ent.id)} className="btn btn-sm btn-light text-danger border">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-3 border rounded bg-light text-muted small">
                                No business profiles defined. Defaulting to Schedule C.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSaveAppConfig}>
                {/* Application Settings */}
                <Card className="mb-4">
                    <CardHeader>
                        <div className="d-flex align-items-center">
                            <Clock className="me-2 text-primary" size={20} />
                            <CardTitle>Application Settings</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Session Timeout (Minutes)</label>
                            <div className="input-group" style={{ maxWidth: '300px' }}>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    value={timeoutMinutes}
                                    onChange={(e) => setTimeoutMinutes(e.target.value)}
                                    min="1"
                                    max="1440" // 24 hours
                                    required
                                />
                                <span className="input-group-text bg-light text-muted">minutes</span>
                            </div>
                            <div className="form-text text-muted">
                                Users will be automatically logged out after this period of inactivity.
                                <br />
                                <span className="text-warning d-flex align-items-center mt-1">
                                    <LogOut size={12} className="me-1" />
                                    <strong>Note:</strong> Saving this setting will sign you out.
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="d-flex align-items-center gap-3">
                    <button type="submit" className="btn btn-primary d-flex align-items-center px-4" disabled={isSaving}>
                        {isSaving ? <Loader2 size={18} className="me-2 animate-spin"/> : <Save size={18} className="me-2" />}
                        Save App Settings
                    </button>
                    {saved && (
                        <span className="text-success d-flex align-items-center small fw-bold">
                            <CheckCircle2 size={18} className="me-1" /> Saved! Signing out...
                        </span>
                    )}
                </div>
            </form>

            {/* Entity Modal */}
            <Modal
                isOpen={isEntityModalOpen}
                onClose={() => setIsEntityModalOpen(false)}
                title={editingEntity ? "Edit Business Profile" : "New Business Profile"}
            >
                <form onSubmit={handleSaveEntity}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Company Name</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={entityForm.name}
                            onChange={e => setEntityForm({...entityForm, name: e.target.value})}
                            required
                            placeholder="e.g. My Trucking LLC"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Legal Structure</label>
                        <select 
                            className="form-select"
                            value={entityForm.structure}
                            onChange={e => setEntityForm({...entityForm, structure: e.target.value as LegalStructure})}
                        >
                            <option value="Sole Proprietorship">Sole Proprietorship</option>
                            <option value="LLC (Single Member)">LLC (Single Member)</option>
                            <option value="LLC (Multi-Member)">LLC (Multi-Member)</option>
                            <option value="S-Corp">S-Corp</option>
                            <option value="C-Corp">C-Corp</option>
                            <option value="Partnership">Partnership</option>
                        </select>
                        <div className="form-text text-info small mt-1">
                            Current Form: <strong>{getTaxFormForStructure(entityForm.structure)}</strong>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">EIN (Optional)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={entityForm.ein}
                            onChange={e => setEntityForm({...entityForm, ein: e.target.value})}
                            placeholder="XX-XXXXXXX"
                        />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" onClick={() => setIsEntityModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Profile</button>
                    </div>
                </form>
            </Modal>

            {/* SQL Schema Helper Modal */}
            <Modal
                isOpen={showSchema}
                onClose={() => setShowSchema(false)}
                title="Update Database Structure (Safe)"
                size="lg"
            >
                <div className="mb-3">
                    <div className="alert alert-info small d-flex align-items-start">
                        <CheckCircle2 size={16} className="me-2 mt-1 flex-shrink-0" />
                        <div>
                            <strong>Safe Migration:</strong> This script uses <code>IF NOT EXISTS</code> logic. 
                            It will add missing tables or columns (like Entity links) 
                            <strong>without deleting your existing transaction data</strong>.
                        </div>
                    </div>
                    <p className="small text-muted">
                        Run the following SQL in your Supabase <strong>SQL Editor</strong>:
                    </p>
                    <div className="position-relative">
                        <pre className="bg-light p-3 rounded border small text-dark mb-0" style={{maxHeight: '300px', overflowY: 'auto'}}>
                            <code>{dbSchemaSql}</code>
                        </pre>
                        <button 
                            className="btn btn-sm btn-light border position-absolute top-0 end-0 m-2 shadow-sm"
                            onClick={copyToClipboard}
                        >
                            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            <span className="ms-1">{copied ? "Copied" : "Copy"}</span>
                        </button>
                    </div>
                </div>
                <div className="d-flex justify-content-end">
                    <button className="btn btn-primary" onClick={() => setShowSchema(false)}>Done</button>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
