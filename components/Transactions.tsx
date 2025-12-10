import React, { useState, useEffect } from 'react';
import Card, { CardContent } from './ui/Card';
import { Transaction, TransactionType, Category, BankAccount } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { PlusCircle, Search, Filter, MoreHorizontal, ArrowDownCircle, ArrowUpCircle, Paperclip, Upload, X, Edit2, Sparkles, Loader2, Calendar, Wallet, ArrowRightLeft, ArrowRight, FileSpreadsheet, Check, UploadCloud, AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './ui/Modal';
import { GoogleGenAI, Type } from "@google/genai";
import { useData } from '../lib/DataContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to access env vars safely in various environments
const API_KEY = process.env.API_KEY || '';

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
    const [newReceiptUrl, setNewReceiptUrl] = useState('');

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
            // Confirm deletion via parent handler or internal confirm
            if (window.confirm("Are you sure you want to delete this transaction?")) {
                onDelete(initialData.id);
            }
        }
    };

    const handleAddReceipt = () => {
        if (newReceiptUrl) {
            setReceipts([...receipts, newReceiptUrl]);
            setNewReceiptUrl('');
        }
    };

    // Filter categories based on selected type
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
                    {/* Type Selector */}
                    <div className="col-12">
                        <label className="form-label fw-bold small text-muted">Transaction Type</label>
                        <div className="d-flex gap-2">
                            {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`btn flex-fill ${type === t ? 'btn-dark' : 'btn-light border'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Date</label>
                        <input 
                            type="date" 
                            className="form-control" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            required 
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted">Amount</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input 
                                type="number" 
                                className="form-control" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                step="0.01" 
                                required 
                            />
                        </div>
                    </div>

                    <div className="col-12">
                        <label className="form-label fw-bold small text-muted">Description</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder="e.g. Fuel at Love's" 
                            required 
                        />
                    </div>

                    {/* Conditional Fields based on Type */}
                    {type === TransactionType.TRANSFER ? (
                        <>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">From Account</label>
                                <select 
                                    className="form-select" 
                                    value={accountId} 
                                    onChange={e => setAccountId(e.target.value)} 
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">To Account</label>
                                <select 
                                    className="form-select" 
                                    value={toAccountId} 
                                    onChange={e => setToAccountId(e.target.value)} 
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Category</label>
                                <select 
                                    className="form-select" 
                                    value={categoryId} 
                                    onChange={e => setCategoryId(e.target.value)} 
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Account</label>
                                <select 
                                    className="form-select" 
                                    value={accountId} 
                                    onChange={e => setAccountId(e.target.value)} 
                                    required
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Truck (Optional)</label>
                                <select 
                                    className="form-select" 
                                    value={truckId} 
                                    onChange={e => setTruckId(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Receipts Section (Simplified for Demo) */}
                    <div className="col-12">
                         <label className="form-label fw-bold small text-muted">Receipts</label>
                         <div className="d-flex gap-2 mb-2">
                            <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                placeholder="Paste Image URL"
                                value={newReceiptUrl}
                                onChange={e => setNewReceiptUrl(e.target.value)}
                            />
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleAddReceipt}>Add</button>
                         </div>
                         {receipts.length > 0 && (
                             <div className="d-flex flex-wrap gap-2 mt-2">
                                 {receipts.map((url, idx) => (
                                     <div key={idx} className="position-relative border p-1 rounded">
                                         <img src={url} alt="Receipt" style={{width: 40, height: 40, objectFit: 'cover'}} />
                                         <button 
                                            type="button"
                                            className="btn btn-danger btn-sm position-absolute top-0 start-100 translate-middle rounded-circle p-0 d-flex align-items-center justify-content-center" 
                                            style={{width: 16, height: 16}}
                                            onClick={() => setReceipts(receipts.filter((_, i) => i !== idx))}
                                        >
                                            <X size={10} />
                                        </button>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                </div>

                <div className="d-flex justify-content-between gap-2 mt-4 pt-3 border-top">
                    <div>
                        {initialData && onDelete && (
                            <button type="button" onClick={handleDelete} className="btn btn-danger bg-opacity-10 text-danger border-0">
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <button type="button" onClick={onClose} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Transaction</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
}

const ImportTransactionsModal: React.FC<ImportTransactionsModalProps> = ({ isOpen, onClose, onImport }) => {
    // ... [Previous Import Modal Code remains unchanged, collapsed for brevity in this response but would be included fully in final output] ...
    const { categories, accounts } = useData();
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<Transaction[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // New state for selected account
    const [selectedImportAccountId, setSelectedImportAccountId] = useState<string>('');

    // Initialize with first account
    useEffect(() => {
        if (isOpen && accounts.length > 0 && !selectedImportAccountId) {
            setSelectedImportAccountId(accounts[0].id);
        }
    }, [isOpen, accounts]);

    const reset = () => {
        setInputText('');
        setParsedData([]);
        setStep('input');
        setError(null);
        setFileName(null);
        setProgress(0);
        // Reset to first account
        if (accounts.length > 0) setSelectedImportAccountId(accounts[0].id);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            setError("Unsupported file format. Please upload a CSV, TXT, or OFX file. PDF and Excel (binary) are not supported directly.");
            return;
        }

        setLoading(true);
        setProgress(0);
        const reader = new FileReader();
        
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setProgress(percent);
            }
        };

        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                setInputText(content);
                setFileName(file.name);
                setError(null);
            }
            setProgress(100);
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
            }, 500);
        };
        reader.onerror = () => {
            setError("Failed to read file.");
            setLoading(false);
            setProgress(0);
        }
        reader.readAsText(file);

        e.target.value = '';
    };

    const handleAnalyze = async () => {
        if (!inputText.trim()) return;
        setLoading(true);
        setProgress(0);
        setError(null);
        
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.floor(Math.random() * 5) + 1;
            });
        }, 300);

        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            
            const prompt = `
            Extract financial transactions from the following bank statement text. 
            For each transaction, return a JSON object with:
            - date (YYYY-MM-DD format, defaulting to today ${new Date().toISOString().split('T')[0]} if missing)
            - description
            - amount (number)
            - type (strictly "Income" or "Expense")
            - categoryName (infer based on common trucking categories)

            IMPORTANT RULES FOR AMOUNTS:
            - If the amount is negative (e.g., -50.00), treat it as an 'Expense' and return the absolute positive value (e.g., 50.00).
            - If positive, treat as 'Income' unless description suggests otherwise.
            - Do NOT return negative numbers for the 'amount' field.

            Text Data:
            ${inputText.substring(0, 30000)}
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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
                                type: { type: Type.STRING, enum: ['Income', 'Expense'] },
                                categoryName: { type: Type.STRING }
                            },
                            required: ['date', 'description', 'amount', 'type']
                        }
                    }
                }
            });

            clearInterval(timer);
            setProgress(100);

            const text = response.text;
            if (!text) throw new Error("No response from AI");

            const rawData = JSON.parse(text);

            const mappedTransactions: Transaction[] = rawData.map((item: any, idx: number) => {
                
                // Logic to handle bank file negatives and ensure storage is positive
                let processedAmount = Number(item.amount);
                let processedType = item.type;

                // If negative, it is definitely an expense, and we store it as positive
                if (processedAmount < 0) {
                    processedAmount = Math.abs(processedAmount);
                    processedType = 'Expense';
                }

                const matchedCategory = categories.find(c => c.name.toLowerCase() === (item.categoryName || '').toLowerCase()) 
                                        || categories.find(c => c.type === (processedType === 'Income' ? TransactionType.INCOME : TransactionType.EXPENSE));
                
                return {
                    id: `temp-import-${Date.now()}-${idx}`,
                    date: item.date,
                    description: item.description,
                    amount: processedAmount, // Should be positive now
                    type: processedType === 'Income' ? TransactionType.INCOME : TransactionType.EXPENSE,
                    category: matchedCategory,
                    // Use selected account ID
                    accountId: selectedImportAccountId || accounts[0]?.id || 'unknown',
                    receipts: []
                } as Transaction;
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));

            if (mappedTransactions.length === 0) {
                setError("No transactions were found in the text. Please check the file format.");
            } else {
                setParsedData(mappedTransactions);
                setStep('preview');
            }

        } catch (e) {
            console.error(e);
            clearInterval(timer);
            setProgress(0);
            setError("Failed to process text. The file might be empty or unreadable.");
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (index: number, field: keyof Transaction, value: any) => {
        const updatedData = [...parsedData];
        const item = { ...updatedData[index] };

        if (field === 'amount') {
            item.amount = Math.abs(parseFloat(value) || 0); // Always enforce positive on manual edit too
        } else if (field === 'category') {
            const newCat = categories.find(c => c.id === value);
            item.category = newCat;
        } else if (field === 'type') {
            item.type = value as TransactionType;
        } else {
            (item as any)[field] = value;
        }

        updatedData[index] = item;
        setParsedData(updatedData);
    };

    const handleDeleteRow = (index: number) => {
        setParsedData(parsedData.filter((_, i) => i !== index));
    };

    const handleConfirmImport = () => {
        onImport(parsedData);
        reset();
    };

    const clearSelection = () => {
        setInputText('');
        setFileName(null);
    }

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => { onClose(); reset(); }} 
            title="Import Transactions"
            size="xl"
        >
            {step === 'input' ? (
                <div className="d-flex flex-column gap-3">
                    
                    {/* Account Selector */}
                    <div className="mb-2">
                        <label className="form-label fw-bold small text-muted">Target Account for Import</label>
                        <select 
                            className="form-select"
                            value={selectedImportAccountId}
                            onChange={(e) => setSelectedImportAccountId(e.target.value)}
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                            ))}
                        </select>
                        <div className="form-text small text-muted">
                            All imported transactions will be assigned to this account.
                        </div>
                    </div>

                    {!fileName ? (
                        <div className="p-4 border border-2 border-dashed rounded bg-light text-center position-relative hover-bg-white transition-all">
                            <input 
                                type="file" 
                                accept=".csv,.txt,.ofx" 
                                onChange={handleFileUpload}
                                className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer"
                                style={{ zIndex: 10 }}
                            />
                            <UploadCloud className="mx-auto text-primary mb-2" size={32} />
                            <h6 className="fw-bold mb-1">Click to Upload Bank File</h6>
                            <p className="small text-muted mb-0">Supports CSV, TXT, OFX</p>
                            <p className="small text-danger mt-1 mb-0" style={{fontSize: '0.7rem'}}>* PDF/Excel (.xlsx) not supported</p>
                        </div>
                    ) : (
                        <div className="alert alert-success d-flex justify-content-between align-items-center mb-0">
                            <div className="d-flex align-items-center">
                                <FileSpreadsheet className="me-2 text-success" size={24} />
                                <div>
                                    <h6 className="mb-0 fw-bold">{fileName}</h6>
                                    <small className="text-muted">File loaded successfully</small>
                                </div>
                            </div>
                            <button className="btn btn-sm btn-outline-danger" onClick={clearSelection}>
                                Change File
                            </button>
                        </div>
                    )}
                    <div className="position-relative text-center my-2">
                        <hr className="text-muted opacity-25" />
                        <span className="position-absolute top-50 start-50 translate-middle bg-white px-2 text-muted small">OR PASTE TEXT</span>
                    </div>
                    <textarea 
                        className="form-control" 
                        rows={6} 
                        placeholder="Paste raw text from your bank statement or invoice here..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        disabled={!!fileName}
                    ></textarea>
                    {error && (
                        <div className="alert alert-danger small d-flex align-items-center">
                            <AlertTriangle size={16} className="me-2" />
                            {error}
                        </div>
                    )}
                    {loading && (
                        <div className="progress mt-2 shadow-sm" style={{height: '25px'}}>
                            <div 
                                className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                                role="progressbar" 
                                style={{width: `${progress}%`}}
                            >
                                {progress < 100 ? `Processing... ${Math.round(progress)}%` : 'Complete!'}
                            </div>
                        </div>
                    )}
                    <div className="d-flex justify-content-end">
                        <button 
                            className="btn btn-primary d-flex align-items-center" 
                            onClick={handleAnalyze} 
                            disabled={loading || !inputText.trim()}
                        >
                            {loading ? <Loader2 className="animate-spin me-2" size={18} /> : <Sparkles className="me-2" size={18} />}
                            {loading ? 'Processing...' : 'Analyze & Import'}
                        </button>
                    </div>
                    <p className="text-muted small fst-italic mt-2 mb-0">
                        <Sparkles size={12} className="me-1" />
                        Powered by Gemini AI: Automatically detects dates, amounts, and categories from unstructured text or files.
                    </p>
                </div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    <p className="text-muted small mb-0">Review and correct the extracted data before importing.</p>
                    <div className="table-responsive border rounded" style={{maxHeight: '500px'}}>
                        <table className="table table-sm table-striped table-hover mb-0 align-middle">
                            <thead className="table-light sticky-top" style={{zIndex: 5}}>
                                <tr>
                                    <th style={{width: '130px'}}>Date</th>
                                    <th>Description</th>
                                    <th style={{width: '100px'}}>Type</th>
                                    <th style={{width: '120px'}}>Amount</th>
                                    <th style={{width: '200px'}}>Category</th>
                                    <th style={{width: '50px'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((t, i) => (
                                    <tr key={i}>
                                        <td>
                                            <input 
                                                type="date" 
                                                className="form-control form-control-sm border-0 bg-transparent"
                                                value={t.date}
                                                onChange={e => handleFieldChange(i, 'date', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm border-0 bg-transparent"
                                                value={t.description}
                                                onChange={e => handleFieldChange(i, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <select 
                                                className={`form-select form-select-sm border-0 bg-transparent fw-bold ${t.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}`}
                                                value={t.type}
                                                onChange={e => handleFieldChange(i, 'type', e.target.value)}
                                            >
                                                <option value={TransactionType.INCOME}>Income</option>
                                                <option value={TransactionType.EXPENSE}>Expense</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text border-0 bg-transparent px-1">$</span>
                                                <input 
                                                    type="number" 
                                                    className="form-control form-control-sm border-0 bg-transparent fw-bold"
                                                    value={t.amount}
                                                    onChange={e => handleFieldChange(i, 'amount', e.target.value)}
                                                    step="0.01"
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <select 
                                                className="form-select form-select-sm border-0 bg-transparent"
                                                value={t.category?.id || ''}
                                                onChange={e => handleFieldChange(i, 'category', e.target.value)}
                                            >
                                                <option value="" className="text-warning">Uncategorized</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="text-center">
                                            <button 
                                                className="btn btn-sm text-danger hover-bg-light rounded-circle p-1"
                                                onClick={() => handleDeleteRow(i)}
                                                title="Delete Row"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="d-flex justify-content-between pt-3 border-top">
                         <button className="btn btn-light" onClick={() => setStep('input')}>Back</button>
                         <button className="btn btn-success" onClick={handleConfirmImport}>Confirm Import ({parsedData.length})</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};


const Transactions: React.FC = () => {
    // Consume Data from Context
    const { 
        transactions, categories, accounts, refreshData, loading, 
        reportFilter, setReportFilter,
        addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions
    } = useData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>('All');
    const [selectedAccount, setSelectedAccount] = useState<string>('All');
    
    // Additional local filter state for Category Drilling from Reports
    const [filterCategories, setFilterCategories] = useState<string[] | null>(null);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [viewReceiptsTransaction, setViewReceiptsTransaction] = useState<Transaction | null>(null);

    // Extract available years for filter
    const availableYears = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a: number, b: number) => b - a);

    // Check for incoming report filters on mount
    useEffect(() => {
        if (reportFilter) {
            setSelectedYear(reportFilter.year);
            setFilterCategories(reportFilter.categoryNames);
        } else {
            setFilterCategories(null);
        }
    }, [reportFilter]);

    const handleClearReportFilter = () => {
        setReportFilter(null);
        setFilterCategories(null);
    };

    const handleSaveTransaction = async (transactionData: Omit<Transaction, 'id'>, id?: string) => {
        // Construct the full transaction object for local state update
        const fullTransactionObj: Transaction = {
            id: id || `temp-${Date.now()}`,
            ...transactionData
        };

        // 1. Update Local State Immediately (Optimistic Update)
        if (id) {
            updateLocalTransaction(fullTransactionObj);
        } else {
            addLocalTransaction(fullTransactionObj);
        }

        setIsFormModalOpen(false);
        setEditingTransaction(null);

        // 2. Persist to Database if configured
        if (!isSupabaseConfigured || !supabase) {
            // If in mock mode, we are done (local state updated above)
            return;
        }

        const payload = {
            date: transactionData.date,
            description: transactionData.description,
            amount: transactionData.amount,
            type: transactionData.type,
            account_id: transactionData.accountId,
            to_account_id: transactionData.toAccountId || null,
            category_id: transactionData.category?.id || null,
            truck_id: transactionData.truck?.id || null,
            receipts: transactionData.receipts
        };

        try {
            if (id) {
                const { error } = await supabase.from('transactions').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('transactions').insert([payload]);
                if (error) throw error;
            }
            // Optional: Re-fetch to ensure sync (though local update handles UI)
            // await refreshData(); 
        } catch (e) {
            console.error(e);
            alert("Failed to save transaction to database. Local change reverted.");
            await refreshData(); // Revert on error
        }
    };

    const handleTransactionDelete = async (id: string) => {
         // 1. Optimistic Update (Local)
        deleteLocalTransaction(id);
        setIsFormModalOpen(false);
        setEditingTransaction(null);

        // 2. Database Delete
        if (isSupabaseConfigured && supabase) {
            try {
                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) throw error;
            } catch (e) {
                console.error("Delete failed", e);
                alert("Failed to delete transaction from database.");
                await refreshData(); // Re-fetch to ensure sync
            }
        }
    };

    const handleBulkImport = async (newTransactions: Transaction[]) => {
        // Optimistic update for import
        newTransactions.forEach(t => addLocalTransaction(t));
        setIsImportModalOpen(false);

        if (!isSupabaseConfigured || !supabase) {
            return;
        }

        const dbPayloads = newTransactions.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            account_id: t.accountId,
            category_id: t.category?.id || null,
            truck_id: null, // Imports typically don't have truck assignment initially
            receipts: []
        }));

        try {
            const { error } = await supabase.from('transactions').insert(dbPayloads);
            if (error) throw error;
        } catch (e) {
            console.error(e);
            alert("Failed to import transactions to DB.");
            await refreshData(); // Revert
        }
    };

    const handleEditClick = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsFormModalOpen(true);
    };

    const handleAddNewClick = () => {
        setEditingTransaction(null);
        setIsFormModalOpen(true);
    };

    const handleDeleteSingleClick = (id: string) => {
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            handleTransactionDelete(id);
        }
    }

    // Filter AND Sort transactions by date descending
    const filteredTransactions = transactions
        .filter(t => {
            // Base filters
            const matchesSearch = 
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.truck?.unitNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesYear = selectedYear === 'All' || new Date(t.date).getFullYear().toString() === selectedYear;

            const matchesAccount = selectedAccount === 'All' || 
                                   t.accountId === selectedAccount || 
                                   t.toAccountId === selectedAccount;
            
            // Special Report Filter (if active)
            let matchesReportCategory = true;
            if (filterCategories) {
                const currentCatName = t.category?.name || 'Uncategorized';
                // If filterCategories is active, transaction MUST belong to one of those categories
                if (filterCategories.length > 0) {
                     matchesReportCategory = filterCategories.includes(currentCatName);
                } else {
                    matchesReportCategory = false; // Fallback
                }
            }

            return matchesSearch && matchesYear && matchesAccount && matchesReportCategory;
        })
        .sort((a: Transaction, b: Transaction) => {
            return new Date(b.date).valueOf() - new Date(a.date).valueOf();
        });

    // --- Batch Selection Handlers ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = filteredTransactions.map(t => t.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Open Modal
    const handleBatchDeleteClick = () => {
        if (selectedIds.length === 0) return;
        setIsDeleteModalOpen(true);
    };

    // Actual Logic
    const confirmBatchDelete = async () => {
        setIsDeleteModalOpen(false);

        // 1. Optimistic Update (Local)
        if (deleteLocalTransactions) {
            deleteLocalTransactions(selectedIds);
        } else {
            selectedIds.forEach(id => deleteLocalTransaction(id));
        }

        // CRITICAL: Clear selection immediately so UI updates
        const idsToDelete = [...selectedIds];
        setSelectedIds([]);

        // 2. Database Delete
        if (isSupabaseConfigured && supabase) {
            try {
                const { error } = await supabase.from('transactions').delete().in('id', idsToDelete);
                if (error) throw error;
            } catch (e) {
                console.error("Batch delete failed", e);
                // Note: We don't rollback simply here for UX reasons, but we alert.
                // In a production app, we might want to revert the local state or show a toast.
                alert("Failed to sync deletion with database. Please refresh.");
            }
        }
    };
    // -----------------------------

    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Unknown';

    if (loading) return <div className="text-center py-5"><Loader2 className="animate-spin text-primary" size={32}/></div>;

    const isAllSelected = filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredTransactions.length;

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Transactions</h2>
                  <p className="text-muted mb-0">Manage payments, deposits, and internal transfers.</p>
                </div>
            </div>
            
            {reportFilter && (
                <div className="alert alert-primary d-flex align-items-center justify-content-between shadow-sm border-primary border-opacity-25">
                    <div className="d-flex align-items-center">
                        <Filter className="me-3" size={20} />
                        <div>
                            <strong>Filtered by Report: </strong> 
                            Showing items for <span className="text-decoration-underline">{reportFilter.sourceReport}</span> ({reportFilter.year})
                        </div>
                    </div>
                    <button className="btn btn-sm btn-light border" onClick={handleClearReportFilter}>
                        <X size={14} className="me-1" /> Clear Filter
                    </button>
                </div>
            )}

            <Card className="overflow-hidden">
                <CardContent>
                    <div className="d-flex flex-column flex-xl-row justify-content-between align-items-start align-items-xl-center mb-4 gap-3">
                        <div className="d-flex gap-2 w-100 w-xl-auto" style={{ maxWidth: '400px' }}>
                            <div className="position-relative flex-grow-1">
                                <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                                    <Search size={18} />
                                </span>
                                <input 
                                    type="text" 
                                    placeholder="Search transactions..." 
                                    className="form-control ps-5 rounded-pill bg-light border-0" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="d-flex flex-wrap gap-2 w-100 w-xl-auto justify-content-end align-items-center">
                             
                             {/* Batch Delete Action - Visible only when items selected */}
                             {selectedIds.length > 0 && (
                                <button 
                                    onClick={handleBatchDeleteClick} 
                                    className="btn btn-danger d-flex align-items-center shadow-sm"
                                >
                                    <Trash2 size={18} className="me-2" />
                                    Delete Selected ({selectedIds.length})
                                </button>
                             )}

                             {/* Account Filter */}
                             <div className="input-group w-auto">
                                <span className="input-group-text bg-white border-end-0 text-muted">
                                    <Wallet size={16} />
                                </span>
                                <select 
                                    className="form-select border-start-0 ps-0 bg-white" 
                                    style={{maxWidth: '180px'}}
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    <option value="All">All Bank Accounts</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                             </div>

                             {/* Year Filter */}
                             <div className="input-group w-auto">
                                <span className="input-group-text bg-white border-end-0 text-muted">
                                    <Calendar size={16} />
                                </span>
                                <select 
                                    className="form-select border-start-0 ps-0 bg-white" 
                                    style={{maxWidth: '120px'}}
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    <option value="All">All Years</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                             </div>

                            <button onClick={() => setIsImportModalOpen(true)} className="btn btn-outline-primary d-flex align-items-center shadow-sm bg-white">
                                <FileSpreadsheet size={18} className="me-2" />
                                Import CSV
                            </button>

                            <button onClick={handleAddNewClick} className="btn btn-primary d-flex align-items-center shadow-sm">
                                <PlusCircle size={18} className="me-2" />
                                Add New
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3 ps-3 text-center" style={{width: '40px'}}>
                                        <input 
                                            type="checkbox" 
                                            className="form-check-input"
                                            checked={isAllSelected}
                                            ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="text-secondary small text-uppercase py-3">Date</th>
                                    <th className="text-secondary small text-uppercase py-3">Description</th>
                                    <th className="text-secondary small text-uppercase py-3">Category / Type</th>
                                    <th className="text-secondary small text-uppercase py-3">Account</th>
                                    <th className="text-secondary small text-uppercase py-3 text-end">Amount</th>
                                    <th className="text-secondary small text-uppercase py-3 text-center">Receipts</th>
                                    <th className="text-secondary small text-uppercase py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map(t => {
                                        let amountClass = 'text-dark';
                                        let sign = '';
                                        let rowClass = '';
                                        const isSelected = selectedIds.includes(t.id);

                                        if (t.type === TransactionType.INCOME) {
                                            amountClass = 'text-success';
                                            sign = '+';
                                            rowClass = 'table-success bg-opacity-10';
                                        } else if (t.type === TransactionType.EXPENSE) {
                                            amountClass = 'text-danger';
                                            sign = '-';
                                            rowClass = 'table-danger bg-opacity-10';
                                        } else if (t.type === TransactionType.TRANSFER) {
                                            amountClass = 'text-primary';
                                            rowClass = 'bg-light';
                                            if (selectedAccount !== 'All') {
                                                if (t.accountId === selectedAccount) {
                                                    sign = '-'; 
                                                    amountClass = 'text-danger';
                                                } else if (t.toAccountId === selectedAccount) {
                                                    sign = '+';
                                                    amountClass = 'text-success';
                                                }
                                            }
                                        }
                                        
                                        if (isSelected) rowClass += ' bg-primary bg-opacity-25';

                                        return (
                                        <tr key={t.id} className={rowClass}>
                                            <td className="ps-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input" 
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(t.id)}
                                                />
                                            </td>
                                            <td className="text-muted small" style={{whiteSpace: 'nowrap'}}>{formatDate(t.date)}</td>
                                            <td className="fw-medium text-dark">
                                                {t.description}
                                                {t.truck && <span className="badge bg-light text-secondary border ms-2">{t.truck.unitNumber}</span>}
                                            </td>
                                            <td>
                                                {t.type === TransactionType.TRANSFER ? (
                                                     <span className="badge rounded-pill bg-white text-primary border border-primary border-opacity-25 d-inline-flex align-items-center">
                                                        <ArrowRightLeft size={12} className="me-1"/> Transfer
                                                     </span>
                                                ) : (
                                                    <span className={`badge rounded-pill d-inline-flex align-items-center fw-medium border ${
                                                        t.type === TransactionType.INCOME 
                                                        ? 'bg-white text-success border-success border-opacity-25' 
                                                        : 'bg-white text-danger border-danger border-opacity-25'
                                                    }`}>
                                                        {t.type === TransactionType.INCOME ? <ArrowUpCircle size={12} className="me-1"/> : <ArrowDownCircle size={12} className="me-1"/>}
                                                        {t.category?.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="small text-muted">
                                                {t.type === TransactionType.TRANSFER ? (
                                                    <div className="d-flex align-items-center gap-1">
                                                        <span className={t.accountId === selectedAccount ? 'fw-bold text-dark' : ''}>{getAccountName(t.accountId)}</span>
                                                        <ArrowRight size={12} />
                                                        <span className={t.toAccountId === selectedAccount ? 'fw-bold text-dark' : ''}>{t.toAccountId ? getAccountName(t.toAccountId) : 'Unknown'}</span>
                                                    </div>
                                                ) : (
                                                    getAccountName(t.accountId)
                                                )}
                                            </td>
                                            <td className={`text-end fw-bold ${amountClass}`}>
                                                {sign} {formatCurrency(t.amount)}
                                            </td>
                                            <td className="text-center">
                                                {t.receipts && t.receipts.length > 0 && (
                                                    <button 
                                                        className="btn btn-sm btn-link text-primary position-relative"
                                                        onClick={() => setViewReceiptsTransaction(t)}
                                                    >
                                                        <Paperclip size={18} />
                                                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary" style={{fontSize: '0.6rem'}}>
                                                            {t.receipts.length}
                                                        </span>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-2">
                                                    <button 
                                                        onClick={() => handleEditClick(t)}
                                                        className="btn btn-light btn-sm text-primary shadow-sm"
                                                        title="Edit Transaction"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteSingleClick(t.id)}
                                                        className="btn btn-light btn-sm text-danger shadow-sm"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-5 text-muted">
                                            No transactions found matching criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="sm"
            >
                <div className="text-center">
                    <div className="text-danger mb-3">
                        <AlertTriangle size={48} />
                    </div>
                    <p className="mb-4">
                        Are you sure you want to delete <span className="fw-bold">{selectedIds.length}</span> selected transaction(s)?
                        <br/><span className="text-muted small">This action cannot be undone.</span>
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                        <button className="btn btn-light border" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                        <button className="btn btn-danger" onClick={confirmBatchDelete}>Delete Permanently</button>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal */}
            <TransactionFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSave={handleSaveTransaction}
                onDelete={handleTransactionDelete}
                initialData={editingTransaction}
            />

            {/* Import Modal */}
            <ImportTransactionsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleBulkImport}
            />

            {/* View Receipts Modal */}
            <Modal
                isOpen={!!viewReceiptsTransaction}
                onClose={() => setViewReceiptsTransaction(null)}
                title="Attached Receipts"
            >
                {viewReceiptsTransaction && viewReceiptsTransaction.receipts && (
                    <div className="d-flex flex-column gap-3">
                         <div className="alert alert-light border d-flex align-items-center mb-0">
                            {viewReceiptsTransaction.truck && <span className="badge bg-secondary me-2">{viewReceiptsTransaction.truck.unitNumber}</span>}
                            <span className="fw-bold text-dark me-auto">{viewReceiptsTransaction.description}</span>
                            <span className="fw-bold">{formatCurrency(viewReceiptsTransaction.amount)}</span>
                         </div>
                        <div className="row g-2">
                            {viewReceiptsTransaction.receipts.map((src, index) => (
                                <div key={index} className="col-12 border rounded bg-light p-2 text-center">
                                    <img 
                                        src={src} 
                                        alt={`Receipt ${index + 1}`} 
                                        className="img-fluid rounded shadow-sm" 
                                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                                    />
                                    <div className="text-muted small mt-2">Receipt #{index + 1}</div>
                                </div>
                            ))}
                        </div>
                        <div className="d-flex justify-content-end">
                            <button className="btn btn-primary" onClick={() => setViewReceiptsTransaction(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Transactions;