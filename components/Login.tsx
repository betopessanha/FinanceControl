import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Truck, Lock, User, Loader2, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
    const { signIn, signUp } = useAuth();
    const [isLoginMode, setIsLoginMode] = useState(true);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const toggleMode = () => {
        setIsLoginMode(!isLoginMode);
        setError(null);
        setSuccessMessage(null);
        setEmail('');
        setPassword('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isLoginMode) {
                // SIGN IN FLOW
                const result = await signIn(email, password);
                if (result.error) {
                    setError(result.error);
                }
            } else {
                // SIGN UP FLOW
                if (password.length < 6) {
                    setError("Password must be at least 6 characters long.");
                    setIsLoading(false);
                    return;
                }

                const result = await signUp(email, password);
                if (result.error) {
                    setError(result.error);
                } else if (result.message) {
                    setSuccessMessage(result.message);
                    // Optionally switch to login mode automatically after a delay
                    if (!result.message.includes("check your email")) {
                        setTimeout(() => setIsLoginMode(true), 2000);
                    }
                }
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
                        <h4 className="fw-bold text-dark">
                            {isLoginMode ? "Welcome Back" : "Create Account"}
                        </h4>
                        <p className="text-muted small">
                            {isLoginMode 
                                ? "Sign in to manage your fleet accounting" 
                                : "Join Trucking.io to start tracking expenses"}
                        </p>
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="alert alert-danger d-flex align-items-start small mb-3 animate-fade-in">
                            <AlertCircle size={16} className="me-2 mt-1 flex-shrink-0" />
                            <div>{error}</div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success d-flex align-items-start small mb-3 animate-fade-in">
                            <CheckCircle size={16} className="me-2 mt-1 flex-shrink-0" />
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
                            <label className="form-label fw-bold small text-muted">
                                {isLoginMode ? "Password" : "Create Password"}
                            </label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0 text-muted">
                                    <Lock size={18} />
                                </span>
                                <input 
                                    type="password" 
                                    className="form-control border-start-0 ps-0 bg-light" 
                                    placeholder={isLoginMode ? "••••••••" : "Min 6 characters"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={isLoginMode ? undefined : 6}
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
                                isLoginMode ? (
                                    <>Sign In <ArrowRight size={18} className="ms-2" /></>
                                ) : (
                                    "Create Account"
                                )
                            )}
                        </button>
                    </form>

                    <div className="mt-4 text-center pt-3 border-top">
                        <p className="text-muted small mb-0">
                            {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                        </p>
                        <button 
                            onClick={toggleMode} 
                            className="btn btn-link fw-bold text-decoration-none p-0 mt-1"
                        >
                            {isLoginMode ? "Sign up for free" : "Log in here"}
                        </button>
                    </div>

                    {isLoginMode && (
                        <div className="mt-4 text-center bg-light p-2 rounded">
                            <small className="text-muted d-block text-uppercase" style={{fontSize: '0.65rem'}}>Or use Demo Access:</small>
                            <small className="text-dark fw-bold font-monospace">admin@trucking.io / admin</small>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;