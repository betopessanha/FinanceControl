
import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { User, Mail, Shield, ShieldCheck, Key, LogOut, Clock, Globe, Database, Smartphone, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Card, { CardContent } from './ui/Card';
import Modal from './ui/Modal';
import { formatCurrency } from '../lib/utils';

const Profile: React.FC = () => {
    const { user, signOut } = useAuth();
    const { isCloudConnected, transactions } = useData();

    // Modal States
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    // Form States
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Mock joined date (would come from DB in production)
    const joinedDate = "Oct 12, 2023";
    const lastActivity = new Date().toLocaleDateString();

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPass !== confirmPass) {
            setError("Passwords do not match.");
            return;
        }

        if (newPass.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setIsSaving(true);
        
        // Simulating API Call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setIsSaving(false);
        setShowSuccess(true);
        
        setTimeout(() => {
            setShowSuccess(false);
            setIsResetModalOpen(false);
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
        }, 2000);
    };

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="row g-4">
                {/* Left Column - Hero & Main Info */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm overflow-hidden mb-4">
                        <div className="bg-black py-5 px-4 position-relative">
                            <div className="position-absolute opacity-10 end-0 bottom-0 p-3">
                                <User size={120} className="text-white" />
                            </div>
                            <div className="d-flex align-items-center gap-4 position-relative z-1">
                                <div className="bg-white p-1 rounded-circle shadow-lg">
                                    <div className="bg-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: 100, height: 100 }}>
                                        <User size={50} className="text-black" />
                                    </div>
                                </div>
                                <div className="text-white">
                                    <h1 className="fw-800 tracking-tight mb-1">{user?.email?.split('@')[0].toUpperCase()}</h1>
                                    <div className="d-flex gap-2">
                                        <span className="badge rounded-pill bg-white bg-opacity-20 px-3 py-2 fw-bold" style={{ fontSize: '0.7rem' }}>
                                            <Shield size={12} className="me-1" /> ACCOUNT OWNER
                                        </span>
                                        <span className="badge rounded-pill bg-success bg-opacity-20 text-success px-3 py-2 fw-bold" style={{ fontSize: '0.7rem' }}>
                                            <ShieldCheck size={12} className="me-1" /> VERIFIED
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-4 bg-white">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <p className="text-muted fw-700 text-uppercase mb-3" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Personal Information</p>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 bg-subtle rounded-3"><Mail size={16} className="text-muted" /></div>
                                            <div>
                                                <small className="text-muted d-block">Email Address</small>
                                                <span className="fw-700 text-black">{user?.email}</span>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 bg-subtle rounded-3"><Smartphone size={16} className="text-muted" /></div>
                                            <div>
                                                <small className="text-muted d-block">Phone Verification</small>
                                                <span className="fw-700 text-black">+1 (555) 012-3456</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6 border-start-md">
                                    <p className="text-muted fw-700 text-uppercase mb-3" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Access History</p>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 bg-subtle rounded-3"><Clock size={16} className="text-muted" /></div>
                                            <div>
                                                <small className="text-muted d-block">Member Since</small>
                                                <span className="fw-700 text-black">{joinedDate}</span>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 bg-subtle rounded-3"><Globe size={16} className="text-muted" /></div>
                                            <div>
                                                <small className="text-muted d-block">Default Language</small>
                                                <span className="fw-700 text-black">English (United States)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-6">
                            <Card className="h-100 p-4">
                                <h5 className="fw-800 text-black mb-4">Security Center</h5>
                                <div className="d-flex flex-column gap-3">
                                    <button 
                                        onClick={() => setIsResetModalOpen(true)}
                                        className="btn btn-white border w-100 text-start p-3 rounded-4 d-flex align-items-center gap-3 hover-bg-subtle transition-all"
                                    >
                                        <div className="bg-subtle p-2 rounded-3 text-black"><Key size={18} /></div>
                                        <div className="flex-grow-1">
                                            <p className="fw-700 mb-0 small">Reset Password</p>
                                            <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>Update your security credentials</p>
                                        </div>
                                    </button>
                                    <button className="btn btn-white border w-100 text-start p-3 rounded-4 d-flex align-items-center gap-3">
                                        <div className="bg-subtle p-2 rounded-3 text-black"><Shield size={18} /></div>
                                        <div className="flex-grow-1">
                                            <p className="fw-700 mb-0 small">2FA Authentication</p>
                                            <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>Enable multi-factor security</p>
                                        </div>
                                    </button>
                                </div>
                            </Card>
                        </div>
                        <div className="col-md-6">
                            <Card className="h-100 p-4 bg-subtle border-0">
                                <h5 className="fw-800 text-black mb-4">System Context</h5>
                                <div className="d-flex flex-column gap-4">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-600 small">Database Instance</span>
                                        <span className={`badge ${isCloudConnected ? 'bg-success' : 'bg-warning'} px-3 py-2 fw-800`} style={{ fontSize: '0.65rem' }}>
                                            {isCloudConnected ? 'SUPABASE CLOUD' : 'LOCAL ENGINE'}
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-600 small">Total Managed Data</span>
                                        <span className="fw-800 text-black">{transactions.length} Transactions</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="text-muted fw-600 small">Last Sync</span>
                                        <span className="fw-800 text-black">{lastActivity}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="col-12 col-lg-4">
                    <Card className="p-4 mb-4">
                        <h5 className="fw-800 text-black mb-4">Account Health</h5>
                        <div className="text-center py-4">
                            <div className="position-relative d-inline-block">
                                <svg width="120" height="120" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                                    <circle cx="60" cy="60" r="54" fill="none" stroke="#000" strokeWidth="12" strokeDasharray="339.29" strokeDashoffset="33.9" strokeLinecap="round" transform="rotate(-90 60 60)" />
                                </svg>
                                <div className="position-absolute top-50 start-50 translate-middle">
                                    <span className="fw-800 text-black fs-4">90%</span>
                                </div>
                            </div>
                            <p className="fw-700 text-black mt-3 mb-1">Profile Security Strength</p>
                            <p className="text-muted small">Complete 2FA to reach 100%</p>
                        </div>
                        <hr className="my-4 opacity-5" />
                        <button onClick={() => signOut()} className="btn btn-outline-danger w-100 py-3 rounded-4 fw-800 d-flex align-items-center justify-content-center gap-2">
                            <LogOut size={18} /> SIGN OUT FROM ALL DEVICES
                        </button>
                    </Card>

                    <Card className="p-4 bg-black text-white">
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="p-2 bg-white bg-opacity-20 rounded-3"><Database size={20} /></div>
                            <h5 className="fw-800 mb-0">Subscription</h5>
                        </div>
                        <p className="text-white text-opacity-75 small mb-4">You are currently on the <strong className="text-white">Enterprise Fleet Plan</strong>. Unlimited trucks and cloud sync active.</p>
                        <div className="bg-white bg-opacity-10 p-3 rounded-4 border border-white border-opacity-10 mb-4">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="small text-white text-opacity-50">Next billing</span>
                                <span className="small fw-700">Nov 15, 2024</span>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span className="small text-white text-opacity-50">Monthly amount</span>
                                <span className="small fw-700">$149.00</span>
                            </div>
                        </div>
                        <button className="btn btn-white w-100 fw-800 py-3 rounded-4">UPGRADE PLAN</button>
                    </Card>
                </div>
            </div>

            {/* Reset Password Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => !isSaving && setIsResetModalOpen(false)}
                title="Update Credentials"
                size="sm"
            >
                <div className="p-1">
                    {showSuccess ? (
                        <div className="text-center py-4 animate-slide-up">
                            <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex p-3 mb-3">
                                <CheckCircle2 size={40} />
                            </div>
                            <h5 className="fw-800 text-black">Security Updated</h5>
                            <p className="text-muted small">Your password has been changed successfully. You will be prompted to log in again on other devices.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleResetSubmit}>
                            <p className="text-muted small mb-4">Ensure your new password contains at least 8 characters with a mix of letters and numbers.</p>
                            
                            {error && (
                                <div className="alert alert-danger py-2 px-3 border-0 small d-flex align-items-center gap-2 mb-4">
                                    <AlertTriangle size={14} />
                                    {error}
                                </div>
                            )}

                            <div className="mb-3">
                                <label className="form-label fw-800 small text-muted text-uppercase" style={{fontSize: '0.6rem'}}>Current Password</label>
                                <div className="input-group border rounded-3 bg-light bg-opacity-50 focus-within-black transition-all">
                                    <input 
                                        type={showPasswords ? "text" : "password"} 
                                        className="form-control border-0 bg-transparent shadow-none" 
                                        placeholder="••••••••"
                                        value={currentPass}
                                        onChange={e => setCurrentPass(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-800 small text-muted text-uppercase" style={{fontSize: '0.6rem'}}>New Password</label>
                                <div className="input-group border rounded-3 bg-light bg-opacity-50 focus-within-black transition-all">
                                    <input 
                                        type={showPasswords ? "text" : "password"} 
                                        className="form-control border-0 bg-transparent shadow-none" 
                                        placeholder="Min. 8 characters"
                                        value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-link text-muted border-0"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                    >
                                        {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-800 small text-muted text-uppercase" style={{fontSize: '0.6rem'}}>Confirm New Password</label>
                                <div className="input-group border rounded-3 bg-light bg-opacity-50 focus-within-black transition-all">
                                    <input 
                                        type={showPasswords ? "text" : "password"} 
                                        className="form-control border-0 bg-transparent shadow-none" 
                                        placeholder="Re-enter password"
                                        value={confirmPass}
                                        onChange={e => setConfirmPass(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn btn-black w-100 py-3 rounded-3 fw-800 shadow-sm d-flex align-items-center justify-content-center gap-2"
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                {isSaving ? "Updating Security..." : "Confirm Update"}
                            </button>
                        </form>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Profile;
