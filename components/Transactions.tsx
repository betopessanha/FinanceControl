
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId, downloadImportTemplate } from '../lib/utils';
import { 
    PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, 
    Sparkles, FileText, Check, AlertCircle, ArrowRight, Download, Upload, 
    FileJson, Info, ArrowUpRight, ArrowDownRight, Tag, ArrowRightLeft, 
    X, Filter, CheckSquare, Square, Trash, BrainCircuit, Zap, RefreshCw, CheckCircle2,
    AlertTriangle, FileType
} from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';
import { GoogleGenAI, Type } from "@google/genai";

// Removed local AIStudio interface and window extension as they conflict with global types

interface AISuggestion {
    id: string;
    suggestedCategoryId: string;
    suggestedCategoryName: string;
    reason: string;
    confidence: number;
    advantage: string;
}

interface ExtractedTransaction {
    date: string;
    description: string;
    amount: number;
    type: TransactionType;
    suggestedCategoryId?: string;
    suggestedCategoryName?: string;
}

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

    // Bulk selection state for auditing existing entries
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [aiResults, setAiResults] = useState<AISuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

    // Import State
    const [importStep, setImportStep] = useState<'input' | 'preview'>('input');
    const [importRawText, setImportRawText] = useState('');
    const [importAccountId, setImportAccountId] = useState('');
    const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
    const [isImporting, setIsImporting] = useState(false);

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
        if (selectedIds.size === 0) return;
        
        setIsAnalyzing(true);
        setAiError(null);
        setIsAIModalOpen(true);
        setAppliedIds(new Set());
        setAiResults([]);

        const selectedTrans = transactions.filter(t => selectedIds.has(t.id));
        
        try {
            // Fix: Cast window to any for aistudio access to bypass declaration issues
            const win = window as any;
            if (!process.env.API_KEY && win.aistudio) {
                const hasKey = await win.aistudio.hasSelectedApiKey();
                if (!hasKey) await win.aistudio.openSelectKey();
            }
            if (!process.env.API_KEY) throw new Error("API Key is required.");

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const categoryList = categories.map(c => ({ id: c.id, name: c.name }));

            const prompt = `Analyze these transactions and suggest the best category for each.
            Categories: ${JSON.stringify(categoryList)}
            Transactions: ${JSON.stringify(selectedTrans)}`;

            const response = await ai.models.generateContent({
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
                                suggestedCategoryId: { type: Type.STRING },
                                suggestedCategoryName: { type: Type.STRING },
                                reason: { type: Type.STRING },
                                confidence: { type: Type.NUMBER },
                                advantage: { type: Type.STRING }
                            },
                            required: ['id', 'suggestedCategoryId', 'suggestedCategoryName', 'reason', 'confidence', 'advantage']
                        }
                    }
                }
            });

            const textOutput = response.text;
            if (!textOutput) throw new Error("AI returned an empty response.");
            setAiResults(JSON.parse(textOutput));
        } catch (e: any) {
            setAiError(e.message || "Failed to analyze.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImportAI = async () => {
        if (!importRawText || !importAccountId) return;
        
        setIsImporting(true);
        setAiError(null);
        
        try {
            // Fix: Cast window to any for aistudio access
            const win = window as any;
            if (!process.env.API_KEY && win.aistudio) {
                await win.aistudio.openSelectKey();
            }
            if (!process.env.API_KEY) throw new Error("API Key required.");

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const categoryList = categories.map(c => ({ id: c.id, name: c.name, type: c.type }));

            const prompt = `Extract financial transactions from this raw text (like a bank statement):
            "${importRawText}"
            
            Return a JSON array of objects.
            Map them to these categories if possible: ${JSON.stringify(categoryList)}
            
            Schema: [{ "date": "YYYY-MM-DD", "description": "vendor", "amount": 0.00, "type": "Income|Expense", "suggestedCategoryId": "cat_id", "suggestedCategoryName": "cat_name" }]`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING },
                                description: { type: Type.STRING },
                                amount: { type: Type.NUMBER },
                                type: { type: Type.STRING },
                                suggestedCategoryId: { type: Type.STRING },
                                suggestedCategoryName: { type: Type.STRING }
                            },
                            required: ['date', 'description', 'amount', 'type']
                        }
                    }
                }
            });

            const textOutput = response.text;
            if (!textOutput) throw new Error("Empty AI response.");
            const parsed = JSON.parse(textOutput);
            setExtractedTransactions(parsed);
            setImportStep('preview');
        } catch (e: any) {
            setAiError(e.message || "AI Extraction failed.");
        } finally {
            setIsImporting(false);
        }
    };

    const finalizeImport = async () => {
        setIsImporting(true);
        for (const ext of extractedTransactions) {
            const category = categories.find(c => c.id === ext.suggestedCategoryId);
            await addLocalTransaction({
                id: generateId(),
                date: ext.date,
                description: ext.description,
                amount: ext.amount,
                type: ext.type as TransactionType,
                accountId: importAccountId,
                category: category
            });
        }
        setIsImporting(false);
        setIsImportModalOpen(false);
        setImportStep('input');
        setImportRawText('');
        setExtractedTransactions([]);
    };

    const applySuggestion = async (suggestion: AISuggestion) => {
        const transaction = transactions.find(t => t.id === suggestion.id);
        const category = categories.find(c => c.id === suggestion.suggestedCategoryId);
        if (transaction && category) {
            await updateLocalTransaction({ ...transaction, category });
            setAppliedIds(prev => new Set(prev).add(suggestion.id));
        }
    };

    const applyAllSuggestions = async () => {
        setIsAnalyzing(true);
        for (const sug of aiResults) {
            if (!appliedIds.has(sug.id)) await applySuggestion(sug);
        }
        setIsAnalyzing(false);
        setTimeout(() => setIsAIModalOpen(false), 800);
    };

    const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Permanently delete this record?')) {
            await deleteLocalTransaction(id);
            const next = new Set(selectedIds);
            next.delete(id);
            setSelectedIds(next);
        }
    };

    const toggleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    };

    const handleBulkDelete = async () => {
        if (confirm(`Delete ${selectedIds.size} selected items?`)) {
            await deleteLocalTransactions(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="container-fluid py-2 animate-slide-up position-relative">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-900 tracking-tight text-black mb-1">Financial Ledger</h1>
                    <p className="text-muted mb-0 small">Audit trail for all business and personal accounts.</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={() => { setImportStep('input'); setIsImportModalOpen(true); }} className="btn btn-white border shadow-sm px-3 fw-bold d-flex align-items-center gap-2 rounded-3">
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
                                    <input type="text" className="form-control border-0 bg-light ps-5 py-2 rounded-3 fw-bold" placeholder="Vendor, category, etc..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="col-12 col-md-6 col-lg-3">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">Account</label>
                                <select className="form-select border-0 bg-light py-2 rounded-3 fw-bold" value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)}>
                                    <option value="">All Accounts</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="col-6 col-md-3 col-lg-2">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">Start Date</label>
                                <input type="date" className="form-control border-0 bg-light py-2 rounded-3 fw-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="col-6 col-md-3 col-lg-2">
                                <label className="form-label fw-800 small text-muted text-uppercase mb-2">End Date</label>
                                <input type="date" className="form-control border-0 bg-light py-2 rounded-3 fw-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 py-3 border-0" style={{ width: '40px' }}>
                                        <input className="form-check-input" type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredTransactions.length} ref={el => el && (el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredTransactions.length)} onChange={toggleSelectAll} />
                                    </th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Date</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Description</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Category</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase text-end">Amount</th>
                                    <th className="pe-4 py-3 border-0 text-muted small fw-800 text-uppercase text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} onClick={() => handleOpenModal(t)} className={`cursor-pointer ${selectedIds.has(t.id) ? 'bg-primary bg-opacity-5' : ''}`}>
                                        <td className="ps-4 py-4" onClick={e => e.stopPropagation()}>
                                            <input className="form-check-input" type="checkbox" checked={selectedIds.has(t.id)} onChange={(e) => toggleSelectOne(e, t.id)} />
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
                                                {formatCurrency(t.amount)}
                                            </span>
                                        </td>
                                        <td className="pe-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                            <button onClick={(e) => handleDeleteOne(e, t.id)} className="btn btn-sm text-danger"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 animate-slide-up" style={{ zIndex: 1050 }}>
                    <div className="bg-black text-white px-4 py-3 rounded-pill shadow-lg d-flex align-items-center gap-4 border border-white border-opacity-10">
                        <span className="fw-900 small border-end border-white border-opacity-10 pe-4">{selectedIds.size} SELECTED</span>
                        <button onClick={handleAnalyzeWithAI} className="btn btn-link text-primary p-0 fw-800 small text-decoration-none d-flex align-items-center gap-2">
                            <Zap size={18} /> ANALYZE DEDUCTIONS
                        </button>
                        <button onClick={handleBulkDelete} className="btn btn-link text-danger p-0 fw-800 small text-decoration-none d-flex align-items-center gap-2">
                            <Trash2 size={16} /> DELETE
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Import Modal */}
            <Modal isOpen={isImportModalOpen} onClose={() => !isImporting && setIsImportModalOpen(false)} title="AI Transaction Importer" size="lg">
                <div className="p-1">
                    {importStep === 'input' ? (
                        <div>
                            <p className="text-muted small mb-4">Paste your bank statement text or raw transaction data below. Gemini AI will automatically extract entries and suggest categories.</p>
                            
                            <div className="mb-3">
                                <label className="form-label fw-bold small text-muted text-uppercase">1. Target Account</label>
                                <select className="form-select border shadow-sm rounded-3 fw-bold" value={importAccountId} onChange={e => setImportAccountId(e.target.value)}>
                                    <option value="">Select Account for these entries...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted text-uppercase">2. Raw Statement Text</label>
                                <textarea 
                                    className="form-control border shadow-sm rounded-4 p-3 bg-light" 
                                    rows={8} 
                                    placeholder="Paste text here... e.g. 05/12 LOVES TRAVEL STOP #312 - $452.12"
                                    value={importRawText}
                                    onChange={e => setImportRawText(e.target.value)}
                                ></textarea>
                            </div>

                            <button 
                                onClick={handleImportAI}
                                disabled={isImporting || !importRawText || !importAccountId}
                                className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg d-flex align-items-center justify-content-center gap-2"
                            >
                                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-primary" />}
                                {isImporting ? "Analyzing Statement..." : "Analyze with Smart AI"}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className="alert alert-success bg-success bg-opacity-5 border-0 rounded-4 p-4 d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex gap-3">
                                    <CheckCircle2 className="text-success" size={24} />
                                    <div>
                                        <h6 className="fw-900 text-black mb-0">Extraction Successful</h6>
                                        <p className="small mb-0 text-muted">Found {extractedTransactions.length} entries to import into <strong>{accounts.find(a => a.id === importAccountId)?.name}</strong>.</p>
                                    </div>
                                </div>
                                <button onClick={finalizeImport} disabled={isImporting} className="btn btn-success px-4 fw-900 rounded-3">
                                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : 'Commit to Ledger'}
                                </button>
                            </div>

                            <div className="table-responsive rounded-4 border">
                                <table className="table align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4 py-3 small fw-800 text-muted">DATE</th>
                                            <th className="py-3 small fw-800 text-muted">VENDOR</th>
                                            <th className="py-3 small fw-800 text-muted">CATEGORY</th>
                                            <th className="pe-4 py-3 small fw-800 text-muted text-end">AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extractedTransactions.map((ext, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-4 py-3 small fw-bold">{ext.date}</td>
                                                <td className="py-3 fw-bold">{ext.description}</td>
                                                <td className="py-3">
                                                    <span className="badge bg-primary bg-opacity-10 text-primary border-0 rounded-pill px-2">
                                                        {ext.suggestedCategoryName || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="pe-4 py-3 text-end fw-900">
                                                    <span className={ext.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}>
                                                        {formatCurrency(ext.amount)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-center">
                                <button onClick={() => setImportStep('input')} className="btn btn-link text-muted fw-bold text-decoration-none">← Go Back / Edit Text</button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Existing AI Auditor Modal */}
            <Modal isOpen={isAIModalOpen} onClose={() => !isAnalyzing && setIsAIModalOpen(false)} title="Tax Auditor Suggestion" size="lg">
                <div className="p-1">
                    {isAnalyzing ? (
                        <div className="text-center py-5">
                            <Loader2 size={40} className="animate-spin text-primary mb-3" />
                            <h5 className="fw-900">Analyzing Deductions...</h5>
                        </div>
                    ) : aiError ? (
                        <div className="text-center py-5">
                            <AlertCircle size={48} className="text-danger mb-3" />
                            <p>{aiError}</p>
                            <button onClick={handleAnalyzeWithAI} className="btn btn-primary">Retry</button>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3 overflow-auto pr-2" style={{ maxHeight: '60vh' }}>
                            {aiResults.map(res => {
                                const t = transactions.find(x => x.id === res.id);
                                if (!t) return null;
                                return (
                                    <div key={res.id} className="card border rounded-4 p-4 shadow-sm">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h6 className="fw-900 mb-1">{t.description}</h6>
                                                <span className="text-muted small">Current: {t.category?.name || 'Uncategorized'}</span>
                                            </div>
                                            <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-900">{res.advantage}</div>
                                        </div>
                                        <div className="bg-light p-3 rounded-3 mb-3 d-flex align-items-center justify-content-between">
                                            <div className="small fw-bold">AI RECOMMENDS: <span className="text-primary">{res.suggestedCategoryName}</span></div>
                                            <button onClick={() => applySuggestion(res)} disabled={appliedIds.has(res.id)} className={`btn btn-sm ${appliedIds.has(res.id) ? 'btn-success' : 'btn-black'}`}>
                                                {appliedIds.has(res.id) ? 'Applied' : 'Accept'}
                                            </button>
                                        </div>
                                        <p className="small italic text-muted mb-0">"{res.reason}"</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {!isAnalyzing && aiResults.length > 0 && (
                        <button onClick={applyAllSuggestions} className="btn btn-primary w-100 mt-4 py-3 fw-bold">Apply All Suggestions</button>
                    )}
                </div>
            </Modal>

            {/* Entry Form Modal */}
            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingTransaction ? "Edit Record" : "New Transaction"}>
                <form onSubmit={handleSaveTransaction}>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase">Record Type</label>
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
