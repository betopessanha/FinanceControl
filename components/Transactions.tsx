
import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId } from '../lib/utils';
import { PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, Sparkles, Wand2 } from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';
import { GoogleGenAI } from "@google/genai";

/**
 * Transactions Ledger component for listing and managing financial movements.
 * Enhanced with Gemini AI Categorization.
 */
const Transactions: React.FC = () => {
    const { 
        transactions, accounts, categories, loading, 
        reportFilter, setReportFilter,
        addLocalTransaction, updateLocalTransaction, deleteLocalTransaction
    } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
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

    // Handle incoming filters from other reports
    useEffect(() => {
        if (reportFilter && reportFilter.sourceReport) {
            setSearchTerm(reportFilter.sourceReport);
        }
    }, [reportFilter]);

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

    const handleSuggestCategory = async () => {
        if (!formData.description) return;
        
        setIsAiSuggesting(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const catNames = categories
                .filter(c => c.type === formData.type)
                .map(c => c.name)
                .join(', ');

            const prompt = `You are a professional US Trucking Accountant. 
            Based on the transaction description: "${formData.description}", 
            suggest the most appropriate accounting category from this list: [${catNames}]. 
            Respond ONLY with a JSON object in this format: {"suggestedCategory": "Category Name", "reason": "brief reason"}`;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const suggestion = JSON.parse(result.text);
            const matchedCategory = categories.find(c => 
                c.name.toLowerCase() === suggestion.suggestedCategory.toLowerCase() && 
                c.type === formData.type
            );

            if (matchedCategory) {
                setFormData(prev => ({ ...prev, category: matchedCategory }));
            }
        } catch (error) {
            console.error("AI Categorization failed:", error);
        } finally {
            setIsAiSuggesting(false);
        }
    };

    const handleSaveTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullTransactionObj: Transaction = { 
            id: editingTransaction ? editingTransaction.id : generateId(), 
            ...formData 
        };
        
        if (editingTransaction) await updateLocalTransaction(fullTransactionObj);
        else await addLocalTransaction(fullTransactionObj);
        
        setIsFormModalOpen(false);
        setEditingTransaction(null);
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => 
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    if (loading) {
        return <div className="text-center py-5"><Loader2 size={40} className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h1 className="fw-800 tracking-tight text-black mb-1">Transaction Ledger</h1>
                    <p className="text-muted mb-0 small">Record and manage your fleet's financial movements.</p>
                </div>
                <div className="d-flex gap-2">
                    <ExportMenu data={filteredTransactions} filename="transactions" />
                    <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center shadow-sm">
                        <PlusCircle size={18} className="me-2" /> Add Transaction
                    </button>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-4 bg-white border-bottom">
                        <div className="row g-3">
                            <div className="col-12 col-md-4">
                                <div className="position-relative">
                                    <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                                    <input 
                                        type="text" 
                                        className="form-control border-0 bg-subtle ps-5 rounded-pill" 
                                        placeholder="Search description, category..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table align-middle mb-0 table-hover">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 py-3 fw-800 text-muted small text-uppercase border-0">Date</th>
                                    <th className="py-3 fw-800 text-muted small text-uppercase border-0">Description</th>
                                    <th className="py-3 fw-800 text-muted small text-uppercase border-0">Category</th>
                                    <th className="py-3 fw-800 text-muted small text-uppercase border-0">Account</th>
                                    <th className="py-3 fw-800 text-muted small text-uppercase border-0 text-end">Amount</th>
                                    <th className="pe-4 py-3 fw-800 text-muted small text-uppercase border-0 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-bottom border-light">
                                        <td className="ps-4 py-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Calendar size={14} className="text-muted" />
                                                <span className="small fw-600">{formatDate(t.date)}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className="fw-700 text-dark small">{t.description}</span>
                                        </td>
                                        <td className="py-3">
                                            <span className={`badge rounded-pill px-3 py-1 fw-bold ${t.type === TransactionType.INCOME ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`} style={{fontSize: '0.65rem'}}>
                                                {t.category?.name || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <div className="d-flex align-items-center gap-2">
                                                <Wallet size={14} className="text-muted" />
                                                <span className="small text-muted">{accounts.find(a => a.id === t.accountId)?.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-end">
                                            <span className={`fw-800 ${t.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}`}>
                                                {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                            </span>
                                        </td>
                                        <td className="pe-4 py-3 text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <button onClick={() => handleOpenModal(t)} className="btn btn-sm btn-white border-0"><Edit2 size={16} className="text-muted" /></button>
                                                <button onClick={() => deleteLocalTransaction(t.id)} className="btn btn-sm btn-white border-0"><Trash2 size={16} className="text-danger" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingTransaction ? "Edit Transaction" : "New Transaction"}>
                <form onSubmit={handleSaveTransaction}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Transaction Type</label>
                        <div className="d-flex gap-2 p-1 bg-light rounded">
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE, category: undefined})} className={`btn flex-fill ${formData.type === TransactionType.EXPENSE ? 'btn-white shadow-sm text-danger fw-bold' : 'text-muted'}`}>Expense</button>
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME, category: undefined})} className={`btn flex-fill ${formData.type === TransactionType.INCOME ? 'btn-white shadow-sm text-success fw-bold' : 'text-muted'}`}>Income</button>
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.TRANSFER})} className={`btn flex-fill ${formData.type === TransactionType.TRANSFER ? 'btn-white shadow-sm text-primary fw-bold' : 'text-muted'}`}>Transfer</button>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Date</label>
                        <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Description</label>
                        <input type="text" className="form-control" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Fuel purchase at Pilot" required />
                    </div>

                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Amount</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light">$</span>
                                <input type="number" step="0.01" className="form-control" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} required />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Account</label>
                            <select className="form-select" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} required>
                                <option value="">Select Account...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {formData.type !== TransactionType.TRANSFER && (
                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <label className="form-label fw-bold small text-muted mb-0">Category</label>
                                <button 
                                    type="button" 
                                    onClick={handleSuggestCategory}
                                    disabled={isAiSuggesting || !formData.description}
                                    className={`btn btn-sm d-flex align-items-center gap-1 border-0 ${isAiSuggesting ? 'text-muted' : 'text-primary fw-bold'}`}
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    {isAiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    AI Suggest
                                </button>
                            </div>
                            <select 
                                className="form-select" 
                                value={formData.category?.id || ''} 
                                onChange={e => {
                                    const cat = categories.find(c => c.id === e.target.value);
                                    setFormData({...formData, category: cat});
                                }}
                            >
                                <option value="">Select Category...</option>
                                {categories.filter(c => c.type === formData.type).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                    )}

                    {formData.type === TransactionType.TRANSFER && (
                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted">To Account</label>
                            <select className="form-select" value={formData.toAccountId || ''} onChange={e => setFormData({...formData, toAccountId: e.target.value})} required>
                                <option value="">Select Target Account...</option>
                                {accounts.filter(acc => acc.id !== formData.accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                        <button type="button" onClick={() => setIsFormModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                            <Save size={18} />
                            {editingTransaction ? 'Save Changes' : 'Record Transaction'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
