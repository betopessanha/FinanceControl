
import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { BankAccount, BusinessEntity } from '../types';
import { useData } from '../lib/DataContext';
import { generateId, getTaxFormForStructure } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Wallet, Save, Building } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * BankAccounts component for managing business bank accounts and linking them to entities.
 */
const BankAccounts: React.FC = () => {
    const { accounts, businessEntities, addLocalAccount, updateLocalAccount, deleteLocalAccount, addLocalEntity } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingEntity, setIsCreatingEntity] = useState(false);
    const [entityForm, setEntityForm] = useState({ name: '', structure: 'Sole Proprietorship' as any, ein: '' });
    
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

    // Fix for missing handleSaveNewEntity from the original fragment logic
    const handleSaveNewEntity = async () => {
        if(!entityForm.name) return;
        const newId = generateId();
        const newEntity: BusinessEntity = {
            id: newId,
            name: entityForm.name,
            structure: entityForm.structure,
            taxForm: getTaxFormForStructure(entityForm.structure),
            ein: entityForm.ein
        };
        await addLocalEntity(newEntity);
        setFormData(prev => ({ ...prev, businessEntityId: newId }));
        setIsCreatingEntity(false);
    };

    // Correcting handleSubmit to be within the component scope
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const accountId = editingAccount ? editingAccount.id : generateId();
        const accountObj: BankAccount = {
            id: accountId,
            ...formData,
            businessEntityId: formData.businessEntityId ? String(formData.businessEntityId) : undefined
        };

        if (editingAccount) {
            await updateLocalAccount(accountObj);
        } else {
            await addLocalAccount(accountObj);
        }
        setIsModalOpen(false);
    };

    const filteredAccounts = accounts.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Bank Accounts</h2>
                  <p className="text-muted mb-0">Manage your financial accounts and linked business entities.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center">
                    <PlusCircle size={18} className="me-2" /> Add Account
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
                                placeholder="Search account name..." 
                                className="form-control ps-5 bg-light border-0" 
                            />
                        </div>
                    </div>

                    <div className="row g-3">
                        {filteredAccounts.map(acc => (
                            <div key={acc.id} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                                <Wallet size={24} />
                                            </div>
                                            <div className="btn-group">
                                                <button className="btn btn-link text-primary p-1" onClick={() => handleOpenModal(acc)}><Edit2 size={16} /></button>
                                                <button className="btn btn-link text-danger p-1" onClick={() => deleteLocalAccount(acc.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <h5 className="fw-bold text-dark mb-1">{acc.name}</h5>
                                        <p className="text-muted small mb-1">{acc.type}</p>
                                        <p className="text-muted small mb-3">Linked: {businessEntities.find(e => e.id === acc.businessEntityId)?.name || 'No Entity'}</p>
                                        <div className="border-top pt-3">
                                            <span className="fw-bold text-dark">Initial: ${acc.initialBalance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingAccount ? "Edit Account" : "Add New Account"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Account Name</label>
                        <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="row g-3 mb-3">
                        <div className="col-6">
                            <label className="form-label fw-bold small text-muted">Type</label>
                            <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                <option value="Checking">Checking</option>
                                <option value="Savings">Savings</option>
                                <option value="Credit Card">Credit Card</option>
                            </select>
                        </div>
                        <div className="col-6">
                            <label className="form-label fw-bold small text-muted">Initial Balance</label>
                            <input type="number" step="0.01" className="form-control" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value) || 0})} required />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">Business Entity</label>
                        {isCreatingEntity ? (
                            <div className="bg-light p-3 rounded-3 border">
                                <h6 className="small fw-bold mb-3">Quick Add Entity</h6>
                                <input type="text" className="form-control mb-2" placeholder="Company Name" value={entityForm.name} onChange={e => setEntityForm({...entityForm, name: e.target.value})} />
                                <div className="d-flex gap-2">
                                    <button type="button" onClick={handleSaveNewEntity} className="btn btn-sm btn-primary">Save Entity</button>
                                    <button type="button" onClick={() => setIsCreatingEntity(false)} className="btn btn-sm btn-light border">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="d-flex gap-2">
                                <select className="form-select" value={formData.businessEntityId} onChange={e => setFormData({...formData, businessEntityId: e.target.value})}>
                                    <option value="">Select Entity...</option>
                                    {businessEntities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setIsCreatingEntity(true)} className="btn btn-outline-secondary"><PlusCircle size={18}/></button>
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary w-100 py-2 fw-bold">
                        <Save size={18} className="me-2" />
                        {editingAccount ? 'Save Changes' : 'Add Account'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default BankAccounts;
