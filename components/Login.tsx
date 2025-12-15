
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Truck, Lock, User, Loader2, AlertCircle, Database, WifiOff, Terminal, CheckCircle2, Settings, Save, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, saveConnectionSettings, clearConnectionSettings } from '../lib/supabase';
import Modal from './ui/Modal';

const Login: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    
    // Auto-fill defaults if in Demo Mode (Localhost + No DB)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLocalhost, setIsLocalhost] = useState(false);

    // Configuration Modal State
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configUrl, setConfigUrl] = useState('');
    const [configKey, setConfigKey] = useState('');

    useEffect(() => {
        const local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        setIsLocalhost(local);

        // AUTO-FILL FOR DEMO MODE
        if (!isSupabaseConfigured) {
            setEmail('admin@trucking.io');
            setPassword('admin');
        } else {
            // If connected, check if it's manual local storage to pre-fill config modal
            const localUrl = localStorage.getItem('custom_supabase_url');
            const localKey = localStorage.getItem('custom_supabase_key');
            if (localUrl) setConfigUrl(localUrl);
            if (localKey) setConfigKey(localKey);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isLoginView) {
                const result = await signIn(email, password);
                if (result.error) {
                    setError(result.error);
                }
            } else {
                const result = await signUp(email, password);
                if (result.error) {
                    setError(result.error);
                } else if (result.message) {
                    setSuccessMessage(result.message);
                    if (!result.message.includes("confirm")) {
                        setIsLoginView(true);
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const fillDemoCredentials = () => {
        setEmail('admin@trucking.io');
        setPassword('admin');
        setIsLoginView(true);
    };

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        if (configUrl && configKey) {
            saveConnectionSettings(configUrl, configKey);
        }
    };

    const handleClearConfig = () => {
        if(window.confirm("Disconnect from this database? You will return to Demo Mode.")) {
            clearConnectionSettings();
        }
    };

    return (
        <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light position-relative">
            
            {/* Config Button (Top Right) */}
            <div className="position-absolute top-0 end-0 p-3">
                <button 
                    onClick={() => setIsConfigOpen(true)}
                    className="btn btn-light shadow-sm border rounded-circle p-2 text-secondary hover-text-primary"
                    title="Database Connection Settings"
                >
                    <Settings size={20} />
                </button>
            </div>

            <div className="card border-0 shadow-lg" style={{ maxWidth: '450px', width: '100%' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div className="bg-primary bg-gradient text-white rounded p-3 d-inline-flex align-items-center justify-content-center shadow-sm mb-3">
                            <Truck size={32} />
                        </div>
                        <h4 className="fw-bold text-dark">{isLoginView ? 'Welcome Back' : 'Create Account'}</h4>
                        <p className="text-muted small">
                            {isLoginView ? 'Sign in to manage your fleet accounting' : 'Register to start tracking your expenses'}
                        </p>
                    </div>

                    {/* Connection Status Indicator */}
                    <div 
                        className={`alert ${isSupabaseConfigured ? 'alert-success border-success' : 'alert-warning border-warning'} d-flex align-items-center justify-content-center py-2 mb-4 bg-opacity-10 cursor-pointer`}
                        onClick={() => setIsConfigOpen(true)}
                        title="Click to configure database"
                        style={{ cursor: 'pointer' }}
                    >
                        {isSupabaseConfigured ? (
                            <>
                                <Database size={14} className="me-2" />
                                <small className="fw-bold">Database: Connected</small>
                            </>
                        ) : (
                            <>
                                <WifiOff size={14} className="me-2" />
                                <small className="fw-bold">Mode: Demo (Mock Data)</small>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger d-flex align-items-start small mb-3">
                            <AlertCircle size={16} className="me-2 mt-1 flex-shrink-0" />
                            <div>{error}</div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success d-flex align-items-start small mb-3">
                            <CheckCircle2 size={16} className="me-2 mt-1 flex-shrink-0" />
                            <div>{successMessage}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Email Address</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0 text-muted">
                                    <User size={18} />
                                </span>
                                <input 
                                    type="email" 
                                    className="form-control border-start-0 ps-0 bg-light" 
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted">Password</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0 text-muted">
                                    <Lock size={18} />
                                </span>
                                <input 
                                    type="password" 
                                    className="form-control border-start-0 ps-0 bg-light" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={5}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                isLoginView ? 'Sign In' : 'Sign Up'
                            )}
                        </button>
                    </form>

                    {/* Toggle Login/Signup - Only show if Supabase is configured */}
                    {isSupabaseConfigured && (
                        <div className="text-center mt-3">
                            <button 
                                className="btn btn-link text-decoration-none btn-sm"
                                onClick={() => {
                                    setIsLoginView(!isLoginView);
                                    setError(null);
                                    setSuccessMessage(null);
                                }}
                            >
                                {isLoginView ? (
                                    <>Don't have an account? <span className="fw-bold">Sign Up</span></>
                                ) : (
                                    <>Already have an account? <span className="fw-bold">Sign In</span></>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Developer Help Section - Simplified */}
                    {!isSupabaseConfigured && (
                        <div className="mt-4 pt-3 border-top">
                             {!isLocalhost && (
                                 <button 
                                    type="button" 
                                    onClick={fillDemoCredentials}
                                    className="btn btn-sm btn-outline-dark w-100 mb-2"
                                >
                                    Use Demo Account
                                </button>
                             )}
                             <div className="text-center">
                                <small className="text-muted d-block">Demo Access:</small>
                                <small className="text-muted fw-bold font-monospace">admin@trucking.io / admin</small>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DB Configuration Modal */}
            <Modal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                title="Database Connection"
            >
                <form onSubmit={handleSaveConfig}>
                    <p className="text-muted small mb-3">
                        Since you cannot edit the <code>.env</code> file directly in this environment, 
                        enter your Supabase credentials here. They will be saved to your browser's local storage.
                    </p>
                    
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Supabase URL</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="https://xyz.supabase.co"
                            value={configUrl}
                            onChange={(e) => setConfigUrl(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Anon Key</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                            value={configKey}
                            onChange={(e) => setConfigKey(e.target.value)}
                            required
                        />
                    </div>

                    <div className="d-flex justify-content-between pt-2 border-top mt-4">
                        {localStorage.getItem('custom_supabase_url') ? (
                             <button type="button" onClick={handleClearConfig} className="btn btn-outline-danger d-flex align-items-center">
                                <Trash2 size={16} className="me-2" /> Disconnect
                            </button>
                        ) : (
                            <div></div>
                        )}
                       
                        <button type="submit" className="btn btn-primary d-flex align-items-center">
                            <Save size={16} className="me-2" /> Save & Reload
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Login;
