
import React, { useState, useMemo } from 'react';
import Card, { CardContent } from './ui/Card';
import { BankAccount, BusinessEntity, EntityType, TransactionType } from '../types';
import { useData } from '../lib/DataContext';
import { generateId, getTaxFormForStructure, formatCurrency } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Wallet, Save, Building, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import Modal from './ui/Modal';

const BankAccounts: React.FC = () => {
    const { accounts, transactions, businessEntities, addLocalAccount, updateLocalAccount, deleteLocalAccount, addLocalEntity } = useData();
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
            // Fix: setEditingTransaction(null) to setEditingAccount(null)
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

    const handleSaveNewEntity = async () => {
        if(!entityForm.name) return;
        const newId = generateId();
        const newEntity: BusinessEntity = {
            id: newId,
            name: entityForm.name,
            type: EntityType.BUSINESS,
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

    const calculateCurrentBalance = (account: BankAccount) => {
        const accountTransactions = transactions.filter(t => t.accountId === account.id || t.toAccountId === account.id);
        
        let balance = account.initialBalance;
        
        accountTransactions.forEach(t => {
            if (t.type === TransactionType.INCOME) {
                if (t.accountId === account.id) balance += t.amount;
            } else if (t.type === TransactionType.EXPENSE) {
                if (t.accountId === account.id) balance -= t.amount;
            } else if (t.type === TransactionType.TRANSFER) {
                if (t.toAccountId === account.id) balance += t.amount;
                if (t.accountId === account.id) balance -= t.amount;
            }
        });
        
        return balance;
    };

    const filteredAccounts = accounts.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-900 tracking-tight text-black mb-1">Financial Accounts</h2>
                  <p className="text-muted mb-0 small">Manage your banks and link them to Business or Personal entities.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-black shadow-lg d-flex align-items-center px-4 py-2 fw-900 gap-2">
                    <PlusCircle size={18} /> Add Account
                </button>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-4 bg-white border-bottom">
                    <div className="mb-4" style={{maxWidth: '400px'}}>
                        <div className="position-relative">
                            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted">
                                <Search size={16} />
                            </span>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search accounts..." 
                                className="form-control ps-5 bg-subtle border-0 rounded-pill fw-bold" 
                            />
                        </div>
                    </div>

                    <div className="row g-4">
                        {filteredAccounts.map(acc => {
                            const currentBalance = calculateCurrentBalance(acc);
                            const entity = businessEntities.find(e => e.id === acc.businessEntityId);
                            
                            return (
                                <div key={acc.id} className="col-12 col-md-6 col-xl-4">
                                    <div className="card h-100 border-0 shadow-sm bg-white hover-shadow transition-all overflow-hidden rounded-4 border">
                                        <div className="p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-4">
                                                <div className={`p-3 rounded-4 ${acc.type === 'Credit Card' ? 'bg-black text-white' : 'bg-primary bg-opacity-10 text-primary'}`}>
                                                    <Wallet size={24} />
                                                </div>
                                                <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                                                    <button className="btn btn-sm btn-white border-0" onClick={() => handleOpenModal(acc)}><Edit2 size={16}/></button>
                                                    <button className="btn btn-sm btn-white border-0 text-danger" onClick={() => deleteLocalAccount(acc.id)}><Trash2 size={16}/></button>
                                                </div>
                                            </div>
                                            
                                            <h5 className="fw-900 text-black mb-1">{acc.name}</h5>
                                            <div className="d-flex align-items-center gap-2 mb-4">
                                                <span className="badge bg-light text-muted border fw-bold" style={{fontSize: '0.65rem'}}>{acc.type.toUpperCase()} ACCOUNT</span>
                                                <span className="text-muted small fw-bold text-uppercase" style={{fontSize: '0.6rem'}}>• {entity?.name || 'No Owner'}</span>
                                            </div>

                                            <div className="bg-light bg-opacity-50 p-3 rounded-4 mt-2">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <small className="text-muted fw-bold text-uppercase" style={{fontSize: '0.6rem'}}>Current Available Balance</small>
                                                    <TrendingUp size={14} className="text-success" />
                                                </div>
                                                <h3 className={`fw-900 mb-0 ${currentBalance < 0 ? 'text-danger' : 'text-black'}`}>
                                                    {formatCurrency(currentBalance)}
                                                </h3>
                                                <div className="mt-2 pt-2 border-top border-dark border-opacity-5 d-flex justify-content-between">
                                                    <small className="text-muted" style={{fontSize: '0.65rem'}}>Initial: {formatCurrency(acc.initialBalance)}</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingAccount ? "Update Account Details" : "Register New Account"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted text-uppercase">Internal Label</label>
                        <input type="text" className="form-control bg-light border-0 fw-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Chase Operating" />
                    </div>
                    <div className="row g-3 mb-3">
                        <div className="col-6">
                            <label className="form-label fw-bold small text-muted text-uppercase">Account Type</label>
                            <select className="form-select bg-light border-0 fw-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                <option value="Checking">Checking</option>
                                <option value="Savings">Savings</option>
                                <option value="Credit Card">Credit Card</option>
                            </select>
                        </div>
                        <div className="col-6">
                            <label className="form-label fw-bold small text-muted text-uppercase">Initial Balance</label>
                            <div className="input-group bg-light rounded-3 overflow-hidden border-0">
                                <span className="input-group-text bg-transparent border-0">$</span>
                                <input type="number" step="0.01" className="form-control bg-transparent border-0 fw-bold" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value) || 0})} required />
                            </div>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase">Linked Entity (Owner)</label>
                        {isCreatingEntity ? (
                            <div className="bg-light p-3 rounded-4 border">
                                <h6 className="small fw-bold mb-3">Quick Add Entity</h6>
                                <input type="text" className="form-control mb-2" placeholder="Company Name" value={entityForm.name} onChange={e => setEntityForm({...entityForm, name: e.target.value})} />
                                <div className="d-flex gap-2">
                                    <button type="button" onClick={handleSaveNewEntity} className="btn btn-sm btn-primary px-3 rounded-pill fw-bold">Save Entity</button>
                                    <button type="button" onClick={() => setIsCreatingEntity(false)} className="btn btn-sm btn-white border px-3 rounded-pill fw-bold">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="d-flex gap-2">
                                <select className="form-select bg-light border-0 fw-bold" value={formData.businessEntityId} onChange={e => setFormData({...formData, businessEntityId: e.target.value})}>
                                    <option value="">Select Entity...</option>
                                    {businessEntities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setIsCreatingEntity(true)} className="btn btn-white border px-3 rounded-3 shadow-sm"><PlusCircle size={18}/></button>
                            </div>
                        )}
                    </div>
                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg">
                        <Save size={18} className="me-2" />
                        {editingAccount ? 'Save Changes' : 'Register Account'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default BankAccounts;
