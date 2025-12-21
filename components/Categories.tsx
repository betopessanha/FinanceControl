
import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { Category, TransactionType } from '../types';
import { PlusCircle, Search, Edit2, Trash2, Tag, ArrowUpCircle, ArrowDownCircle, Download, Loader2, Sparkles, CheckCircle, XCircle, Info } from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";

// Standard US Trucking Categories List
const US_TRUCKING_CATEGORIES = [
    { name: 'Freight Revenue', type: TransactionType.INCOME, isTaxDeductible: false },
    { name: 'Fuel Surcharge (FSC)', type: TransactionType.INCOME, isTaxDeductible: false },
    { name: 'Detention & Layover', type: TransactionType.INCOME, isTaxDeductible: false },
    { name: 'Fuel (Diesel & DEF)', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Truck & Trailer Lease/Payment', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Repairs & Maintenance', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Tires', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Insurance Premiums', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Driver Wages & Contract Labor', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Dispatch Services', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Factoring Fees', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Licenses, Permits & IFTA', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Heavy Highway Tax (2290)', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Tolls & Parking', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Scales (Weigh Stations)', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'ELD & Software Subscriptions', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Travel & Per Diem', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Occupational Accident', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Professional Services', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Office Supplies & Expenses', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Escrow Deductions', type: TransactionType.EXPENSE, isTaxDeductible: true },
    { name: 'Truck/Trailer Purchase (Asset)', type: TransactionType.EXPENSE, isTaxDeductible: true }, 
];

const Categories: React.FC = () => {
    const { categories, addLocalCategory, addLocalCategories, updateLocalCategory, deleteLocalCategory } = useData();

    const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReasoning, setAiReasoning] = useState<string>('');

    const [formData, setFormData] = useState({ 
        name: '', 
        type: TransactionType.EXPENSE,
        isTaxDeductible: true 
    });

    const handleOpenModal = (category?: Category) => {
        setAiReasoning('');
        if (category) {
            setEditingCategory(category);
            setFormData({ 
                name: category.name, 
                type: category.type,
                isTaxDeductible: category.isTaxDeductible !== undefined ? category.isTaxDeductible : (category.type === TransactionType.EXPENSE)
            });
        } else {
            setEditingCategory(null);
            setFormData({ 
                name: '', 
                type: activeTab,
                isTaxDeductible: activeTab === TransactionType.EXPENSE 
            });
        }
        setIsModalOpen(true);
    };

    const handleAnalyzeCategory = async () => {
        if (!formData.name.trim()) return;
        
        setIsAnalyzing(true);
        setAiReasoning('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
            Analyze the category name "${formData.name}" for a US Trucking Company (Sole Proprietorship/LLC).
            Is this category typically considered a "Tax Deductible" business expense on IRS Schedule C?
            
            Context Examples:
            - "Diesel Fuel": Deductible (True)
            - "Owner Draw": Not Deductible (False - Equity)
            - "Traffic Ticket": Not Deductible (False - Fines)
            - "Clothing": Not Deductible (False - unless safety gear)
            - "Office Supplies": Deductible (True)

            Respond in JSON format with properties "isDeductible" and "reason".
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isDeductible: { type: Type.BOOLEAN },
                            reason: { type: Type.STRING }
                        },
                        required: ["isDeductible", "reason"]
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            
            if (result.isDeductible !== undefined) {
                if (formData.type === TransactionType.EXPENSE) {
                    setFormData(prev => ({ ...prev, isTaxDeductible: result.isDeductible }));
                }
                setAiReasoning(result.reason);
            }

        } catch (error: any) {
            console.error("AI Analysis failed", error);
            setAiReasoning("Could not analyze at this time.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSeedDefaults = async () => {
        setIsSeeding(true);
        const existingNames = categories.map(c => c.name.toLowerCase());
        const toInsertDefs = US_TRUCKING_CATEGORIES.filter(c => !existingNames.includes(c.name.toLowerCase()));
        
        if (toInsertDefs.length === 0) {
            alert("All standard US categories are already in your list.");
            setIsSeeding(false);
            return;
        }

        const newCategories: Category[] = toInsertDefs.map((c, idx) => ({
            id: `seed-${Date.now()}-${idx}`,
            name: c.name,
            type: c.type,
            isTaxDeductible: c.isTaxDeductible
        }));

        addLocalCategories(newCategories);
        setIsSeeding(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const categoryObj: Category = {
            id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
            name: formData.name,
            type: formData.type,
            isTaxDeductible: formData.isTaxDeductible
        };

        if (editingCategory) {
            updateLocalCategory(categoryObj);
        } else {
            addLocalCategory(categoryObj);
        }

        if (isSupabaseConfigured && supabase) {
            const payload = { 
                name: formData.name, 
                type: formData.type, 
                is_tax_deductible: formData.isTaxDeductible 
            };
            try {
                if (editingCategory) {
                    await supabase.from('categories').update(payload).eq('id', editingCategory.id);
                } else {
                    await supabase.from('categories').insert([payload]);
                }
            } catch (error) {
                console.warn("DB save failed", error);
            }
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure?')) {
            deleteLocalCategory(id);
            if (isSupabaseConfigured && supabase) {
                await supabase.from('categories').delete().eq('id', id);
            }
        }
    };

    const filteredCategories = categories.filter(c => 
        c.type === activeTab && 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Categories</h2>
                  <p className="text-muted mb-0">Customize your classifications.</p>
                </div>
                <button onClick={handleSeedDefaults} disabled={isSeeding} className="btn btn-outline-secondary d-flex align-items-center bg-white shadow-sm">
                    {isSeeding ? <Loader2 size={18} className="me-2 animate-spin"/> : <Download size={18} className="me-2" />}
                    Import US Standards
                </button>
            </div>

            <Card className="min-vh-50">
                <CardContent>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                        <div className="btn-group w-100 w-md-auto">
                            <input type="radio" className="btn-check" name="catType" id="catExp" checked={activeTab === TransactionType.EXPENSE} onChange={() => setActiveTab(TransactionType.EXPENSE)} />
                            <label className={`btn ${activeTab === TransactionType.EXPENSE ? 'btn-danger' : 'btn-outline-danger'}`} htmlFor="catExp">Expenses</label>
                            <input type="radio" className="btn-check" name="catType" id="catInc" checked={activeTab === TransactionType.INCOME} onChange={() => setActiveTab(TransactionType.INCOME)} />
                            <label className={`btn ${activeTab === TransactionType.INCOME ? 'btn-success' : 'btn-outline-success'}`} htmlFor="catInc">Income</label>
                        </div>
                        <div className="d-flex gap-2 w-100 w-md-auto">
                            <div className="position-relative flex-grow-1">
                                <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted" />
                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="form-control ps-5 bg-light border-0" />
                            </div>
                            <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center text-nowrap"><PlusCircle size={18} className="me-2" />Add New</button>
                        </div>
                    </div>

                    <div className="row g-3">
                        {filteredCategories.map(cat => (
                            <div key={cat.id} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                    <div className="card-body d-flex align-items-center justify-content-between p-3">
                                        <div className="d-flex align-items-center">
                                            <div className={`rounded p-2 me-3 ${cat.type === TransactionType.INCOME ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                                                <Tag size={20} />
                                            </div>
                                            <div>
                                                <span className="fw-medium text-dark d-block">{cat.name}</span>
                                                {cat.type === TransactionType.EXPENSE && (
                                                    <span className={`badge ${cat.isTaxDeductible === false ? 'bg-warning text-dark' : 'bg-light text-muted border'} small`} style={{fontSize: '0.65rem'}}>
                                                        {cat.isTaxDeductible === false ? 'Not Deductible' : 'Tax Deductible'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="btn-group">
                                            <button onClick={() => handleOpenModal(cat)} className="btn btn-light btn-sm text-primary"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(cat.id)} className="btn btn-light btn-sm text-danger"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingCategory ? "Edit Category" : "Add Category"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Category Type</label>
                        <div className="d-flex gap-2 p-1 bg-light rounded">
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE, isTaxDeductible: true})} className={`btn flex-fill ${formData.type === TransactionType.EXPENSE ? 'btn-white shadow-sm text-danger fw-bold' : 'text-muted'}`}>Expense</button>
                            <button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME, isTaxDeductible: false})} className={`btn flex-fill ${formData.type === TransactionType.INCOME ? 'btn-white shadow-sm text-success fw-bold' : 'text-muted'}`}>Income</button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="name" className="form-label fw-bold small text-muted">Category Name</label>
                        <div className="input-group">
                            <input type="text" id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="form-control" required />
                            <button type="button" className="btn btn-black d-flex align-items-center gap-2" onClick={handleAnalyzeCategory} disabled={isAnalyzing || !formData.name}>
                                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                <span className="small fw-bold">AI</span>
                            </button>
                        </div>
                        {aiReasoning && (
                            <div className="form-text text-info d-flex align-items-start mt-2 bg-info bg-opacity-10 p-2 rounded">
                                <Info size={14} className="me-2 mt-1 flex-shrink-0" /> 
                                <span className="small"><strong>AI Logic:</strong> {aiReasoning}</span>
                            </div>
                        )}
                    </div>

                    {formData.type === TransactionType.EXPENSE && (
                         <div className="mb-4 p-3 bg-light rounded border">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                                        Tax Deductible
                                        {formData.isTaxDeductible ? <CheckCircle size={16} className="ms-2 text-success" /> : <XCircle size={16} className="ms-2 text-warning" />}
                                    </h6>
                                    <small className="text-muted">Reduces taxable income if yes.</small>
                                </div>
                                <div className="form-check form-switch">
                                    <input className="form-check-input" type="checkbox" role="switch" checked={formData.isTaxDeductible} onChange={e => setFormData({...formData, isTaxDeductible: e.target.checked})} style={{ width: '3em', height: '1.5em' }} />
                                </div>
                            </div>
                         </div>
                    )}

                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary">{editingCategory ? 'Save Changes' : 'Create Category'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Categories;
