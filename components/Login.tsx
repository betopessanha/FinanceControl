
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Truck, Lock, User, Loader2, AlertCircle, Database, WifiOff, Settings, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, clearConnectionSettings } from '../lib/supabase';
import Modal from './ui/Modal';

const Login: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('admin');
    const [password, setPassword] = useState('admin');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError(null);

        const result = await signIn(email, password);
        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        }
        // If successful, AuthContext will update and App.tsx will show the dashboard
    };

    return (
        <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
            <div className="card border-0 shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-body p-4 p-md-5">
                    <div className="text-center mb-4">
                        <div className="bg-primary bg-gradient text-white rounded p-3 d-inline-flex mb-3 shadow-sm">
                            <Truck size={32} />
                        </div>
                        <h4 className="fw-bold">Trucking.io</h4>
                        <p className="text-muted small">USA Accounting System</p>
                    </div>

                    <div className={`alert ${isSupabaseConfigured ? 'alert-success' : 'alert-warning'} py-2 mb-4 bg-opacity-10 text-center border-0`}>
                        <div className="d-flex align-items-center justify-content-center small fw-bold">
                            {isSupabaseConfigured ? (
                                <><Database size={14} className="me-2 text-success" /> CLOUD ACTIVE</>
                            ) : (
                                <><WifiOff size={14} className="me-2 text-warning" /> OFFLINE / DEMO</>
                            )}
                        </div>
                        {isSupabaseConfigured && (
                            <button onClick={() => clearConnectionSettings()} className="btn btn-link text-danger p-0 mt-1 d-block w-100" style={{fontSize: '0.7rem'}}>
                                <RefreshCw size={10} className="me-1" /> Reset Connection
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger small py-2 mb-3 border-0 d-flex align-items-center">
                            <AlertCircle size={16} className="me-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted text-uppercase">User</label>
                            <div className="input-group border rounded bg-white">
                                <span className="input-group-text bg-transparent border-0"><User size={18} className="text-muted"/></span>
                                <input className="form-control border-0" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted text-uppercase">Password</label>
                            <div className="input-group border rounded bg-white">
                                <span className="input-group-text bg-transparent border-0"><Lock size={18} className="text-muted"/></span>
                                <input type="password" className="form-control border-0" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center" disabled={isLoading}>
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Enter System'}
                        </button>
                    </form>

                    <div className="mt-4 pt-3 border-top text-center">
                        <p className="small text-muted mb-0">Demo Access Credentials:</p>
                        <p className="small fw-bold mb-0 text-primary">admin / admin</p>
                    </div>
                </div>
            </div>

            <div className="position-absolute bottom-0 p-3">
                 <button onClick={() => setIsConfigOpen(true)} className="btn btn-link text-muted text-decoration-none small d-flex align-items-center">
                    <Settings size={14} className="me-1" /> Database Settings
                </button>
            </div>

            <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Connection Settings">
                <p className="small text-muted">Use this to connect to your Supabase instance.</p>
                <div className="alert alert-info small py-2">
                    If the system breaks after saving, just click "Reset Connection" on the login screen.
                </div>
                <button className="btn btn-primary w-100 mt-2" onClick={() => window.location.reload()}>Close & Refresh</button>
            </Modal>
        </div>
    );
};

export default Login;
