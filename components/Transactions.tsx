
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId, downloadImportTemplate } from '../lib/utils';
import { PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, Sparkles, FileText, Check, AlertCircle, ArrowRight, Download, Upload, FileJson, Info, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react';
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
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);

    const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        type: TransactionType.EXPENSE,
        accountId: '',
        category: undefined,
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

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-900 tracking-tight text-black mb-1">Financial Ledger</h1>
                    <p className="text-muted mb-0 small">Modern bank-style audit for all your connected accounts.</p>
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
                        <div className="position-relative" style={{maxWidth: '400px'}}>
                            <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                            <input 
                                type="text" 
                                className="form-control border-0 bg-light ps-5 py-2 rounded-pill fw-bold" 
                                placeholder="Search payments, vendors, categories..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light bg-opacity-50">
                                <tr>
                                    <th className="ps-4 py-3 border-0 text-muted small fw-800 text-uppercase">Date</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Description / Vendor</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Category</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Source Account</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase text-end">Amount</th>
                                    <th className="pe-4 py-3 border-0 text-muted small fw-800 text-uppercase text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-bottom border-light">
                                        <td className="ps-4 py-4">
                                            <span className="text-muted fw-bold small">{formatDate(t.date)}</span>
                                        </td>
                                        <td className="py-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className={`p-2 rounded-circle ${t.type === TransactionType.INCOME ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                                                    {t.type === TransactionType.INCOME ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                                                </div>
                                                <span className="fw-800 text-dark">{t.description}</span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="d-flex align-items-center gap-2">
                                                <Tag size={12} className="text-muted" />
                                                <span className="fw-bold text-muted small">{t.category?.name || 'Uncategorized'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="d-flex align-items-center gap-2">
                                                <Wallet size={12} className="text-muted" />
                                                <span className="fw-bold text-muted small">{accounts.find(a => a.id === t.accountId)?.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-end">
                                            <span className={`fw-900 fs-6 ${t.type === TransactionType.INCOME ? 'text-success' : 'text-black'}`}>
                                                {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                            </span>
                                        </td>
                                        <td className="pe-4 py-4 text-center">
                                            <button onClick={() => handleOpenModal(t)} className="btn btn-sm btn-white border-0 shadow-none"><Edit2 size={16} className="text-muted"/></button>
                                        </td>
                                    </tr>
                                ))}
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
                        <input type="text" className="form-control bg-light border-0 fw-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="e.g. Loves Travel Stop" />
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">Source Account</label>
                        <select className="form-select bg-light border-0 fw-bold" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} required>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)}
                        </select>
                    </div>

                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg mt-2">
                        <Save size={18} className="me-2" /> Commit to Ledger
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
