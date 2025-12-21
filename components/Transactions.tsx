
import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV } from '../lib/utils';
import { PlusCircle, Search, Filter, MoreHorizontal, ArrowDownCircle, ArrowUpCircle, Paperclip, Upload, X, Edit2, Sparkles, Loader2, Calendar, Wallet, ArrowRightLeft, ArrowRight, FileSpreadsheet, Check, UploadCloud, AlertTriangle, Trash2, Save, FileClock, CheckCircle2, ArrowDown, ArrowUp, Info, Download, ChevronRight } from 'lucide-react';
import Modal from './ui/Modal';
import { GoogleGenAI, Type } from "@google/genai";
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';

// --- Sub-components ---

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id'>, id?: string) => void;
  onDelete?: (id: string) => void;
  initialData: Transaction | null;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const { categories, accounts, trucks } = useData();
    
    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [truckId, setTruckId] = useState('');
    const [receipts, setReceipts] = useState<string[]>([]);

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setDate(new Date(initialData.date).toISOString().split('T')[0]);
            setDescription(initialData.description);
            setAmount(initialData.amount.toString());
            setType(initialData.type);
            setCategoryId(initialData.category?.id || '');
            setAccountId(initialData.accountId);
            setToAccountId(initialData.toAccountId || '');
            setTruckId(initialData.truck?.id || '');
            setReceipts(initialData.receipts || []);
        } else {
            // Defaults
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setAmount('');
            setType(TransactionType.EXPENSE);
            setCategoryId('');
            setAccountId(accounts[0]?.id || '');
            setToAccountId('');
            setTruckId('');
            setReceipts([]);
        }
        setAiSuggestion(null);
    }, [initialData, isOpen, accounts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        
        const category = categories.find(c => c.id === categoryId);
        const truck = trucks.find(t => t.id === truckId);

        const data: Omit<Transaction, 'id'> = {
            date: new Date(date).toISOString(),
            description,
            amount: numAmount,
            type,
            accountId,
            toAccountId: type === TransactionType.TRANSFER ? toAccountId : undefined,
            category: type !== TransactionType.TRANSFER ? category : undefined,
            truck: type !== TransactionType.TRANSFER ? truck : undefined,
            receipts
        };

        onSave(data, initialData?.id);
    };

    const handleDelete = () => {
        if (initialData && onDelete) {
            if (window.confirm("Are you sure you want to delete this transaction?")) {
                onDelete(initialData.id);
            }
        }
    };

    const handleAiCategorize = async () => {
        if (!description.trim()) {
            alert("Please enter a description first.");
            return;
        }
        
        setIsAnalyzing(true);
        setAiSuggestion(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const availableCategories = categories.filter(c => c.type === type);
            const categoryNames = availableCategories.map(c => c.name);

            const prompt = `Assign description: "${description}" to one of: ${JSON.stringify(categoryNames)}. Return exact category name in JSON.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            categoryName: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            if (result.categoryName) {
                const match = availableCategories.find(c => c.name.toLowerCase() === result.categoryName.toLowerCase());
                if (match) {
                    setCategoryId(match.id);
                    setAiSuggestion(`AI Suggestion: ${match.name}`);
                }
            }
        } catch (error) {
            console.error("AI Error:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredCategories = categories.filter(c => c.type === type);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? "Edit Transaction" : "New Transaction"}
            size="lg"
        >
            <form onSubmit={handleSubmit}>
                <div className="row g-3">
                    <div className="col-12">
                        <label className="form-label fw-bold small text-muted">Type</label>
                        <div className="d-flex gap-2">
                            {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER].map(t => (
                                <button key={t} type="button" onClick={() => setType(t)} className={`btn flex-fill ${type === t ? 'btn-dark' : 'btn-light border'}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Date</label>
                        <input type="date" className="form-control shadow-sm" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Amount</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input type="number" className="form-control shadow-sm" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" required />
                        </div>
                    </div>

                    <div className="col-12">
                        <label className="form-label fw-bold small text-muted">Description</label>
                        <div className="input-group">
                            <input type="text" className="form-control shadow-sm" value={description} onChange={e => setDescription(e.target.value)} required />
                            {type !== TransactionType.TRANSFER && (
                                <button type="button" className="btn btn-outline-primary" onClick={handleAiCategorize} disabled={isAnalyzing || !description}>
                                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                </button>
                            )}
                        </div>
                        {aiSuggestion && <div className="form-text text-info small mt-1">{aiSuggestion}</div>}
                    </div>

                    {type === TransactionType.TRANSFER ? (
                        <>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">From</label>
                                <select className="form-select shadow-sm" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                                    <option value="">Select Account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">To</label>
                                <select className="form-select shadow-sm" value={toAccountId} onChange={e => setToAccountId(e.target.value)} required>
                                    <option value="">Select Account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Category</label>
                                <select className="form-select shadow-sm" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                                    <option value="">Select...</option>
                                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Account</label>
                                <select className="form-select shadow-sm" value={accountId} onChange={e => setAccountId(e.target.value)} required>
                                    <option value="">Select...</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="d-flex flex-column-reverse flex-md-row justify-content-between gap-2 mt-4 pt-3 border-top">
                    {initialData && onDelete && <button type="button" onClick={handleDelete} className="btn btn-danger bg-opacity-10 text-danger border-0 py-2">Delete Transaction</button>}
                    <div className="d-flex gap-2 ms-md-auto">
                        <button type="button" onClick={onClose} className="btn btn-light border flex-fill flex-md-grow-0">Cancel</button>
                        <button type="submit" className="btn btn-primary flex-fill flex-md-grow-0">Save Entry</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

const Transactions: React.FC = () => {
    const { 
        transactions, accounts, loading, 
        reportFilter, setReportFilter,
        addLocalTransaction, updateLocalTransaction, deleteLocalTransaction
    } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>('All');
    const [selectedAccount, setSelectedAccount] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterCategories, setFilterCategories] = useState<string[] | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    useEffect(() => {
        if (reportFilter) {
            setSelectedYear(reportFilter.year);
            setFilterCategories(reportFilter.categoryNames);
        } else {
            setFilterCategories(null);
        }
    }, [reportFilter]);

    const handleSaveTransaction = async (transactionData: Omit<Transaction, 'id'>, id?: string) => {
        const fullTransactionObj: Transaction = { id: id || `temp-${Date.now()}`, ...transactionData };
        if (id) await updateLocalTransaction(fullTransactionObj);
        else await addLocalTransaction(fullTransactionObj);
        setIsFormModalOpen(false);
        setEditingTransaction(null);
    };

    const handleTransactionDelete = async (id: string) => {
        await deleteLocalTransaction(id);
        setIsFormModalOpen(false);
        setEditingTransaction(null);
    };

    const filteredTransactions = transactions
        .filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesYear = selectedYear === 'All' || new Date(t.date).getFullYear().toString() === selectedYear;
            const matchesAccount = selectedAccount === 'All' || t.accountId === selectedAccount || t.toAccountId === selectedAccount;
            let matchesReportCategory = true;
            if (filterCategories) {
                matchesReportCategory = filterCategories.includes(t.category?.name || 'Uncategorized');
            }
            return matchesSearch && matchesYear && matchesAccount && matchesReportCategory;
        })
        .sort((a, b) => {
            const dA = new Date(a.date).valueOf();
            const dB = new Date(b.date).valueOf();
            return sortOrder === 'desc' ? dB - dA : dA - dB;
        });

    const exportData = useMemo(() => filteredTransactions.map(t => ({
        Date: t.date.split('T')[0],
        Description: t.description,
        Category: t.category?.name || 'Transfer',
        Type: t.type,
        Account: accounts.find(a => a.id === t.accountId)?.name || 'Unknown',
        Amount: t.amount,
        Truck: t.truck?.unitNumber || ''
    })), [filteredTransactions, accounts]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(filteredTransactions.map(t => t.id));
        else setSelectedIds([]);
    };

    const handleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    if (loading) return <div className="text-center py-5"><Loader2 className="animate-spin text-primary" size={32}/></div>;

    const isAllSelected = filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredTransactions.length;

    return (
        <div className="mb-5 animate-slide-up">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-800 text-dark mb-1">Ledger & Ledger</h2>
                  <p className="text-muted mb-0">Manage all fleet financial recordings.</p>
                </div>
            </div>
            
            <Card>
                <CardContent className="p-3 p-md-4">
                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-stretch align-items-lg-center mb-4 gap-3">
                        <div className="flex-grow-1" style={{ maxWidth: '350px' }}>
                            <div className="position-relative d-print-none">
                                <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                                <input type="text" placeholder="Search description..." className="form-control ps-5 rounded-pill bg-light border-0 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="d-flex flex-wrap gap-2 justify-content-end align-items-center d-print-none">
                             <ExportMenu data={exportData} filename="transactions" />
                             <button onClick={() => setIsFormModalOpen(true)} className="btn btn-black d-flex align-items-center shadow-lg rounded-pill px-4">
                                <PlusCircle size={18} className="me-2" />Add Entry
                             </button>
                        </div>
                    </div>

                    {/* Desktop View */}
                    <div className="desktop-table-view table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3 d-print-none" style={{width: '40px'}}><input type="checkbox" className="form-check-input" checked={isAllSelected} ref={input => { if (input) input.indeterminate = isIndeterminate; }} onChange={handleSelectAll} /></th>
                                    <th className="text-secondary small text-uppercase py-3 cursor-pointer" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>Date</th>
                                    <th className="text-secondary small text-uppercase py-3">Description</th>
                                    <th className="text-secondary small text-uppercase py-3">Category</th>
                                    <th className="text-secondary small text-uppercase py-3 text-end">Amount</th>
                                    <th className="text-secondary small text-uppercase py-3 text-center d-print-none">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id}>
                                        <td className="ps-3 d-print-none"><input type="checkbox" className="form-check-input" checked={selectedIds.includes(t.id)} onChange={() => handleSelectRow(t.id)} /></td>
                                        <td className="text-muted small">{formatDate(t.date)}</td>
                                        <td className="fw-bold text-dark">{t.description}</td>
                                        <td><span className={`badge rounded-pill ${t.type === 'Income' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>{t.category?.name || 'Transfer'}</span></td>
                                        <td className={`text-end fw-800 ${t.type === 'Income' ? 'text-success' : 'text-danger'}`}>{formatCurrency(t.amount)}</td>
                                        <td className="text-center d-print-none">
                                            <button onClick={() => { setEditingTransaction(t); setIsFormModalOpen(true); }} className="btn btn-light btn-sm border rounded-pill"><Edit2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card List */}
                    <div className="mobile-card-list">
                        {filteredTransactions.map(t => (
                            <div key={t.id} className="card border-0 bg-subtle p-3 shadow-sm" onClick={() => { setEditingTransaction(t); setIsFormModalOpen(true); }}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className={`p-2 rounded-circle ${t.type === 'Income' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                                            {t.type === 'Income' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        </div>
                                        <div>
                                            <h6 className="mb-0 fw-800 text-dark">{t.description}</h6>
                                            <small className="text-muted">{formatDate(t.date)}</small>
                                        </div>
                                    </div>
                                    <div className={`fw-800 ${t.type === 'Income' ? 'text-success' : 'text-danger'}`}>
                                        {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-dark border-opacity-10">
                                    <span className="badge bg-white text-muted border small px-3 rounded-pill">{t.category?.name || 'Transfer'}</span>
                                    <ChevronRight size={16} className="text-muted" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <TransactionFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} onSave={handleSaveTransaction} onDelete={handleTransactionDelete} initialData={editingTransaction} />
        </div>
    );
};

export default Transactions;
