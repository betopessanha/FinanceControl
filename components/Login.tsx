import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Truck, Lock, User, Loader2, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn(email, password);
            if (result.error) {
                setError(result.error);
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
            <div className="card border-0 shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <div className="bg-primary bg-gradient text-white rounded p-3 d-inline-flex align-items-center justify-content-center shadow-sm mb-3">
                            <Truck size={32} />
                        </div>
                        <h4 className="fw-bold text-dark">Welcome Back</h4>
                        <p className="text-muted small">Sign in to manage your fleet accounting</p>
                    </div>

                    {error && (
                        <div className="alert alert-danger d-flex align-items-start small mb-3">
                            <AlertCircle size={16} className="me-2 mt-1 flex-shrink-0" />
                            <div>{error}</div>
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
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <small className="text-muted d-block">Demo Access:</small>
                        <small className="text-muted fw-bold font-monospace">admin@trucking.io / admin</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;