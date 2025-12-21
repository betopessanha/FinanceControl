
import React, { useState, useEffect } from 'react';
import Card, { CardContent } from './ui/Card';
import { useAuth, UserRole } from '../lib/AuthContext';
import { generateId, isValidUUID } from '../lib/utils';
import { PlusCircle, Search, Trash2, Users, Save, CheckCircle2, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * UserManagement component for managing team member access and roles.
 */
const UserManagement: React.FC = () => {
    const { signUp } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('user');

    const loadUsers = () => {
        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        setUsers(localUsers);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Correcting handleCreateUser to be within the component scope
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await signUp(newEmail, newPassword);
        
        if (result.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            // Force role update and ensure ID is a UUID
            const updatedUsers = localUsers.map((u: any) => 
                u.email.toLowerCase() === newEmail.toLowerCase() 
                ? { ...u, role: newRole, id: isValidUUID(u.id) ? u.id : generateId() } 
                : u
            );
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
        if (confirm('Are you sure you want to remove this user?')) {
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            const updated = localUsers.filter((u: any) => u.id !== id);
            localStorage.setItem('app_local_users', JSON.stringify(updated));
            loadUsers();
        }
    };

    const filteredUsers = users.filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Team Members</h2>
                  <p className="text-muted mb-0">Manage system access for administrators and staff.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary d-flex align-items-center">
                    <UserPlus size={18} className="me-2" /> Add Member
                </button>
            </div>

            <Card className="min-vh-50">
                <CardContent>
                    <div className="mb-4" style={{maxWidth: '400px'}}>
                        <div className="position-relative">
                            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                                <Search size={16} />
                            </span>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by email..." 
                                className="form-control ps-5 bg-light border-0" 
                            />
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-4">Email Address</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th className="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="p-2 bg-light rounded-circle"><Users size={16} className="text-muted" /></div>
                                                <span className="fw-bold">{u.email}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-1 ${u.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge bg-success bg-opacity-10 text-success border-0 px-2 py-1 small fw-bold">ACTIVE</span>
                                        </td>
                                        <td className="text-end pe-4">
                                            {u.id !== 'local-admin' && (
                                                <button onClick={() => handleDeleteUser(u.id)} className="btn btn-sm btn-light text-danger"><Trash2 size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-5 text-muted">No users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal title="Add New Team Member" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {showSuccess ? (
                    <div className="text-center py-4">
                        <CheckCircle2 size={48} className="text-success mb-3" />
                        <h5>Account Created</h5>
                        <p className="text-muted small">Member can now log in with their credentials.</p>
                    </div>
                ) : (
                    <form onSubmit={handleCreateUser}>
                        {error && (
                            <div className="alert alert-danger py-2 px-3 border-0 small d-flex align-items-center gap-2 mb-3">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Email / User ID</label>
                            <input type="text" className="form-control" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Initial Password</label>
                            <input type="password" placeholder="••••••••" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted">Access Level</label>
                            <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value as UserRole)}>
                                <option value="user">Standard User</option>
                                <option value="admin">Administrator</option>
                                <option value="driver">Driver Access</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={isLoading}>
                            {isLoading ? <Loader2 size={18} className="animate-spin me-2" /> : <Save size={18} className="me-2" />}
                            {isLoading ? 'Creating...' : 'Create Member'}
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default UserManagement;
