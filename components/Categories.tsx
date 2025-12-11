
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
];

const Categories: React.FC = () => {
    // Consume Data
    const { categories, refreshData, addLocalCategory, updateLocalCategory, deleteLocalCategory } = useData();

    const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);
    
    // AI Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReasoning, setAiReasoning] = useState<string>('');

    // Form State
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
            // Safely retrieve API Key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Context: US Trucking Accounting (Schedule C)
            const prompt = `
            Analyze the category name "${formData.name}" for a US Trucking Company (Sole Proprietorship/LLC).
            Is this category typically considered a "Tax Deductible" business expense on IRS Schedule C?
            
            Context Examples:
            - "Diesel Fuel": Deductible (True)
            - "Owner Draw": Not Deductible (False - Equity)
            - "Traffic Ticket": Not Deductible (False - Fines)
            - "Clothing": Not Deductible (False - unless safety gear)
            - "Office Supplies": Deductible (True)

            Respond in JSON:
            {
                "isDeductible": boolean,
                "reason": "short explanation (max 10 words)"
            }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            isDeductible: { type: Type.BOOLEAN },
                            reason: { type: Type.STRING }
                        }
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
            const msg = error.message && error.message.includes("API Key") 
                ? "API Key missing. Check environment variables." 
                : "Could not analyze automatically.";
            setAiReasoning(msg);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSeedDefaults = async () => {
        setIsSeeding(true);
        
        // 1. Local Seed
        const existingNames = categories.map(c => c.name.toLowerCase());
        const toInsert = US_TRUCKING_CATEGORIES.filter(c => !existingNames.includes(c.name.toLowerCase()));
        
        if (toInsert.length === 0) {
            alert("All standard US categories are already in your list.");
            setIsSeeding(false);
            return;
        }

        toInsert.forEach((c, idx) => {
            addLocalCategory({
                id: `seed-${Date.now()}-${idx}`,
                name: c.name,
                type: c.type,
                isTaxDeductible: c.isTaxDeductible
            });
        });

        // 2. DB Seed (if connected)
        if (isSupabaseConfigured && supabase) {
            try {
                // Try inserting with tax field first
                const dbPayload = toInsert.map(c => ({
                    name: c.name,
                    type: c.type,
                    is_tax_deductible: c.isTaxDeductible
                }));
                const { error } = await supabase.from('categories').insert(dbPayload);
                if (error) throw error;
            } catch (e) {
                console.warn("Bulk insert failed (likely missing column), retrying without tax field...");
                 try {
                    // Fallback without tax field
                    const fallbackPayload = toInsert.map(c => ({
                        name: c.name,
                        type: c.type
                    }));
                    await supabase.from('categories').insert(fallbackPayload);
                } catch (e2) {
                    console.error("Bulk DB Seed failed", e2);
                }
            }
        }
        
        setIsSeeding(false);
        alert(`Successfully added ${toInsert.length} US Trucking categories.`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const categoryObj: Category = {
            id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
            name: formData.name,
            type: formData.type,
            isTaxDeductible: formData.isTaxDeductible
        };

        // 1. Update Local State Immediately (Optimistic)
        if (editingCategory) {
            updateLocalCategory(categoryObj);
        } else {
            addLocalCategory(categoryObj);
        }

        // 2. Persist to DB if available
        if (isSupabaseConfigured && supabase) {
            // Full payload including the new column
            const fullPayload = { 
                name: formData.name, 
                type: formData.type,
                is_tax_deductible: formData.isTaxDeductible 
            };

            try {
                if (editingCategory) {
                    const { error } = await supabase.from('categories').update(fullPayload).eq('id', editingCategory.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('categories').insert([fullPayload]);
                    if (error) throw error;
                }
            } catch (error) {
                console.warn("Primary save failed (possibly missing column), attempting fallback...", error);
                
                // FALLBACK: Try saving WITHOUT the 'is_tax_deductible' field
                // This ensures the category is still saved even if the DB schema is outdated.
                const fallbackPayload = { 
                    name: formData.name, 
                    type: formData.type
                };

                try {
                     if (editingCategory) {
                        await supabase.from('categories').update(fallbackPayload).eq('id', editingCategory.id);
                    } else {
                        await supabase.from('categories').insert([fallbackPayload]);
                    }
                    // If fallback works, we are good (though tax status won't persist to cloud until DB is fixed)
                } catch (fallbackError) {
                    console.error("Critical save error", fallbackError);
                    alert("Saved locally, but failed to save to cloud database.");
                }
            }
        }

        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            // 1. Local Delete
            deleteLocalCategory(id);

            // 2. DB Delete
            if (isSupabaseConfigured && supabase) {
                try {
                    await supabase.from('categories').delete().eq('id', id);
                } catch (error) {
                    console.error(error);
                }
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
                  <p className="text-muted mb-0">Customize your income and expense classifications.</p>
                </div>
                <button 
                    onClick={handleSeedDefaults} 
                    disabled={isSeeding}
                    className="btn btn-outline-secondary d-flex align-items-center bg-white shadow-sm"
                    title="Import standard US Trucking categories (IFTA compliant)"
                >
                    {isSeeding ? <Loader2 size={18} className="me-2 animate-spin"/> : <Download size={18} className="me-2" />}
                    Import US Standards
                </button>
            </div>

            <Card className="min-vh-50">
                <CardContent>
                    {/* Header Controls */}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                        
                        {/* Tab Switcher */}
                        <div className="btn-group w-100 w-md-auto" role="group">
                            <input 
                                type="radio" className="btn-check" name="catType" id="catExp" 
                                checked={activeTab === TransactionType.EXPENSE}
                                onChange={() => setActiveTab(TransactionType.EXPENSE)}
                            />
                            <label className={`btn ${activeTab === TransactionType.EXPENSE ? 'btn-danger' : 'btn-outline-danger'}`} htmlFor="catExp">Expenses</label>

                            <input 
                                type="radio" className="btn-check" name="catType" id="catInc"
                                checked={activeTab === TransactionType.INCOME}
                                onChange={() => setActiveTab(TransactionType.INCOME)}
                            />
                            <label className={`btn ${activeTab === TransactionType.INCOME ? 'btn-success' : 'btn-outline-success'}`} htmlFor="catInc">Income</label>
                        </div>

                        <div className="d-flex gap-2 w-100 w-md-auto">
                            <div className="position-relative flex-grow-1">
                                <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                                    <Search size={16} />
                                </span>
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search..." 
                                    className="form-control ps-5 bg-light border-0" 
                                />
                            </div>
                            <button 
                                onClick={() => handleOpenModal()} 
                                className="btn btn-primary d-flex align-items-center text-nowrap"
                            >
                                <PlusCircle size={18} className="me-2" />
                                Add Category
                            </button>
                        </div>
                    </div>

                    {/* Categories Grid */}
                    <div className="row g-3">
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map(cat => (
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
                                                <button 
                                                    onClick={() => handleOpenModal(cat)}
                                                    className="btn btn-light btn-sm text-primary"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="btn btn-light btn-sm text-danger"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-12 text-center py-5">
                                <Tag size={48} className="text-muted opacity-25 mb-3" />
                                <p className="text-muted">No categories found matching your search.</p>
                                {!isSeeding && categories.length === 0 && (
                                     <button onClick={handleSeedDefaults} className="btn btn-link">
                                        Click here to import default US Trucking Categories
                                     </button>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <Modal 
                title={editingCategory ? "Edit Category" : "Add New Category"} 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
            >
                <form onSubmit={handleSubmit}>
                     <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Category Type</label>
                        <div className="d-flex gap-2 p-1 bg-light rounded">
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, type: TransactionType.EXPENSE, isTaxDeductible: true})} 
                                className={`btn flex-fill d-flex align-items-center justify-content-center ${formData.type === TransactionType.EXPENSE ? 'btn-white shadow-sm text-danger fw-bold' : 'text-muted'}`}
                            >
                                <ArrowDownCircle size={16} className="me-2" />
                                Expense
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, type: TransactionType.INCOME, isTaxDeductible: false})} 
                                className={`btn flex-fill d-flex align-items-center justify-content-center ${formData.type === TransactionType.INCOME ? 'btn-white shadow-sm text-success fw-bold' : 'text-muted'}`}
                            >
                                <ArrowUpCircle size={16} className="me-2" />
                                Income
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="name" className="form-label fw-bold small text-muted">Category Name</label>
                        <div className="input-group">
                            <input 
                                type="text" 
                                id="name" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                placeholder={formData.type === TransactionType.EXPENSE ? "e.g. Traffic Ticket" : "e.g. Freight Revenue"} 
                                className="form-control"
                                required 
                            />
                            <button 
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={handleAnalyzeCategory}
                                disabled={isAnalyzing || !formData.name}
                                title="Analyze tax deductibility with AI"
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            </button>
                        </div>
                        {aiReasoning && (
                            <div className={`form-text d-flex align-items-center mt-2 ${aiReasoning.includes("API Key") ? "text-danger" : "text-info"}`}>
                                <Info size={14} className="me-1" /> {aiReasoning.includes("API Key") ? "Error: " : "AI Suggestion: "} {aiReasoning}
                            </div>
                        )}
                    </div>

                    {/* Tax Deductible Toggle */}
                    {formData.type === TransactionType.EXPENSE && (
                         <div className="mb-4 p-3 bg-light rounded border">
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <h6 className="mb-0 fw-bold text-dark d-flex align-items-center">
                                        Tax Deductible
                                        {formData.isTaxDeductible ? (
                                            <CheckCircle size={16} className="ms-2 text-success" />
                                        ) : (
                                            <XCircle size={16} className="ms-2 text-warning" />
                                        )}
                                    </h6>
                                    <small className="text-muted">
                                        {formData.isTaxDeductible 
                                            ? "This expense reduces your taxable income (Schedule C)." 
                                            : "This is likely equity/personal. Does NOT reduce tax."}
                                    </small>
                                </div>
                                <div className="form-check form-switch">
                                    <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        role="switch" 
                                        id="taxDeductibleSwitch"
                                        checked={formData.isTaxDeductible}
                                        onChange={e => setFormData({...formData, isTaxDeductible: e.target.checked})}
                                        style={{ width: '3em', height: '1.5em' }}
                                    />
                                </div>
                            </div>
                         </div>
                    )}

                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {editingCategory ? 'Save Changes' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Categories;
