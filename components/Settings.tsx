
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Clock, Save, CheckCircle2, LogOut, Briefcase, PlusCircle, Trash2, Edit2, Building, Database, Lock, Unlock, Server, AlertTriangle, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase, saveConnectionSettings, clearConnectionSettings, isSupabaseConfigured } from '../lib/supabase';
import { useData } from '../lib/DataContext';
import { BusinessEntity, LegalStructure } from '../types';
import Modal from './ui/Modal';

const Settings: React.FC = () => {
    const { user, signIn, signOut } = useAuth();
    const { businessEntities, addLocalEntity, updateLocalEntity, deleteLocalEntity } = useData();
    
    // Config State
    const [timeoutMinutes, setTimeoutMinutes] = useState('15');
    const [saved, setSaved] = useState(false);

    // Database Config State
    const [isDbLocked, setIsDbLocked] = useState(true);
    const [unlockPassword, setUnlockPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);

    // Entity Management State
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<BusinessEntity | null>(null);
    const [entityForm, setEntityForm] = useState<Omit<BusinessEntity, 'id' | 'taxForm'>>({
        name: '',
        structure: 'Sole Proprietorship',
        ein: ''
    });

    useEffect(() => {
        // Load current settings from Local Storage
        const storedTimeout = localStorage.getItem('custom_session_timeout');
        if (storedTimeout) setTimeoutMinutes(storedTimeout);

        // Load existing DB config if exists (for display purposes if unlocked, though we usually keep empty until unlock)
        const storedUrl = localStorage.getItem('custom_supabase_url');
        const storedKey = localStorage.getItem('custom_supabase_key');
        if (storedUrl) setDbUrl(storedUrl);
        if (storedKey) setDbKey(storedKey);
    }, []);

    const handleSaveAppConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (timeoutMinutes) {
            localStorage.setItem('custom_session_timeout', timeoutMinutes);
        }
        setSaved(true);
        setTimeout(async () => {
            localStorage.removeItem('active_mock_user');
            await signOut();
            window.location.reload();
        }, 500);
    };

    const handleUnlockDbSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setDbError(null);

        // Security Check: Verify current user password AND Role
        if (user && user.email) {
            
            // 1. Verify Role (Access Level)
            if (user.role !== 'admin') {
                setDbError("Access Denied: You do not have permission to modify system connections.");
                setIsVerifying(false);
                return;
            }

            // 2. Verify Password (Identity)
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
            // Should not happen if logged in
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

    // --- Entity Helpers ---
    const getTaxFormForStructure = (structure: LegalStructure): string => {
        switch (structure) {
            case 'Sole Proprietorship': return 'Schedule C (Form 1040)';
            case 'LLC (Single Member)': return 'Schedule C (Form 1040)';
            case 'LLC (Multi-Member)': return 'Form 1065 (Partnership)';
            case 'Partnership': return 'Form 1065';
            case 'S-Corp': return 'Form 1120-S';
            case 'C-Corp': return 'Form 1120';
            default: return 'Schedule C';
        }
    };

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

    const handleSaveEntity = (e: React.FormEvent) => {
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
            updateLocalEntity(newEntity);
        } else {
            addLocalEntity(newEntity);
        }
        setIsEntityModalOpen(false);
    };

    const handleDeleteEntity = (id: string) => {
        if (window.confirm("Delete this business entity? Accounts linked to it may need updating.")) {
            deleteLocalEntity(id);
        }
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
                    <div className="d-flex align-items-center">
                        <Database className="me-2 text-primary" size={20} />
                        <CardTitle>Database Connection (Supabase)</CardTitle>
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
                    <button type="submit" className="btn btn-primary d-flex align-items-center px-4">
                        <Save size={18} className="me-2" />
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
        </div>
    );
};

export default Settings;
