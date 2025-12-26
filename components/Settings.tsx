
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Database, Lock, Loader2, Code, Copy, Check, AlertTriangle, UserCircle, LogOut, RefreshCw, Trash2, Activity, ShieldCheck, Settings as SettingsIcon, CloudUpload, Key, Share2, Download } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { saveConnectionSettings, clearConnectionSettings, isSupabaseConfigured, SYSTEM_KEYS, getExportableConfig } from '../lib/supabase';
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
    const [configCopied, setConfigCopied] = useState(false);

    useEffect(() => {
        setDbUrl(localStorage.getItem(SYSTEM_KEYS.DB_URL) || '');
        setDbKey(localStorage.getItem(SYSTEM_KEYS.DB_KEY) || '');
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
        if (!confirm("This will upload all local data (Trucks, Accounts, Transactions) to the cloud. Existing cloud data will be merged. Proceed?")) return;
        setIsSyncing(true);
        setSyncResult(null);
        const res = await pushLocalDataToCloud();
        setSyncResult(res);
        setIsSyncing(false);
    };

    /**
     * Limpeza inteligente de dados: preserva chaves de conexão e sessão.
     */
    const handleClearLocalDataOnly = () => {
        if (confirm("Reset financial records? Cloud connection settings and active session WILL BE PRESERVED.")) {
            // Chaves a serem apagadas
            const keysToRemove = [
                'app_data_entities',
                'app_data_accounts',
                'app_data_transactions',
                'app_data_trucks',
                'app_data_categories',
                'app_data_fiscal',
                'app_data_loads'
            ];

            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Recarrega para limpar o estado da memória sem deslogar
            window.location.reload();
        }
    };

    const copyBackupConfig = () => {
        const config = getExportableConfig();
        if (config) {
            navigator.clipboard.writeText(config);
            setConfigCopied(true);
            setTimeout(() => setConfigCopied(false), 2000);
        }
    };

    return (
        <div className="container py-4 animate-slide-up">
            <div className="d-flex align-items-center gap-3 mb-4">
                <SettingsIcon className="text-primary" size={32} />
                <div>
                    <h2 className="fw-bold mb-0">Infrastructure Settings</h2>
                    <p className="text-muted mb-0">Cloud management and data persistence.</p>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-7">
                    <Card className="mb-4 border-0 shadow-sm overflow-hidden">
                        <CardHeader className="bg-dark text-white py-3">
                            <div className="d-flex align-items-center justify-content-between w-100">
                                <div className="d-flex align-items-center gap-2">
                                    <Activity size={20} className="text-success" />
                                    <CardTitle className="text-white">System Integrity</CardTitle>
                                </div>
                                <button onClick={handlePushToCloud} disabled={isSyncing || !isCloudConnected} className="btn btn-sm btn-primary d-flex align-items-center gap-2 px-3 shadow">
                                    {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <CloudUpload size={14}/>}
                                    Manual Cloud Sync
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
                                        <small className="text-muted d-block fw-bold text-uppercase" style={{fontSize: '0.6rem'}}>Cached Records</small>
                                        <div className="d-flex align-items-baseline gap-2 mt-2">
                                            <h2 className="fw-900 mb-0">{transactions.length + trucks.length + accounts.length}</h2>
                                            <span className="text-success small fw-bold"><ShieldCheck size={14}/> Stable</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="p-3 bg-white rounded-3 border shadow-sm h-100">
                                        <small className="text-muted d-block fw-bold text-uppercase" style={{fontSize: '0.6rem'}}>Database Status</small>
                                        <div className="d-flex align-items-baseline gap-2 mt-2">
                                            <h2 className={`fw-900 mb-0 ${isCloudConnected ? 'text-primary' : 'text-warning'}`}>{isCloudConnected ? 'ONLINE' : 'OFFLINE'}</h2>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 d-flex gap-2">
                                <button onClick={handleClearLocalDataOnly} className="btn btn-sm btn-white border shadow-sm d-flex align-items-center gap-2 px-3">
                                    <Trash2 size={14} className="text-danger"/> Reset Records (Keep Config)
                                </button>
                                {isCloudConnected && (
                                    <button onClick={copyBackupConfig} className="btn btn-sm btn-white border shadow-sm d-flex align-items-center gap-2 px-3">
                                        {configCopied ? <Check size={14} className="text-success"/> : <Download size={14} className="text-primary"/>}
                                        {configCopied ? 'String Copied!' : 'Export Connection Backup'}
                                    </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0">
                        <CardHeader className="py-3 border-bottom">
                            <div className="d-flex align-items-center justify-content-between w-100">
                                <div className="d-flex align-items-center">
                                    <Database className="text-primary me-2" size={20}/>
                                    <CardTitle>Cloud Connection Bridge</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            {isDbLocked ? (
                                <div className="text-center py-4">
                                    <div className="bg-light rounded-circle p-3 d-inline-block mb-3"><Lock className="text-muted" size={32}/></div>
                                    <h6 className="fw-bold">Interface Locked</h6>
                                    <p className="text-muted small mb-4">Verify password to modify cloud credentials.</p>
                                    <form onSubmit={handleUnlockDbSettings} className="mt-3 mx-auto" style={{maxWidth: '300px'}}>
                                        <div className="input-group mb-2 shadow-sm rounded-3 overflow-hidden">
                                            <input type="password" className="form-control border-0 bg-light" placeholder="Account Password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} required />
                                            <button className="btn btn-primary px-4 border-0" type="submit" disabled={isVerifying}>{isVerifying ? <Loader2 className="animate-spin" size={16}/> : 'Unlock'}</button>
                                        </div>
                                        {dbError && <div className="text-danger small mt-2 fw-bold">{dbError}</div>}
                                    </form>
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); saveConnectionSettings(dbUrl, dbKey); }}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted d-flex align-items-center gap-2">
                                            <Share2 size={14}/> SUPABASE PROJECT URL
                                        </label>
                                        <input type="text" className="form-control bg-light font-monospace small" value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="https://abc.supabase.co" />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label small fw-bold text-muted d-flex align-items-center gap-2">
                                            <Key size={14}/> ANON API KEY (PERSISTENT)
                                        </label>
                                        <input type="password"  className="form-control bg-light font-monospace small" value={dbKey} onChange={e => setDbKey(e.target.value)} placeholder="eyJhbGci..." />
                                    </div>
                                    <div className="d-flex justify-content-between pt-3 border-top">
                                        <button type="button" onClick={clearConnectionSettings} className="btn btn-outline-danger btn-sm px-3">Remove Cloud Access</button>
                                        <div className="d-flex gap-2">
                                            <button type="button" onClick={() => setIsDbLocked(true)} className="btn btn-light btn-sm px-3 border shadow-sm">Lock Interface</button>
                                            <button type="submit" className="btn btn-primary btn-sm px-4 shadow-sm fw-bold">Update & Re-Connect</button>
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
                            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3 border shadow-sm"><UserCircle size={64} className="text-primary"/></div>
                            <h4 className="fw-bold mb-1">{user?.email || 'Guest User'}</h4>
                            <div className={`badge ${isCloudConnected ? 'bg-success' : 'bg-warning'} rounded-pill px-3 py-2 mt-2 mb-4 shadow-sm`}>
                                {isCloudConnected ? 'AUTHENTICATED CLOUD' : 'LOCAL PERSISTENCE'}
                            </div>
                            
                            <div className="d-grid gap-2 mt-2">
                                <button onClick={refreshData} className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 shadow-sm transition-all">
                                    <RefreshCw size={18} /> Refresh Cloud Cache
                                </button>
                                <button onClick={() => signOut()} className="btn btn-link text-danger small mt-2">
                                    <LogOut size={14} className="me-1" /> Sign Out from App
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Settings;
