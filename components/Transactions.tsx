
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate, downloadCSV, generateId, downloadImportTemplate } from '../lib/utils';
import { 
    PlusCircle, Search, Edit2, Loader2, Calendar, Wallet, Trash2, Save, 
    Sparkles, FileText, Check, AlertCircle, ArrowRight, Download, Upload, 
    FileJson, Info, ArrowUpRight, ArrowDownRight, Tag, ArrowRightLeft, 
    X, Filter, CheckSquare, Square, Trash, BrainCircuit, Zap, RefreshCw, CheckCircle2,
    AlertTriangle, FileType, FileUp, ClipboardText, Cpu, Activity, Brain
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
    type: string;
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

    const [importStep, setImportStep] = useState<'input' | 'preview'>('input');
    const [importRawText, setImportRawText] = useState('');
    const [importAccountId, setImportAccountId] = useState('');
    const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importValidationError, setImportValidationError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [aiStatusMsg, setAiStatusMsg] = useState('Initializing Engine...');
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
            // Using the internally assigned API Key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });

            if (!response.text) throw new Error("AI engine returned empty dataset.");
            return JSON.parse(response.text);
        } catch (error: any) {
            console.error("AI Internal Error:", error);
            throw new Error("Unable to contact the accounting AI. Please verify deployment secrets.");
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

        const prompt = `Analise estas transações de transporte e sugira categorias Schedule C (USA). 
        Retorne um JSON array. Categorias: ${JSON.stringify(categoryList)}
        Transações: ${JSON.stringify(selectedTrans.map(t => ({ id: t.id, desc: t.description, amount: t.amount })))}`;

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
        const reader = new FileReader();
        reader.onload = (event) => setImportRawText(event.target?.result as string);
        reader.readAsText(file);
    };

    const handleImportAI = async () => {
        if (!importRawText.trim() || !importAccountId) {
            setImportValidationError("Fill all fields before AI analysis.");
            return;
        }
        
        setIsImporting(true);
        setAiError(null);
        setAiStatusMsg("Processing Statement...");
        
        const categoryList = categories.map(c => ({ id: c.id, name: c.name }));
        const prompt = `Extract transactions from text: "${importRawText}". Map to: ${JSON.stringify(categoryList)}`;

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
            setExtractedTransactions(results.map((r: any) => ({ ...r, tempId: generateId() })));
            setImportStep('preview');
        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setIsImporting(false);
        }
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
            setExtractedTransactions([]);
        } catch (e) {
            console.error(e);
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

    return (
        <div className="container-fluid py-2 animate-slide-up position-relative">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-900 tracking-tight text-black mb-1">Financial Ledger</h1>
                    <p className="text-muted mb-0 small">Audit trail with AI-powered deduction analysis.</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={() => { setImportStep('input'); setIsImportModalOpen(true); }} className="btn btn-white border shadow-sm px-3 fw-bold d-flex align-items-center gap-2 rounded-3">
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
                                    <input type="text" className="form-control border-0 bg-light ps-5 py-2 rounded-3 fw-bold" placeholder="Filter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                                    <th className="ps-4 py-3 small fw-800 text-muted">DATE</th>
                                    <th className="py-3 small fw-800 text-muted">DESCRIPTION</th>
                                    <th className="py-3 small fw-800 text-muted">CATEGORY</th>
                                    <th className="py-3 small fw-800 text-muted text-end">AMOUNT</th>
                                    <th className="pe-4 py-3 small fw-800 text-muted text-end">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(t => (
                                    <tr key={t.id} className="border-bottom border-light">
                                        <td className="ps-4 py-3 text-muted small">{formatDate(t.date)}</td>
                                        <td className="py-3 fw-bold text-dark">{t.description}</td>
                                        <td className="py-3">
                                            <span className="badge bg-light text-dark border">{t.category?.name || 'Uncategorized'}</span>
                                        </td>
                                        <td className={`py-3 text-end fw-bold ${t.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                                        </td>
                                        <td className="pe-4 py-3 text-end">
                                            <button className="btn btn-sm btn-white border-0" onClick={() => handleOpenModal(t)}><Edit2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Smart Import Modal */}
            <Modal isOpen={isImportModalOpen} onClose={() => !isImporting && setIsImportModalOpen(false)} title="Autonomous AI Importer" size="xl">
                <div className="p-1">
                    {isImporting ? (
                        <div className="text-center py-5 ai-scanner">
                            <div className="ai-float mb-5">
                                <div className="bg-primary bg-opacity-10 d-inline-flex p-4 rounded-circle ai-core-pulse border border-primary border-opacity-20 shadow-lg">
                                    <Brain size={64} className="text-primary" />
                                </div>
                            </div>
                            <h3 className="fw-900 text-black tracking-tight mb-2">Neural Analysis Active</h3>
                            <div className="status-fader text-primary fw-800 small text-uppercase ls-1">{aiStatusMsg}</div>
                        </div>
                    ) : importStep === 'input' ? (
                        <div className="animate-slide-up">
                            <p className="text-muted small mb-4">Paste bank text or upload CSV. Gemini AI will automatically categorize entries for you.</p>
                            <div className="mb-4">
                                <label className="form-label fw-bold small text-muted text-uppercase">Target Account</label>
                                <select className="form-select border shadow-sm rounded-3 fw-bold" value={importAccountId} onChange={e => setImportAccountId(e.target.value)}>
                                    <option value="">Select Target...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="mb-4">
                                <textarea className="form-control border shadow-sm rounded-4 p-3 bg-light" rows={6} placeholder="Paste text here..." value={importRawText} onChange={e => setImportRawText(e.target.value)}></textarea>
                            </div>
                            <button onClick={handleImportAI} disabled={!importRawText || !importAccountId} className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg d-flex align-items-center justify-content-center gap-2">
                                <Sparkles size={18} className="text-primary" /> START AI EXTRACTION
                            </button>
                        </div>
                    ) : (
                        <div className="animate-slide-up">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h6 className="fw-900 mb-0">Extracted Entries ({extractedTransactions.length})</h6>
                                <button onClick={finalizeImport} className="btn btn-success px-5 fw-900 rounded-3">Save to Ledger</button>
                            </div>
                            <div className="table-responsive rounded-4 border bg-white shadow-sm overflow-auto" style={{maxHeight: '400px'}}>
                                <table className="table align-middle mb-0">
                                    <thead className="bg-light sticky-top">
                                        <tr>
                                            <th className="ps-4">DATE</th>
                                            <th>DESCRIPTION</th>
                                            <th>CATEGORY</th>
                                            <th className="text-end pe-4">AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extractedTransactions.map((ext) => (
                                            <tr key={ext.tempId}>
                                                <td className="ps-4 py-2 small">{ext.date}</td>
                                                <td className="py-2 fw-bold">{ext.description}</td>
                                                <td className="py-2 text-primary fw-bold">{ext.suggestedCategoryName}</td>
                                                <td className="py-2 text-end pe-4 fw-900">{formatCurrency(ext.amount)}</td>
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
            <Modal isOpen={isAIModalOpen} onClose={() => !isAnalyzing && setIsAIModalOpen(false)} title="Intelligent Tax Auditor" size="lg">
                <div className="p-1">
                    {isAnalyzing ? (
                        <div className="text-center py-5 ai-scanner">
                            <div className="ai-core-pulse d-inline-block p-4 rounded-circle bg-primary bg-opacity-10 mb-4">
                                <Activity size={48} className="text-primary" />
                            </div>
                            <h5 className="fw-900">Identifying Deductions...</h5>
                        </div>
                    ) : aiError ? (
                        <div className="text-center py-5">
                            <AlertCircle size={48} className="text-danger mb-3" />
                            <h5 className="fw-900 text-danger">AI Service Unreachable</h5>
                            <p className="text-muted small">{aiError}</p>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '60vh' }}>
                            {aiResults.map(res => (
                                <div key={res.id} className="card border rounded-4 p-4 shadow-sm bg-white">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <h6 className="fw-900 mb-0">Analysis of Record ID: {res.id.substring(0,8)}</h6>
                                        <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-900">{res.advantage}</div>
                                    </div>
                                    <div className="bg-light p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between">
                                        <div className="small fw-bold">PROPOSED: <span className="text-primary">{res.suggestedCategoryName}</span></div>
                                        <button onClick={() => applySuggestion(res)} className="btn btn-sm btn-black px-4 rounded-3 fw-bold">Accept</button>
                                    </div>
                                    <p className="small text-muted italic mb-0">"{res.reason}"</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Entry Form Modal */}
            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingTransaction ? "Update Record" : "New Transaction"}>
                <form onSubmit={handleSaveTransaction}>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase">Nature</label>
                        <div className="d-flex gap-2 p-1 bg-light rounded-3 border">
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})} className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.EXPENSE ? 'btn-white shadow-sm fw-bold border' : 'text-muted border-0 bg-transparent'}`}>Expense</button>
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME})} className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.INCOME ? 'btn-white shadow-sm fw-bold border' : 'text-muted border-0 bg-transparent'}`}>Income</button>
                        </div>
                    </div>
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Date</label>
                            <input type="date" className="form-control bg-light border-0 fw-bold rounded-3" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Amount ($)</label>
                            <input type="number" step="0.01" className="form-control bg-light border-0 fw-bold rounded-3" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} required />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Vendor / Notes</label>
                        <input type="text" className="form-control bg-light border-0 fw-bold rounded-3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                    </div>
                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg">
                        <Save size={18} className="me-2" /> Commit to Ledger
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Transactions;
