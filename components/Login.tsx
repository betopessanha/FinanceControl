
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Truck, Lock, User, Loader2, AlertCircle, Database, WifiOff, Settings, RefreshCw, Eye, EyeOff, ShieldCheck, UserPlus, LogIn, Download, Check } from 'lucide-react';
import { isSupabaseConfigured, clearConnectionSettings, importConfig, SYSTEM_KEYS, saveConnectionSettings } from '../lib/supabase';
import Modal from './ui/Modal';

const Login: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    // Config States
    const [backupString, setBackupString] = useState('');
    const [importSuccess, setImportSuccess] = useState(false);
    const [manualUrl, setManualUrl] = useState('');
    const [manualKey, setManualKey] = useState('');

    useEffect(() => {
        const savedUser = localStorage.getItem('remembered_user');
        if (savedUser) {
            setEmail(savedUser);
            setRememberMe(true);
        }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (isRegistering) {
            setIsLoading(true);
            const result = await signUp(email, password);
            setIsLoading(false);
            if (result.error) {
                setError(result.error);
            } else {
                setSuccessMessage(result.message || "Account created! You can now log in.");
                setIsRegistering(false);
            }
        } else {
            setIsLoading(true);
            const result = await signIn(email, password);
            if (result.error) {
                setError(result.error);
                setIsLoading(false);
            } else {
                if (rememberMe) {
                    localStorage.setItem('remembered_user', email);
                } else {
                    localStorage.removeItem('remembered_user');
                }
            }
        }
    };

    const handleImportConfig = () => {
        if (importConfig(backupString)) {
            setImportSuccess(true);
            setTimeout(() => {
                setIsConfigOpen(false);
                setImportSuccess(false);
                setBackupString('');
            }, 1000);
        } else {
            alert("Invalid backup string.");
        }
    };

    const handleManualSave = () => {
        if (manualUrl && manualKey) {
            saveConnectionSettings(manualUrl, manualKey);
        }
    };

    return (
        <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light px-3">
            <div className="card border-0 shadow-lg overflow-hidden" style={{ maxWidth: '420px', width: '100%', borderRadius: '1rem' }}>
                <div className="bg-primary p-4 text-center position-relative">
                    <div className="bg-white bg-opacity-20 rounded-circle d-inline-flex p-3 mb-2 shadow-sm">
                        <ShieldCheck size={32} className="text-white" />
                    </div>
                    <h4 className="fw-bold text-white mb-0">{isRegistering ? 'Register Account' : 'Secure Access'}</h4>
                    <p className="text-white text-opacity-75 small mb-0">Trucking.io Enterprise Accounting</p>
                    <div className="position-absolute end-0 top-0 mt-2 me-2 opacity-25">
                         <Truck size={60} className="text-white" style={{ transform: 'rotate(-15deg)' }} />
                    </div>
                </div>

                <div className="card-body p-4 p-md-5">
                    <div className={`alert ${isSupabaseConfigured ? 'alert-success' : 'alert-warning'} py-2 mb-4 bg-opacity-10 text-center border-0 small fw-bold d-flex align-items-center justify-content-center gap-2`}>
                        {isSupabaseConfigured ? <Database size={14}/> : <WifiOff size={14}/>}
                        {isSupabaseConfigured ? 'CLOUD ENGINE SAVED' : 'LOCAL ENGINE ONLY'}
                    </div>

                    {error && (
                        <div className="alert alert-danger small py-2 mb-3 border-0 d-flex align-items-center animate-shake">
                            <AlertCircle size={16} className="me-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success small py-2 mb-3 border-0 d-flex align-items-center">
                            <ShieldCheck size={16} className="me-2 flex-shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleAuth}>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted text-uppercase ls-1">User / Email</label>
                            <div className="input-group border rounded-3 bg-white transition-all focus-within-primary shadow-sm">
                                <span className="input-group-text bg-transparent border-0"><User size={18} className="text-muted"/></span>
                                <input 
                                    className="form-control border-0 shadow-none ps-0" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    placeholder="your-user-name"
                                    required 
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted text-uppercase ls-1">Password</label>
                            <div className="input-group border rounded-3 bg-white transition-all focus-within-primary shadow-sm">
                                <span className="input-group-text bg-transparent border-0"><Lock size={18} className="text-muted"/></span>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-control border-0 shadow-none ps-0" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    placeholder="••••••••"
                                    required 
                                    autoComplete={isRegistering ? "new-password" : "current-password"}
                                />
                                <button 
                                    type="button" 
                                    className="btn border-0 text-muted px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isRegistering && (
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="form-check">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input" 
                                        id="rememberMe" 
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                    />
                                    <label className="form-check-label small text-muted cursor-pointer" htmlFor="rememberMe">Remember me</label>
                                </div>
                                <button type="button" onClick={() => setIsConfigOpen(true)} className="btn btn-link p-0 small text-decoration-none fw-bold">Cloud Setup</button>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 rounded-3 mt-3" 
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />)}
                            {isLoading ? 'Processing...' : (isRegistering ? 'Create Local Admin' : 'Sign In')}
                        </button>
                        
                        <div className="text-center mt-4">
                            <button 
                                type="button" 
                                className="btn btn-link btn-sm text-decoration-none text-muted"
                                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                            >
                                {isRegistering ? 'Already have an account? Sign In' : 'No account? Register locally'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="System Infrastructure Configuration">
                <div className="p-1">
                    <label className="form-label fw-bold small text-muted text-uppercase mb-3">Option A: Import Connection String</label>
                    <div className="input-group mb-4 shadow-sm">
                        <input 
                            type="text" 
                            className="form-control bg-light border-0" 
                            placeholder="Paste your backup config string..." 
                            value={backupString}
                            onChange={e => setBackupString(e.target.value)}
                        />
                        <button className="btn btn-primary px-3" onClick={handleImportConfig} disabled={!backupString || importSuccess}>
                            {importSuccess ? <Check size={18}/> : <Download size={18}/>}
                        </button>
                    </div>

                    <hr className="my-4 opacity-10" />

                    <label className="form-label fw-bold small text-muted text-uppercase mb-3">Option B: Manual Supabase Setup</label>
                    <div className="mb-3">
                        <input type="text" className="form-control mb-2" placeholder="Project URL (https://...)" value={manualUrl} onChange={e => setManualUrl(e.target.value)} />
                        <input type="password"  className="form-control" placeholder="Anon Key (eyJ...)" value={manualKey} onChange={e => setManualKey(e.target.value)} />
                    </div>
                    
                    <div className="d-flex gap-2 mt-4">
                        <button className="btn btn-primary flex-grow-1 py-2 fw-bold" onClick={handleManualSave}>Save Configuration</button>
                        {isSupabaseConfigured && (
                            <button className="btn btn-outline-danger px-3" onClick={() => clearConnectionSettings()} title="Clear Cloud Config">
                                <RefreshCw size={18} />
                            </button>
                        )}
                    </div>
                    <p className="text-muted small mt-3 mb-0 text-center">Configuring the cloud bridge allows real-time multi-device sync.</p>
                </div>
            </Modal>
        </div>
    );
};

export default Login;
