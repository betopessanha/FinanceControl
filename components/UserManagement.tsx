
import React, { useState, useEffect } from 'react';
import Card, { CardContent } from './ui/Card';
import Modal from './ui/Modal';
import { UserPlus, Search, User, Mail, Shield, ShieldCheck, ShieldAlert, MoreVertical, Trash2, Edit2, Loader2, CheckCircle2, X, Key } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface SystemUser {
    id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    lastLogin?: string;
    status: 'active' | 'pending';
}

const UserManagement: React.FC = () => {
    const { signUp } = useAuth();
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Form State
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        setUsers(localUsers.map((u: any) => ({
            id: u.id,
            email: u.email,
            role: u.role || 'admin',
            status: 'active',
            lastLogin: new Date().toLocaleDateString()
        })));
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await signUp(newEmail, newPassword);
        
        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            // Update role if not default admin in local storage (Simulated for prototype)
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            const updatedUsers = localUsers.map((u: any) => u.email === newEmail ? { ...u, role: newRole } : u);
            localStorage.setItem('app_local_users', JSON.stringify(updatedUsers));
            
            setShowSuccess(true);
            setIsLoading(false);
            loadUsers();

            setTimeout(() => {
                setShowSuccess(false);
                setIsModalOpen(false);
                setNewEmail('');
                setNewPassword('');
            }, 1500);
        }
    };

    const handleDeleteUser = (id: string) => {
        if (window.confirm("Are you sure you want to remove this user?")) {
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            const filtered = localUsers.filter((u: any) => u.id !== id);
            localStorage.setItem('app_local_users', JSON.stringify(filtered));
            loadUsers();
        }
    };

    const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-800 tracking-tight text-black mb-1">Team Management</h1>
                    <p className="text-muted mb-0">Manage access levels and system permissions for your staff.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-black shadow-lg d-flex align-items-center py-2 px-4 rounded-3">
                    <UserPlus size={18} className="me-2"/> Invite Member
                </button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="p-4 border-bottom">
                        <div className="position-relative" style={{ maxWidth: '350px' }}>
                            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                            <input 
                                type="text" 
                                className="form-control border-0 bg-subtle ps-5 rounded-pill" 
                                placeholder="Find team members..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 py-3 border-0 text-muted small fw-800 text-uppercase">Member</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Access Level</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Status</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Last Login</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td className="ps-4 py-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                                                    <User size={18} className="text-black opacity-50" />
                                                </div>
                                                <div>
                                                    <p className="fw-700 text-black mb-0">{u.email}</p>
                                                    <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Speedy Haulers Internal</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-2 fw-800 d-inline-flex align-items-center gap-2 ${
                                                u.role === 'admin' ? 'bg-primary bg-opacity-10 text-primary' : 
                                                u.role === 'editor' ? 'bg-info bg-opacity-10 text-info' : 'bg-light text-muted'
                                            }`} style={{ fontSize: '0.65rem' }}>
                                                {u.role === 'admin' ? <Shield size={10} /> : u.role === 'editor' ? <Edit2 size={10} /> : <User size={10} />}
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="bg-success rounded-circle" style={{ width: 6, height: 6 }}></div>
                                                <span className="small fw-600 text-dark">Active</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="small text-muted">{u.lastLogin}</span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <button className="btn btn-white btn-sm border-0"><Edit2 size={16} className="text-muted" /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="btn btn-white btn-sm border-0"><Trash2 size={16} className="text-danger" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => !isLoading && setIsModalOpen(false)} title="Add Team Member" size="sm">
                {showSuccess ? (
                    <div className="text-center py-4">
                        <CheckCircle2 size={48} className="text-success mb-3 animate-bounce" />
                        <h5 className="fw-800 text-black">Member Added!</h5>
                        <p className="text-muted small">Access credentials have been provisioned.</p>
                    </div>
                ) : (
                    <form onSubmit={handleCreateUser}>
                        <div className="mb-3">
                            <label className="form-label fw-800 small text-muted text-uppercase" style={{ fontSize: '0.6rem' }}>Member Email / User</label>
                            <div className="input-group border rounded-3 bg-light bg-opacity-50">
                                <span className="input-group-text bg-transparent border-0"><Mail size={16} className="text-muted" /></span>
                                <input 
                                    type="text" 
                                    className="form-control border-0 bg-transparent shadow-none" 
                                    placeholder="name@trucking.io"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-800 small text-muted text-uppercase" style={{ fontSize: '0.6rem' }}>Initial Password</label>
                            <div className="input-group border rounded-3 bg-light bg-opacity-50">
                                <span className="input-group-text bg-transparent border-0"><Key size={16} className="text-muted" /></span>
                                <input 
                                    type="password" 
                                    className="form-control border-0 bg-transparent shadow-none" 
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-800 small text-muted text-uppercase" style={{ fontSize: '0.6rem' }}>Access Level</label>
                            <select 
                                className="form-select border rounded-3 shadow-sm bg-white"
                                value={newRole}
                                onChange={e => setNewRole(e.target.value as any)}
                            >
                                <option value="viewer">Viewer (Read Only)</option>
                                <option value="editor">Editor (Can edit data)</option>
                                <option value="admin">Administrator (Full Access)</option>
                            </select>
                        </div>

                        {error && (
                            <div className="alert alert-danger small py-2 d-flex align-items-center gap-2 mb-4">
                                <ShieldAlert size={14} />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-black w-100 py-3 rounded-3 fw-800 d-flex align-items-center justify-content-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                            {isLoading ? 'Provisioning...' : 'Confirm Invitation'}
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default UserManagement;
