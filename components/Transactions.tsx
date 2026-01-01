
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId, downloadImportTemplate } from '../lib/utils';
import { 
    PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, 
    Sparkles, FileText, Check, AlertCircle, ArrowRight, Download, Upload, 
    FileJson, Info, ArrowUpRight, ArrowDownRight, Tag, ArrowRightLeft, 
    X, Filter, CheckSquare, Square, Trash, BrainCircuit, Zap, RefreshCw, CheckCircle2,
    AlertTriangle, FileType, Key, FileUp, ClipboardText, Cpu, Activity, Brain
} from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';
import { GoogleGenAI, Type } from "@google/genai";

interface AISuggestion {
    id: string;
    suggestedCategoryId: string;
    suggestedCategoryName: string;
    reason: string;
    confidence: number;
    advantage: string;
}

interface ExtractedTransaction {
    tempId: string;
    date: string;
    description: string;
    amount: number;
    type: string; // 'Income' | 'Expense' | 'Transfer'
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
    const [importValidationError, setImportValidationError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [aiStatusMsg, setAiStatusMsg] = useState('Initializing Neural Engine...');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const callAI = async (prompt: string, schema: any, modelName: string = 'gemini-3-flash-preview') => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            if (!response.text) throw new Error("AI returned an empty response.");
            return JSON.parse(response.text);
        } catch (error: any) {
            // Robust error handling as per guidelines
            if (error.message?.includes("Requested entity was not found") || error.message?.includes("API_KEY")) {
                const win = window as any;
                if (win.aistudio) {
                    await win.aistudio.openSelectKey();
                }
                throw new Error("API Key session missing or expired. Please ensure process.env.API_KEY is configured in Vercel or your local environment.");
            }
            throw error;
        }
    };

    const handleAnalyzeWithAI = async () => {
        if (selectedIds.size === 0) return;
        
        setIsAnalyzing(true);
        setAiError(null);
        setIsAIModalOpen(true);
        setAppliedIds(new Set());
        setAiResults([]);

        const selectedTrans = transactions.filter(t => selectedIds.has(t.id));
        const categoryList = categories.map(c => ({ id: c.id, name: c.name }));

        const prompt = `Analise estas transações contábeis de transporte e sugira a melhor categoria baseada no Schedule C (USA). 
        Retorne um JSON array de sugestões.
        Categorias disponíveis: ${JSON.stringify(categoryList)}
        Transações para analisar: ${JSON.stringify(selectedTrans.map(t => ({ id: t.id, desc: t.description, amount: t.amount, currentCat: t.category?.name })))}`;

        const schema = {
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
        };

        try {
            const results = await callAI(prompt, schema);
            setAiResults(results);
        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setImportValidationError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setImportRawText(content);
        };
        reader.onerror = () => {
            setImportValidationError("Failed to read the file. Please try again.");
        };
        reader.readAsText(file);
    };

    const handleImportAI = async () => {
        setImportValidationError(null);
        if (!importRawText.trim()) {
            setImportValidationError("Please paste some text or upload a file from your statement.");
            return;
        }
        if (!importAccountId) {
            setImportValidationError("Please select a target account for these transactions.");
            return;
        }
        
        setIsImporting(true);
        setAiError(null);
        
        const statusSteps = [
            "Initializing Neural Engine...",
            "Decrypting Statement Text...",
            "Scanning for Patterns...",
            "Validating against IRS Schedule C...",
            "Formatting Output Ledger..."
        ];
        let stepIdx = 0;
        const statusInterval = setInterval(() => {
            if (stepIdx < statusSteps.length - 1) {
                stepIdx++;
                setAiStatusMsg(statusSteps[stepIdx]);
            }
        }, 1200);
        
        const categoryList = categories.map(c => ({ id: c.id, name: c.name, type: c.type }));
        const prompt = `Extract all financial transactions from this raw text (it could be a CSV or a bank statement log):
        "${importRawText}"
        
        Act as a professional accountant for a trucking company. Map descriptions to categories like Fuel, Tolls, Freight Revenue, etc.
        Return a JSON array of objects.
        Map them to these system categories if possible: ${JSON.stringify(categoryList)}
        
        Schema rule:
        - date: YYYY-MM-DD format
        - amount: positive number
        - type: must be either "Income" or "Expense"
        - suggestedCategoryId: from the provided list
        - suggestedCategoryName: from the provided list`;

        const schema = {
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
        };

        try {
            const results = await callAI(prompt, schema, 'gemini-3-pro-preview');
            const mapped = results.map((r: any) => ({ ...r, tempId: generateId() }));
            setExtractedTransactions(mapped);
            setImportStep('preview');
        } catch (e: any) {
            setAiError(e.message);
        } finally {
            clearInterval(statusInterval);
            setIsImporting(false);
        }
    };

    const updateExtractedItem = (tempId: string, field: keyof ExtractedTransaction, value: any) => {
        setExtractedTransactions(prev => prev.map(item => {
            if (item.tempId === tempId) {
                const updated = { ...item, [field]: value };
                if (field === 'suggestedCategoryId') {
                    const cat = categories.find(c => c.id === value);
                    updated.suggestedCategoryName = cat?.name || '';
                }
                return updated;
            }
            return item;
        }));
    };

    const removeExtractedItem = (tempId: string) => {
        setExtractedTransactions(prev => prev.filter(item => item.tempId !== tempId));
    };

    const finalizeImport = async () => {
        setIsImporting(true);
        try {
            for (const ext of extractedTransactions) {
                const category = categories.find(c => c.id === ext.suggestedCategoryId);
                await addLocalTransaction({
                    id: generateId(),
                    date: ext.date,
                    description: ext.description,
                    amount: ext.amount,
                    type: ext.type === 'Income' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    accountId: importAccountId,
                    category: category
                });
            }
            setIsImportModalOpen(false);
            setImportStep('input');
            setImportRawText('');
            setFileName(null);
            setExtractedTransactions([]);
        } catch (e) {
            console.error("Failed to commit import:", e);
        } finally {
            setIsImporting(false);
        }
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
        if (confirm('Excluir este registro permanentemente?')) {
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
        if (confirm(`Excluir ${selectedIds.size} itens selecionados?`)) {
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
                    <button onClick={() => { setImportStep('input'); setIsImportModalOpen(true); setImportValidationError(null); setFileName(null); setImportRawText(''); }} className="btn btn-white border shadow-sm px-3 fw-bold d-flex align-items-center gap-2 rounded-3">
                        <Upload size={18} className="text-primary" /> Import Records
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
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase">Account</th>
                                    <th className="py-3 border-0 text-muted small fw-800 text-uppercase text-end">Amount</th>
                                    <th className="pe-4 py-3 border-0 text-muted small fw-800 text-uppercase text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-bottom border-light" onClick={() => handleOpenModal(t)} style={{ cursor: 'pointer' }}>
                                        <td className="ps-4 py-3 border-0" onClick={e => e.stopPropagation()}>
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                checked={selectedIds.has(t.id)} 
                                                onChange={e => toggleSelectOne(e, t.id)} 
                                            />
                                        </td>
                                        <td className="py-3 border-0 text-muted small">{formatDate(t.date)}</td>
                                        <td className="py-3 border-0">
                                            <div className="fw-bold text-dark">{t.description}</div>
                                        </td>
                                        <td className="py-3 border-0">
                                            <span className={`badge bg-light text-dark border fw-normal`}>
                                                {t.category?.name || (t.type === TransactionType.TRANSFER ? 'Transfer' : 'Uncategorized')}
                                            </span>
                                        </td>
                                        <td className="py-3 border-0 text-muted small">
                                            {accounts.find(a => a.id === t.accountId)?.name || 'Unknown'}
                                            {t.toAccountId && (
                                                <div className="d-flex align-items-center gap-1 mt-1" style={{fontSize: '0.65rem'}}>
                                                    <ArrowRight size={10} className="text-primary"/>
                                                    <span className="fw-bold text-primary">{accounts.find(a => a.id === t.toAccountId)?.name}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className={`py-3 border-0 text-end fw-bold ${t.type === TransactionType.INCOME ? 'text-success' : (t.type === TransactionType.TRANSFER ? 'text-primary' : 'text-danger')}`}>
                                            {t.type === TransactionType.INCOME ? '+' : (t.type === TransactionType.TRANSFER ? '±' : '-')}{formatCurrency(t.amount)}
                                        </td>
                                        <td className="pe-4 py-3 border-0 text-end" onClick={e => e.stopPropagation()}>
                                            <div className="btn-group">
                                                <button className="btn btn-sm btn-white border-0" onClick={() => handleOpenModal(t)}><Edit2 size={16} className="text-muted"/></button>
                                                <button className="btn btn-sm btn-white border-0 text-danger" onClick={(e) => handleDeleteOne(e, t.id)}><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-muted">
                                            No transactions found matching your criteria.
                                        </td>
                                    </tr>
                                ) }
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
            <Modal isOpen={isImportModalOpen} onClose={() => !isImporting && setIsImportModalOpen(false)} title="AI Transaction Importer" size="xl">
                <div className="p-1">
                    {isImporting && importStep === 'input' ? (
                        <div className="text-center py-5 ai-scanner">
                            <div className="ai-float mb-5">
                                <div className="bg-primary bg-opacity-10 d-inline-flex p-4 rounded-circle ai-core-pulse border border-primary border-opacity-20 shadow-lg">
                                    <Brain size={64} className="text-primary" />
                                </div>
                            </div>
                            <h3 className="fw-900 text-black tracking-tight mb-2">Neural Engine Processing</h3>
                            <div className="status-fader text-primary fw-800 small text-uppercase ls-1 mb-5">
                                {aiStatusMsg}
                            </div>
                            <div className="container" style={{maxWidth: '400px'}}>
                                <div className="progress bg-light rounded-pill mb-3" style={{height: '6px'}}>
                                    <div className="progress-bar bg-primary rounded-pill progress-bar-striped progress-bar-animated" style={{width: '75%'}}></div>
                                </div>
                            </div>
                        </div>
                    ) : importStep === 'input' ? (
                        <div className="animate-slide-up">
                            <p className="text-muted small mb-4">Choose a file (CSV/TXT) or paste your statement text. Gemini AI will handle the parsing and categorization for you.</p>
                            
                            {importValidationError && (
                                <div className="alert alert-danger py-2 px-3 border-0 small d-flex align-items-center gap-2 mb-3 rounded-3">
                                    <AlertCircle size={16} /> {importValidationError}
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted text-uppercase">1. Target Account</label>
                                <select className="form-select border shadow-sm rounded-3 fw-bold" value={importAccountId} onChange={e => setImportAccountId(e.target.value)}>
                                    <option value="">Select Account for these entries...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>)}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted text-uppercase d-flex justify-content-between">
                                    <span>2. Load Data</span>
                                    <span className="text-primary text-decoration-none cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <FileUp size={14} className="me-1" /> {fileName ? 'Change File' : 'Upload File'}
                                    </span>
                                </label>
                                <input type="file" ref={fileInputRef} className="d-none" accept=".csv,.txt,.log" onChange={handleFileChange} />
                                
                                {fileName ? (
                                    <div className="p-4 bg-primary bg-opacity-5 rounded-4 border border-primary border-opacity-10 d-flex align-items-center justify-content-between mb-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <FileText className="text-primary" size={24} />
                                            <div>
                                                <div className="fw-800 text-dark small">{fileName}</div>
                                                <div className="text-muted small" style={{fontSize: '0.65rem'}}>Ready to process</div>
                                            </div>
                                        </div>
                                        <button className="btn btn-sm text-danger" onClick={() => {setFileName(null); setImportRawText(''); if(fileInputRef.current) fileInputRef.current.value = '';}}><X size={16} /></button>
                                    </div>
                                ) : (
                                    <textarea className="form-control border shadow-sm rounded-4 p-3 bg-light" rows={6} placeholder="Paste text here..." value={importRawText} onChange={e => setImportRawText(e.target.value)}></textarea>
                                )}
                            </div>

                            <button onClick={handleImportAI} disabled={isImporting || (!importRawText && !fileName) || !importAccountId} className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg d-flex align-items-center justify-content-center gap-2">
                                <Sparkles size={18} className="text-primary" /> Analyze with Smart AI
                            </button>
                        </div>
                    ) : (
                        <div className="animate-slide-up">
                            <div className="alert alert-success bg-success bg-opacity-5 border-0 rounded-4 p-4 d-flex justify-content-between align-items-center mb-4">
                                <div className="d-flex gap-3">
                                    <CheckCircle2 className="text-success" size={24} />
                                    <div>
                                        <h6 className="fw-900 text-black mb-0">Extraction Successful</h6>
                                        <p className="small mb-0 text-muted">Review entries before final commit.</p>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button onClick={() => setImportStep('input')} className="btn btn-white border px-3 fw-bold rounded-3">Cancel</button>
                                    <button onClick={finalizeImport} disabled={isImporting} className="btn btn-success px-4 fw-900 rounded-3 shadow-sm">
                                        {isImporting ? <Loader2 size={16} className="animate-spin" /> : 'Commit to Ledger'}
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive rounded-4 border bg-white shadow-sm" style={{maxHeight: '500px'}}>
                                <table className="table align-middle mb-0">
                                    <thead className="bg-light sticky-top">
                                        <tr>
                                            <th className="ps-4 py-3 small fw-800 text-muted">DATE</th>
                                            <th className="py-3 small fw-800 text-muted">DESCRIPTION</th>
                                            <th className="py-3 small fw-800 text-muted" style={{width: '250px'}}>CATEGORY</th>
                                            <th className="py-3 small fw-800 text-muted text-end" style={{width: '180px'}}>AMOUNT ($)</th>
                                            <th className="pe-4 py-3 small fw-800 text-muted text-center" style={{width: '60px'}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extractedTransactions.map((ext) => (
                                            <tr key={ext.tempId}>
                                                <td className="ps-4 py-2">
                                                    <input type="date" className="form-control form-control-sm border-0 bg-transparent fw-bold" value={ext.date} onChange={(e) => updateExtractedItem(ext.tempId, 'date', e.target.value)} />
                                                </td>
                                                <td className="py-2">
                                                    <input type="text" className="form-control form-control-sm border-0 bg-transparent fw-bold" value={ext.description} onChange={(e) => updateExtractedItem(ext.tempId, 'description', e.target.value)} />
                                                </td>
                                                <td className="py-2">
                                                    <select className="form-select form-select-sm border-0 bg-transparent fw-bold text-primary" value={ext.suggestedCategoryId || ''} onChange={(e) => updateExtractedItem(ext.tempId, 'suggestedCategoryId', e.target.value)}>
                                                        <option value="">Select Category...</option>
                                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="py-2 text-end">
                                                    <input type="number" step="0.01" className="form-control form-control-sm border-0 bg-transparent text-end fw-900" value={ext.amount} onChange={(e) => updateExtractedItem(ext.tempId, 'amount', parseFloat(e.target.value) || 0)} />
                                                </td>
                                                <td className="pe-4 py-2 text-center">
                                                    <button onClick={() => removeExtractedItem(ext.tempId)} className="btn btn-sm text-danger p-0"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* AI Auditor Modal */}
            <Modal isOpen={isAIModalOpen} onClose={() => !isAnalyzing && setIsAIModalOpen(false)} title="Tax Auditor Suggestion" size="lg">
                <div className="p-1">
                    {isAnalyzing ? (
                        <div className="text-center py-5 ai-scanner">
                            <div className="ai-core-pulse d-inline-block p-4 rounded-circle bg-primary bg-opacity-10 mb-4">
                                <Activity size={48} className="text-primary" />
                            </div>
                            <h5 className="fw-900">Analyzing Deductions...</h5>
                        </div>
                    ) : aiError ? (
                        <div className="text-center py-5">
                            <AlertCircle size={48} className="text-danger mb-3" />
                            <h5 className="fw-900 text-danger">AI Action Required</h5>
                            <p className="text-muted small mb-4">{aiError}</p>
                            <div className="d-flex justify-content-center gap-2">
                                <button onClick={handleAnalyzeWithAI} className="btn btn-primary px-4 fw-bold rounded-3">Try Again</button>
                                <button onClick={() => (window as any).aistudio?.openSelectKey()} className="btn btn-white border px-4 fw-bold rounded-3 d-flex align-items-center gap-2">
                                    <Key size={16}/> Select Key
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="d-flex flex-column gap-3 overflow-auto pr-2" style={{ maxHeight: '60vh' }}>
                                {aiResults.map(res => {
                                    const t = transactions.find(x => x.id === res.id);
                                    if (!t) return null;
                                    return (
                                        <div key={res.id} className={`card border rounded-4 p-4 shadow-sm transition-all ${appliedIds.has(res.id) ? 'bg-success bg-opacity-5 border-success opacity-75' : 'bg-white'}`}>
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div>
                                                    <h6 className="fw-900 mb-1">{t.description}</h6>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-muted small fw-bold">Current:</span>
                                                        <span className="badge bg-light text-muted border px-2 py-1 rounded-pill" style={{fontSize: '0.6rem'}}>{t.category?.name || 'Uncategorized'}</span>
                                                    </div>
                                                </div>
                                                <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-900" style={{fontSize: '0.65rem'}}>{res.advantage}</div>
                                            </div>
                                            <div className="bg-light p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between border">
                                                <div className="small fw-bold">
                                                    <span className="text-muted me-2">AI RECOMMENDS:</span>
                                                    <span className="text-primary">{res.suggestedCategoryName}</span>
                                                </div>
                                                <button onClick={() => applySuggestion(res)} disabled={appliedIds.has(res.id)} className={`btn btn-sm px-3 rounded-3 fw-bold transition-all ${appliedIds.has(res.id) ? 'btn-success border-0 text-white' : 'btn-black shadow-sm'}`}>
                                                    {appliedIds.has(res.id) ? <><Check size={14} className="me-1"/> Applied</> : 'Accept'}
                                                </button>
                                            </div>
                                            <div className="d-flex align-items-start gap-2">
                                                <Info size={14} className="text-primary mt-1" />
                                                <p className="small italic text-muted mb-0">"{res.reason}"</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {!isAnalyzing && aiResults.length > 0 && (
                                <button onClick={applyAllSuggestions} className="btn btn-primary w-100 mt-4 py-3 fw-900 rounded-3 shadow-lg">Apply All Suggestions</button>
                            )}
                        </div>
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
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.TRANSFER})} className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.TRANSFER ? 'btn-white shadow-sm fw-bold border text-primary' : 'text-muted border-0 bg-transparent'}`}>Transfer</button>
                        </div>
                    </div>

                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Date</label>
                            <input type="date" className="form-control bg-light border-0 fw-bold shadow-none rounded-3" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Amount ($)</label>
                            <input type="number" step="0.01" className="form-control bg-light border-0 fw-bold shadow-none rounded-3" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} required />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Description / Vendor</label>
                        <input type="text" className="form-control bg-light border-0 fw-bold shadow-none rounded-3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required placeholder="e.g. Loves Travel Stop" />
                    </div>

                    {formData.type === TransactionType.TRANSFER ? (
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted text-uppercase">From Account</label>
                                <select className="form-select bg-light border-0 fw-bold shadow-none rounded-3" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} required>
                                    <option value="">Select Source...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted text-uppercase">To Account</label>
                                <select className="form-select bg-light border-0 fw-bold shadow-none rounded-3" value={formData.toAccountId || ''} onChange={e => setFormData({...formData, toAccountId: e.target.value})} required>
                                    <option value="">Select Destination...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted text-uppercase">Account</label>
                                <select className="form-select bg-light border-0 fw-bold shadow-none rounded-3" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} required>
                                    <option value="">Select Account...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted text-uppercase">Category</label>
                                <select className="form-select bg-light border-0 fw-bold shadow-none rounded-3 text-primary" value={formData.category?.id || ''} onChange={e => {
                                    const cat = categories.find(c => c.id === e.target.value);
                                    setFormData({...formData, category: cat});
                                }}>
                                    <option value="">Uncategorized</option>
                                    {categories.filter(c => c.type === formData.type).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg">
                        <Save size={18} className="me-2" /> {editingTransaction ? 'Update Ledger' : 'Commit to Ledger'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
