
import React, { useState, useEffect } from 'react';
import Card, { CardContent } from './ui/Card';
import { BankAccount, BusinessEntity, LegalStructure } from '../types';
import { PlusCircle, Search, Edit2, Trash2, Landmark, CreditCard, Wallet, Save, X, Building2, Briefcase, ArrowLeft, Link as LinkIcon, AlertCircle } from 'lucide-react';
import Modal from './ui/Modal';
import { formatCurrency, getTaxFormForStructure } from '../lib/utils';
import { useData } from '../lib/DataContext';

const BankAccounts: React.FC = () => {
    const { 
        accounts, businessEntities,
        addLocalAccount, updateLocalAccount, deleteLocalAccount,
        addLocalEntity
    } = useData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Omit<BankAccount, 'id'>>({ 
        name: '', 
        type: 'Checking', 
        initialBalance: 0,
        businessEntityId: ''
    });

    const [isCreatingEntity, setIsCreatingEntity] = useState(false);
    const [entityForm, setEntityForm] = useState<Omit<BusinessEntity, 'id' | 'taxForm'>>({
        name: '', structure: 'Sole Proprietorship', ein: ''
    });

    const handleOpenModal = (account?: BankAccount) => {
        setIsCreatingEntity(false);
        if (account) {
            setEditingAccount(account);
            setFormData({ 
                name: account.name, 
                type: account.type,
                initialBalance: account.initialBalance,
                businessEntityId: account.businessEntityId ? String(account.businessEntityId) : ''
            });
        } else {
            setEditingAccount(null);
            const defaultEntityId = businessEntities.length === 1 ? businessEntities[0].id : '';
            setFormData({ 
                name: '', 
                type: 'Checking',
                initialBalance: 0,
                businessEntityId: String(defaultEntityId)
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveNewEntity = async () => {
        if(!entityForm.name) return;
        const newId = `ent-${Date.now()}`;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const accountId = editingAccount ? editingAccount.id : `acc-${Date.now()}`;
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

    const getEntityName = (id?: string) => {
        if (!id) return null;
        const entity = businessEntities.find(e => String(e.id) === String(id));
        return entity ? entity.name : 'Unknown Company';
    }

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Bank Accounts</h2>
                  <p className="text-muted mb-0">Link your accounts to specific business profiles.</p>
                </div>
            </div>

            <Card className="min-vh-50">
                <CardContent>
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
                        <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center">
                            <PlusCircle size={18} className="me-2" /> Add Account
                        </button>
                    </div>

                    <div className="row g-3">
                        {filteredAccounts.map(acc => (
                            <div key={acc.id} className="col-12 col-md-6 col-xl-4">
                                <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className={`rounded-circle p-3 ${acc.type === 'Credit Card' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                                <Landmark size={20} />
                                            </div>
                                            <div className="d-flex">
                                                <button className="btn btn-link text-muted p-0 me-3" onClick={() => handleOpenModal(acc)}><Edit2 size={16} /></button>
                                                <button className="btn btn-link text-danger p-0" onClick={() => deleteLocalAccount(acc.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <h5 className="fw-bold text-dark mb-1">{acc.name}</h5>
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            <span className="badge bg-light text-secondary border">{acc.type}</span>
                                            {getEntityName(acc.businessEntityId) && (
                                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-10 d-flex align-items-center">
                                                    <Building2 size={10} className="me-1" />
                                                    {getEntityName(acc.businessEntityId)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="border-top pt-3 mt-2">
                                            <small className="text-muted text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Initial Balance</small>
                                            <h4 className="fw-bold text-dark mb-0">{formatCurrency(acc.initialBalance)}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={isCreatingEntity ? "New Company" : (editingAccount ? "Edit Account" : "Add Account")} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {isCreatingEntity ? (
                    <div>
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Company Name</label>
                            <input type="text" className="form-control" value={entityForm.name} onChange={e => setEntityForm({...entityForm, name: e.target.value})} />
                        </div>
                        <button type="button" onClick={handleSaveNewEntity} className="btn btn-primary w-100">Save Company</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label fw-bold small">Account Name</label>
                            <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </div>
                        <div className="row">
                            <div className="col-6 mb-3">
                                <label className="form-label fw-bold small">Type</label>
                                <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                    <option value="Checking">Checking</option>
                                    <option value="Savings">Savings</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                            <div className="col-6 mb-3">
                                <label className="form-label fw-bold small">Company</label>
                                <div className="input-group">
                                    <select className="form-select" value={formData.businessEntityId} onChange={e => setFormData({...formData, businessEntityId: e.target.value})}>
                                        <option value="">Select...</option>
                                        {businessEntities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                                    </select>
                                    <button type="button" className="btn btn-outline-primary" onClick={() => setIsCreatingEntity(true)}>+</button>
                                </div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-bold small">Initial Balance</label>
                            <input type="number" className="form-control" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value) || 0})} />
                        </div>
                        <button type="submit" className="btn btn-primary w-100">Save Account</button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default BankAccounts;
