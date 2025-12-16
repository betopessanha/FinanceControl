
import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { BankAccount } from '../types';
import { PlusCircle, Search, Edit2, Trash2, Landmark, CreditCard, Wallet, Save, X, Building2 } from 'lucide-react';
import Modal from './ui/Modal';
import { formatCurrency } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const BankAccounts: React.FC = () => {
    // Consume Data
    const { accounts, refreshData, businessEntities } = useData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Omit<BankAccount, 'id'>>({ 
        name: '', 
        type: 'Checking', 
        initialBalance: 0,
        businessEntityId: ''
    });

    const handleOpenModal = (account?: BankAccount) => {
        if (account) {
            setEditingAccount(account);
            setFormData({ 
                name: account.name, 
                type: account.type,
                initialBalance: account.initialBalance,
                businessEntityId: account.businessEntityId || ''
            });
        } else {
            setEditingAccount(null);
            setFormData({ 
                name: '', 
                type: 'Checking',
                initialBalance: 0,
                businessEntityId: businessEntities.length > 0 ? businessEntities[0].id : ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isSupabaseConfigured || !supabase) {
             alert("Database not connected (Demo Mode). Changes will revert on reload if not implemented locally.");
             // For demo completeness we would implement addLocalAccount here, but relying on context refresh logic usually
             return;
        }

        try {
            const payload = { 
                name: formData.name, 
                type: formData.type,
                initial_balance: formData.initialBalance,
                business_entity_id: formData.businessEntityId || null // New Field
            };

            if (editingAccount) {
                // Edit existing
                await supabase
                    .from('accounts')
                    .update(payload)
                    .eq('id', editingAccount.id);
            } else {
                // Add new
                await supabase
                    .from('accounts')
                    .insert([payload]);
            }
            await refreshData();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error saving account.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!isSupabaseConfigured || !supabase) {
             alert("Database not connected.");
             return;
        }

        if (accounts.length <= 1) {
            alert("You must have at least one account.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this account?')) {
             try {
                await supabase.from('accounts').delete().eq('id', id);
                await refreshData();
            } catch (error) {
                console.error(error);
                alert("Error deleting account. It might be referenced by transactions.");
            }
        }
    };

    const filteredAccounts = accounts.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getIconForType = (type: string) => {
        switch (type) {
            case 'Credit Card': return <CreditCard size={20} />;
            case 'Savings': return <Wallet size={20} />;
            default: return <Landmark size={20} />;
        }
    };

    const getEntityName = (id?: string) => {
        if (!id) return 'Unassigned';
        const entity = businessEntities.find(e => e.id === id);
        return entity ? entity.name : 'Unknown Entity';
    }

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Bank Accounts</h2>
                  <p className="text-muted mb-0">Manage your business checking, savings, and credit card accounts.</p>
                </div>
            </div>

            <Card className="min-vh-50">
                <CardContent>
                    {/* Header Controls */}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                        <div className="d-flex gap-2 w-100 w-md-auto" style={{maxWidth: '400px'}}>
                            <div className="position-relative flex-grow-1">
                                <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                                    <Search size={16} />
                                </span>
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search accounts..." 
                                    className="form-control ps-5 bg-light border-0" 
                                />
                            </div>
                        </div>
                        <button 
                            onClick={() => handleOpenModal()} 
                            className="btn btn-primary d-flex align-items-center text-nowrap shadow-sm"
                        >
                            <PlusCircle size={18} className="me-2" />
                            Add Account
                        </button>
                    </div>

                    {/* Accounts Grid */}
                    <div className="row g-3">
                        {filteredAccounts.length > 0 ? (
                            filteredAccounts.map(acc => (
                                <div key={acc.id} className="col-12 col-md-6 col-xl-4">
                                    <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div className={`rounded-circle p-3 ${acc.type === 'Credit Card' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                                    {getIconForType(acc.type)}
                                                </div>
                                                <div className="d-flex">
                                                    <button className="btn btn-link text-muted p-0 me-3" type="button" onClick={() => handleOpenModal(acc)}>
                                                        <Edit2 size={16} className="cursor-pointer hover-text-primary" />
                                                    </button>
                                                    <button className="btn btn-link text-danger p-0" type="button" onClick={() => handleDelete(acc.id)}>
                                                         <Trash2 size={16} className="cursor-pointer hover-text-danger"/>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <h5 className="fw-bold text-dark mb-1">{acc.name}</h5>
                                            <span className="badge bg-light text-secondary border mb-3 me-2">{acc.type}</span>
                                            
                                            {/* Entity Badge */}
                                            <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 mb-3">
                                                <Building2 size={10} className="me-1 mb-1" />
                                                {getEntityName(acc.businessEntityId)}
                                            </span>
                                            
                                            <div className="border-top pt-3 mt-2">
                                                <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Initial Balance</small>
                                                <h4 className="fw-bold text-dark mb-0">{formatCurrency(acc.initialBalance)}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-12 text-center py-5">
                                <Landmark size={48} className="text-muted opacity-25 mb-3" />
                                <p className="text-muted">No bank accounts found.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Modal 
                title={editingAccount ? "Edit Account" : "Add New Account"} 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="name" className="form-label fw-bold small text-muted">Account Name</label>
                        <input 
                            type="text" 
                            id="name" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            placeholder="e.g. Chase Business Checking" 
                            className="form-control"
                            required 
                        />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="type" className="form-label fw-bold small text-muted">Account Type</label>
                            <select 
                                id="type" 
                                className="form-select"
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as any})}
                            >
                                <option value="Checking">Checking</option>
                                <option value="Savings">Savings</option>
                                <option value="Credit Card">Credit Card</option>
                            </select>
                        </div>
                        <div className="col-md-6 mb-3">
                             <label htmlFor="entity" className="form-label fw-bold small text-muted">Business Entity</label>
                             <select 
                                id="entity"
                                className="form-select"
                                value={formData.businessEntityId}
                                onChange={e => setFormData({...formData, businessEntityId: e.target.value})}
                                required
                             >
                                 <option value="">Select Entity...</option>
                                 {businessEntities.map(ent => (
                                     <option key={ent.id} value={ent.id}>{ent.name} ({ent.structure})</option>
                                 ))}
                             </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="balance" className="form-label fw-bold small text-muted">Initial Balance</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input 
                                type="number" 
                                id="balance" 
                                value={formData.initialBalance} 
                                onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value) || 0})} 
                                className="form-control"
                                step="0.01"
                            />
                        </div>
                        <div className="form-text text-muted">Starting balance when you began using this system.</div>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary d-flex align-items-center">
                            <Save size={16} className="me-2" />
                            {editingAccount ? 'Save Changes' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default BankAccounts;
