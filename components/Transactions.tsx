
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId, downloadImportTemplate } from '../lib/utils';
import { PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, Sparkles, FileText, Check, AlertCircle, ArrowRight, Download, Upload, FileJson, Info, ArrowUpRight, ArrowDownRight, Tag, ArrowRightLeft, X, Filter, CheckSquare, Square, Trash, BrainCircuit } from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';
import { GoogleGenAI, Type } from "@google/genai";

const Transactions: React.FC = () => {
    const { 
        transactions, accounts, categories, loading, 
        addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions
    } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterAccountId, setFilterAccountId] = useState('');
    
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [aiResults, setAiResults] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

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

    const handleAnalyzeWithAI = async () => {
        setIsAnalyzing(true);
        setIsAIModalOpen(true);
        const selectedTrans = transactions.filter(t => selectedIds.has(t.id));
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Act as a senior CPA. Analyze these business transactions and suggest the most appropriate IRS tax deduction categories.
            Transactions: ${JSON.stringify(selectedTrans.map(t => ({ id: t.id, desc: t.description, amount: t.amount, currentCat: t.category?.name })))}
            Return JSON only as an array of objects: { id: string, suggestedCategory: string, reason: string, confidence: number }`;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                suggestedCategory: { type: Type.STRING },
                                reason: { type: Type.STRING },
                                confidence: { type: Type.NUMBER }
                            },
                            required: ['id', 'suggestedCategory', 'reason']
                        }
                    }
                }
            });

            const suggestions = JSON.parse(result.text);
            setAiResults(suggestions);
        } catch (e) {
            console.error("AI Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Permanently delete this record?')) {
            await deleteLocalTransaction(id);
            if (selectedIds.has(id)) {
                const next = new Set(selectedIds);
                next.delete(id);
                setSelectedIds(next);
            }
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setFilterAccountId('');
        setSelectedIds(new Set());
    };

    const toggleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (confirm(`Are you sure you want to delete ${count} selected transaction(s)?`)) {
            const idsToDelete = Array.from(selectedIds);
            await deleteLocalTransactions(idsToDelete);
            setSelectedIds(new Set());
        }
    };

    const hasActiveFilters = searchTerm !== '' || startDate !== '' || endDate !== '' || filterAccountId !== '';

    return (
        <div className="container-fluid py-2 animate-slide-up position-relative">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-900 tracking-tight text-black mb-1">Financial Ledger</h1>
                    <p className="text-muted mb-0 small">Audit trail for all business and personal accounts.</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="btn btn-white border shadow-sm px-3 fw-bold d-flex align-items-center gap-2 rounded-3">
                        <Upload size={18} className="text-primary" /> Import
                    </button>
                    <button onClick={() => handleOpenModal()} className="btn btn-black shadow-lg px-4 fw-900 d-flex align-items-center gap-2 rounded-3">
                        <PlusCircle size={18} /> New Entry
                    </button>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden mb-5 rounded-4">
                <CardContent className="p-0">
                    <div className="p-4 bg-white border-bottom">
                        <div className="row g-3 align-items-end">
                            <div className="col-12 col-lg-4">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">Search Records</label>
                                <div className="position-relative">
                                    <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                                    <input 
                                        type="text" 
                                        className="form-control border-0 bg-light ps-5 py-2 rounded-3 fw-bold shadow-none" 
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
                                        className="form-select border-0 bg-light ps-5 py-2 rounded-3 fw-bold shadow-none" 
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
                                    className="form-control border-0 bg-light py-2 rounded-3 fw-bold shadow-none" 
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="col-6 col-md-3 col-lg-2">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">End Date</label>
                                <input 
                                    type="date" 
                                    className="form-control border-0 bg-light py-2 rounded-3 fw-bold shadow-none" 
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light bg-opacity-50">
                                <tr>
                                    <th className="ps-4 py-3 border-0" style={{ width: '40px' }}>
                                        <div className="form-check m-0">
                                            <input 
                                                className="form-check-input shadow-none cursor-pointer" 
                                                type="checkbox" 
                                                checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length}
                                                ref={el => el && (el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredTransactions.length)}
                                                onChange={toggleSelectAll}
                                            />
                                        </div>
                                    </th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Date</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Description</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Category</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase text-end">Amount</th>
                                    <th className="pe-4 py-3 border-0 text-muted small fw-800 text-uppercase text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => {
                                    const isSelected = selectedIds.has(t.id);
                                    return (
                                        <tr key={t.id} onClick={() => handleOpenModal(t)} className={`border-bottom border-light transition-all cursor-pointer ${isSelected ? 'bg-primary bg-opacity-5' : ''}`}>
                                            <td className="ps-4 py-4" onClick={e => e.stopPropagation()}>
                                                <div className="form-check m-0">
                                                    <input 
                                                        className="form-check-input shadow-none cursor-pointer" 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={(e) => toggleSelectOne(e, t.id)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-4"><span className="text-muted fw-bold small">{formatDate(t.date)}</span></td>
                                            <td className="py-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className={`p-2 rounded-circle ${t.type === TransactionType.INCOME ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                                                        {t.type === TransactionType.INCOME ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                                                    </div>
                                                    <span className="fw-800 text-dark">{t.description}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="badge bg-light text-muted border px-2 py-1 rounded-pill fw-800" style={{fontSize: '0.65rem'}}>
                                                    {t.category?.name || 'Uncategorized'}
                                                </div>
                                            </td>
                                            <td className="py-4 text-end">
                                                <span className={`fw-900 fs-6 ${t.type === TransactionType.INCOME ? 'text-success' : 'text-black'}`}>
                                                    {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                                </span>
                                            </td>
                                            <td className="pe-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={(e) => handleDeleteOne(e, t.id)} className="btn btn-sm btn-white border-0 text-danger"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 animate-slide-up" style={{ zIndex: 1050 }}>
                    <div className="bg-black text-white px-4 py-3 rounded-pill shadow-lg d-flex align-items-center gap-4 border border-white border-opacity-10" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(0,0,0,0.85)' }}>
                        <div className="d-flex align-items-center gap-2 border-end border-white border-opacity-10 pe-4">
                            <CheckSquare size={18} className="text-primary" />
                            <span className="fw-900 small">{selectedIds.size} SELECTED</span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                            <button onClick={handleAnalyzeWithAI} className="btn btn-link text-primary p-0 fw-800 small text-decoration-none d-flex align-items-center gap-2">
                                <BrainCircuit size={18} /> ANALYZE DEDUCTIONS
                            </button>
                            <button onClick={handleBulkDelete} className="btn btn-link text-danger p-0 fw-800 small text-decoration-none d-flex align-items-center gap-2">
                                <Trash2 size={16} /> DELETE
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="btn btn-link text-white p-0 fw-800 small text-decoration-none opacity-50 ms-3">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Auditor Modal */}
            <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="AI Tax Auditor" size="lg">
                <div className="p-1">
                    {isAnalyzing ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mb-3" role="status"></div>
                            <h5 className="fw-900">Scanning for Deductions...</h5>
                            <p className="text-muted small">Gemini is analyzing your transaction descriptions against IRS rules.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="alert alert-primary bg-primary bg-opacity-5 border-0 rounded-4 p-4 d-flex gap-3 mb-4">
                                <Sparkles className="text-primary flex-shrink-0" size={24} />
                                <div>
                                    <h6 className="fw-900 text-black mb-1">Deduction Suggestions Found</h6>
                                    <p className="small mb-0 text-muted">The AI has identified potential tax-advantaged categories for your entries.</p>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table align-middle">
                                    <thead className="small fw-800 text-muted text-uppercase bg-light">
                                        <tr>
                                            <th>Transaction</th>
                                            <th>AI Recommendation</th>
                                            <th>Tax Strategy Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aiResults.map(res => {
                                            const t = transactions.find(x => x.id === res.id);
                                            return (
                                                <tr key={res.id}>
                                                    <td>
                                                        <span className="fw-bold d-block">{t?.description}</span>
                                                        <small className="text-muted">{formatCurrency(t?.amount || 0)}</small>
                                                    </td>
                                                    <td>
                                                        <div className="badge bg-success bg-opacity-10 text-success border-0 px-3 py-2 rounded-pill fw-900" style={{fontSize: '0.7rem'}}>
                                                            {res.suggestedCategory}
                                                        </div>
                                                    </td>
                                                    <td className="small text-muted">{res.reason}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

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
                            <input type="date" className="form-control bg-light border-0 fw-bold shadow-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Amount ($)</label>
                            <input type="number" step="0.01" className="form-control bg-light border-0 fw-bold shadow-none" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} required />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Description / Vendor</label>
                        <input type="text" className="form-control bg-light border-0 fw-bold shadow-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="e.g. Loves Travel Stop" />
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">Account</label>
                        <select className="form-select bg-light border-0 fw-bold shadow-none" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} required>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">Category (Optional)</label>
                        <select className="form-select bg-light border-0 fw-bold shadow-none" value={formData.category?.id || ''} onChange={e => {
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

                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg">
                        <Save size={18} className="me-2" /> {editingTransaction ? 'Update Ledger' : 'Commit to Ledger'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
