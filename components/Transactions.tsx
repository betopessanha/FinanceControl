
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId, downloadImportTemplate } from '../lib/utils';
import { PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, Sparkles, FileText, Check, AlertCircle, ArrowRight, Download, Upload, FileJson, Info, ArrowUpRight, ArrowDownRight, Tag, ArrowRightLeft, X, Filter } from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';
import { GoogleGenAI } from "@google/genai";

const Transactions: React.FC = () => {
    const { 
        transactions, accounts, categories, loading, 
        addLocalTransaction, updateLocalTransaction, deleteLocalTransaction
    } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterAccountId, setFilterAccountId] = useState('');
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: TransactionType.EXPENSE,
        accountId: '',
        category: undefined,
        toCategory: undefined,
        toAccountId: undefined
    });

    const handleOpenModal = (transaction?: Transaction) => {
        if (transaction) {
            setEditingTransaction(transaction);
            setFormData({
                date: transaction.date.split('T')[0],
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                accountId: transaction.accountId,
                category: transaction.category,
                toCategory: transaction.toCategory,
                toAccountId: transaction.toAccountId
            });
        } else {
            setEditingTransaction(null);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                amount: 0,
                type: TransactionType.EXPENSE,
                accountId: accounts.length > 0 ? accounts[0].id : '',
                category: undefined,
                toCategory: undefined,
                toAccountId: undefined
            });
        }
        setIsFormModalOpen(true);
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const obj: Transaction = { id: editingTransaction ? editingTransaction.id : generateId(), ...formData };
        if (editingTransaction) await updateLocalTransaction(obj);
        else await addLocalTransaction(obj);
        setIsFormModalOpen(false);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setFilterAccountId('');
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.toCategory?.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesAccount = filterAccountId === '' || t.accountId === filterAccountId || t.toAccountId === filterAccountId;
            
            const transDate = t.date.split('T')[0];
            const matchesStart = startDate === '' || transDate >= startDate;
            const matchesEnd = endDate === '' || transDate <= endDate;

            return matchesSearch && matchesAccount && matchesStart && matchesEnd;
        });
    }, [transactions, searchTerm, filterAccountId, startDate, endDate]);

    const hasActiveFilters = searchTerm !== '' || startDate !== '' || endDate !== '' || filterAccountId !== '';

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-900 tracking-tight text-black mb-1">Financial Ledger</h1>
                    <p className="text-muted mb-0 small">Audit trail for all business and personal accounts.</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="btn btn-white border shadow-sm px-3 fw-bold d-flex align-items-center gap-2">
                        <Upload size={18} className="text-primary" /> Import
                    </button>
                    <button onClick={() => handleOpenModal()} className="btn btn-black shadow-lg px-4 fw-900 d-flex align-items-center gap-2">
                        <PlusCircle size={18} /> New Entry
                    </button>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-4 bg-white border-bottom">
                        <div className="row g-3 align-items-end">
                            <div className="col-12 col-lg-4">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">Search Records</label>
                                <div className="position-relative">
                                    <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                                    <input 
                                        type="text" 
                                        className="form-control border-0 bg-light ps-5 py-2 rounded-3 fw-bold" 
                                        placeholder="Vendor, category, etc..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">Filter by Account</label>
                                <div className="position-relative">
                                    <Wallet size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                                    <select 
                                        className="form-select border-0 bg-light ps-5 py-2 rounded-3 fw-bold" 
                                        value={filterAccountId}
                                        onChange={e => setFilterAccountId(e.target.value)}
                                    >
                                        <option value="">All Accounts</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="col-6 col-md-3 col-lg-2">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">Start Date</label>
                                <input 
                                    type="date" 
                                    className="form-control border-0 bg-light py-2 rounded-3 fw-bold" 
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="col-6 col-md-3 col-lg-2">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">End Date</label>
                                <input 
                                    type="date" 
                                    className="form-control border-0 bg-light py-2 rounded-3 fw-bold" 
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                            {hasActiveFilters && (
                                <div className="col-auto">
                                    <button 
                                        onClick={resetFilters} 
                                        className="btn btn-white border-0 text-muted p-2" 
                                        title="Clear all filters"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light bg-opacity-50">
                                <tr>
                                    <th className="ps-4 py-3 border-0 text-muted small fw-800 text-uppercase">Date</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Description</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Category</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Account Perspective</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase text-end">Amount</th>
                                    <th className="pe-4 py-3 border-0 text-muted small fw-800 text-uppercase text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
                                    // Logic for perspective-aware transfers
                                    let isTransferIn = false;
                                    let isTransferOut = false;
                                    
                                    if (t.type === TransactionType.TRANSFER && filterAccountId !== '') {
                                        if (t.toAccountId === filterAccountId) isTransferIn = true;
                                        if (t.accountId === filterAccountId) isTransferOut = true;
                                    }

                                    const displayAsPositive = t.type === TransactionType.INCOME || isTransferIn;
                                    const displayAsNegative = t.type === TransactionType.EXPENSE || isTransferOut;

                                    return (
                                        <tr key={t.id} className="border-bottom border-light">
                                            <td className="ps-4 py-4">
                                                <span className="text-muted fw-bold small">{formatDate(t.date)}</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className={`p-2 rounded-circle ${
                                                        displayAsPositive ? 'bg-success bg-opacity-10 text-success' : 
                                                        t.type === TransactionType.TRANSFER ? 'bg-primary bg-opacity-10 text-primary' :
                                                        'bg-danger bg-opacity-10 text-danger'
                                                    }`}>
                                                        {displayAsPositive ? <ArrowUpRight size={16}/> : 
                                                         t.type === TransactionType.TRANSFER ? <ArrowRightLeft size={16}/> : 
                                                         <ArrowDownRight size={16}/>}
                                                    </div>
                                                    <span className="fw-800 text-dark">{t.description}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="d-flex align-items-center gap-2">
                                                    <Tag size={12} className="text-muted" />
                                                    <div className="d-flex flex-column">
                                                        <span className="fw-bold text-muted small text-truncate" style={{maxWidth: '120px'}}>
                                                            {t.category?.name || 'Uncategorized'}
                                                        </span>
                                                        {t.type === TransactionType.TRANSFER && t.toCategory && (
                                                            <span className="text-primary fw-bold" style={{fontSize: '0.65rem'}}>
                                                                ↳ {t.toCategory.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="d-flex align-items-center gap-2">
                                                    <Wallet size={12} className="text-muted" />
                                                    <div className="d-flex flex-column">
                                                        <span className="fw-bold text-muted small">{accounts.find(a => a.id === t.accountId)?.name}</span>
                                                        {t.type === TransactionType.TRANSFER && t.toAccountId && (
                                                            <span className="text-primary fw-bold" style={{fontSize: '0.65rem'}}>
                                                                → {accounts.find(a => a.id === t.toAccountId)?.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-end">
                                                <span className={`fw-900 fs-6 ${
                                                    displayAsPositive ? 'text-success' : 
                                                    (t.type === TransactionType.TRANSFER && !hasActiveFilters) ? 'text-primary' : 
                                                    'text-black'
                                                }`}>
                                                    {displayAsPositive ? '+' : '-'} {formatCurrency(t.amount)}
                                                </span>
                                            </td>
                                            <td className="pe-4 py-4 text-center">
                                                <button onClick={() => handleOpenModal(t)} className="btn btn-sm btn-white border-0 shadow-none"><Edit2 size={16} className="text-muted"/></button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="py-5 text-center text-muted">
                                            <div className="py-4">
                                                <Filter size={48} className="mb-3 opacity-10" />
                                                <h6 className="fw-bold">No results found</h6>
                                                <p className="small mb-0">Try adjusting your filters or search term.</p>
                                                {hasActiveFilters && (
                                                    <button onClick={resetFilters} className="btn btn-link btn-sm mt-2 text-decoration-none">Clear all filters</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingTransaction ? "Edit Record" : "New Transaction"}>
                <form onSubmit={handleSaveTransaction}>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase ls-1">Record Type</label>
                        <div className="d-flex gap-2 p-1 bg-light rounded-3 border">
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})} className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.EXPENSE ? 'btn-white shadow-sm fw-bold border text-danger' : 'text-muted border-0 bg-transparent'}`}>Expense</button>
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME})} className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.INCOME ? 'btn-white shadow-sm fw-bold border text-success' : 'text-muted border-0 bg-transparent'}`}>Income</button>
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.TRANSFER})} className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.TRANSFER ? 'btn-white shadow-sm fw-bold border text-primary' : 'text-muted border-0 bg-transparent'}`}>Transfer</button>
                        </div>
                    </div>

                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Date</label>
                            <input type="date" className="form-control bg-light border-0 fw-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Amount ($)</label>
                            <input type="number" step="0.01" className="form-control bg-light border-0 fw-bold" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} required />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Description / Vendor</label>
                        <input type="text" className="form-control bg-light border-0 fw-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder={formData.type === TransactionType.TRANSFER ? "Internal Transfer" : "e.g. Loves Travel Stop"} />
                    </div>

                    <div className="row g-3 mb-4">
                        <div className={formData.type === TransactionType.TRANSFER ? "col-md-6" : "col-12"}>
                            <label className="form-label fw-bold small text-muted">{formData.type === TransactionType.TRANSFER ? "Source Account" : "Source Account"}</label>
                            <select className="form-select bg-light border-0 fw-bold" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} required>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)}
                            </select>
                        </div>
                        {formData.type === TransactionType.TRANSFER && (
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Destination Account</label>
                                <select className="form-select bg-light border-0 fw-bold" value={formData.toAccountId || ''} onChange={e => setFormData({...formData, toAccountId: e.target.value})} required>
                                    <option value="">Select Target...</option>
                                    {accounts.filter(a => a.id !== formData.accountId).map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {formData.type !== TransactionType.TRANSFER ? (
                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted">Category (Optional)</label>
                            <select className="form-select bg-light border-0 fw-bold" value={formData.category?.id || ''} onChange={e => {
                                const cat = categories.find(c => c.id === e.target.value);
                                setFormData({...formData, category: cat});
                            }}>
                                <option value="">Uncategorized</option>
                                {categories.filter(c => 
                                    (formData.type === TransactionType.INCOME && c.type === TransactionType.INCOME) || 
                                    (formData.type === TransactionType.EXPENSE && c.type === TransactionType.EXPENSE)
                                ).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Outflow Category</label>
                                <select className="form-select bg-light border-0 fw-bold" value={formData.category?.id || ''} onChange={e => {
                                    const cat = categories.find(c => c.id === e.target.value);
                                    setFormData({...formData, category: cat});
                                }}>
                                    <option value="">Select Exit...</option>
                                    {categories.filter(c => c.type === TransactionType.EXPENSE || c.name.includes('Transfer')).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Inflow Category</label>
                                <select className="form-select bg-light border-0 fw-bold" value={formData.toCategory?.id || ''} onChange={e => {
                                    const cat = categories.find(c => c.id === e.target.value);
                                    setFormData({...formData, toCategory: cat});
                                }}>
                                    <option value="">Select Entry...</option>
                                    {categories.filter(c => c.type === TransactionType.INCOME || c.name.includes('Equity') || c.name.includes('Transfer')).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg mt-2">
                        <Save size={18} className="me-2" /> Commit to Ledger
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
