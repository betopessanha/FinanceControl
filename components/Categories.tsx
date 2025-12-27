
import React, { useState, useMemo } from 'react';
import Card, { CardContent } from './ui/Card';
import { Category, TransactionType } from '../types';
import { useData } from '../lib/DataContext';
import { generateId } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Tags, Save, Filter, TrendingUp, TrendingDown, Layers, X, Info } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * Categories component for managing transaction classification and tax deductibility.
 * Optimized with search and type filtering.
 */
const Categories: React.FC = () => {
    const { categories, addLocalCategory, updateLocalCategory, deleteLocalCategory } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | TransactionType>('ALL');
    
    const [formData, setFormData] = useState<Omit<Category, 'id'>>({
        name: '',
        type: TransactionType.EXPENSE,
        isTaxDeductible: true
    });

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                type: category.type,
                isTaxDeductible: category.isTaxDeductible ?? true
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                type: activeFilter !== 'ALL' ? activeFilter : TransactionType.EXPENSE,
                isTaxDeductible: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const categoryObj: Category = {
            id: editingCategory ? editingCategory.id : generateId(),
            name: formData.name,
            type: formData.type,
            isTaxDeductible: formData.isTaxDeductible
        };

        if (editingCategory) {
            await updateLocalCategory(categoryObj);
        } else {
            await addLocalCategory(categoryObj);
        }
        setIsModalOpen(false);
    };

    const filteredCategories = useMemo(() => {
        return categories.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = activeFilter === 'ALL' || c.type === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [categories, searchTerm, activeFilter]);

    // Summary counts
    const incomeCount = categories.filter(c => c.type === TransactionType.INCOME).length;
    const expenseCount = categories.filter(c => c.type === TransactionType.EXPENSE).length;

    return (
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-5">
                <div>
                    <h1 className="fw-900 tracking-tight text-black mb-1">Chart of Accounts</h1>
                    <p className="text-muted mb-0 small">Standardized categorization for IRS compliance and internal auditing.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-black shadow-lg d-flex align-items-center px-4 py-2 fw-900 gap-2">
                    <PlusCircle size={18} /> New Category
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="row g-3 mb-4 align-items-center">
                <div className="col-12 col-lg-6">
                    <div className="btn-group p-1 bg-white border rounded-4 shadow-sm w-100 w-md-auto">
                        <button 
                            className={`btn btn-sm px-4 py-2 rounded-3 d-flex align-items-center gap-2 ${activeFilter === 'ALL' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`}
                            onClick={() => setActiveFilter('ALL')}
                        >
                            <Layers size={14} /> All <span className="badge bg-light text-dark ms-1" style={{fontSize: '0.6rem'}}>{categories.length}</span>
                        </button>
                        <button 
                            className={`btn btn-sm px-4 py-2 rounded-3 d-flex align-items-center gap-2 ${activeFilter === TransactionType.INCOME ? 'btn-success shadow' : 'btn-white border-0 text-muted'}`}
                            onClick={() => setActiveFilter(TransactionType.INCOME)}
                        >
                            <TrendingUp size={14} /> Incomes <span className="badge bg-white bg-opacity-20 ms-1" style={{fontSize: '0.6rem'}}>{incomeCount}</span>
                        </button>
                        <button 
                            className={`btn btn-sm px-4 py-2 rounded-3 d-flex align-items-center gap-2 ${activeFilter === TransactionType.EXPENSE ? 'btn-danger shadow' : 'btn-white border-0 text-muted'}`}
                            onClick={() => setActiveFilter(TransactionType.EXPENSE)}
                        >
                            <TrendingDown size={14} /> Expenses <span className="badge bg-white bg-opacity-20 ms-1" style={{fontSize: '0.6rem'}}>{expenseCount}</span>
                        </button>
                    </div>
                </div>
                <div className="col-12 col-lg-6">
                    <div className="position-relative">
                        <Search size={18} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                        <input 
                            type="text" 
                            className="form-control border-0 bg-white shadow-sm ps-5 py-2 rounded-4 fw-bold" 
                            placeholder="Filter by category name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="btn border-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden bg-transparent">
                <CardContent className="p-0">
                    <div className="row g-4">
                        {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                            <div key={cat.id} className="col-12 col-md-6 col-xl-4">
                                <div className="card h-100 border-0 shadow-sm bg-white hover-shadow transition-all overflow-hidden rounded-4 border">
                                    <div className="p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-4">
                                            <div className={`p-3 rounded-4 ${cat.type === TransactionType.INCOME ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                                                {cat.type === TransactionType.INCOME ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                            </div>
                                            <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                                                <button className="btn btn-sm btn-white border-0" onClick={() => handleOpenModal(cat)}><Edit2 size={16} className="text-muted"/></button>
                                                <button className="btn btn-sm btn-white border-0 text-danger" onClick={() => deleteLocalCategory(cat.id)}><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                        
                                        <h5 className="fw-900 text-black mb-1">{cat.name}</h5>
                                        <div className="d-flex align-items-center gap-2 mb-4">
                                            <span className={`badge ${cat.type === TransactionType.INCOME ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${cat.type === TransactionType.INCOME ? 'text-success' : 'text-danger'} border-0 fw-bold`} style={{fontSize: '0.65rem'}}>
                                                {cat.type.toUpperCase()}
                                            </span>
                                            {cat.isTaxDeductible && (
                                                <span className="badge bg-primary bg-opacity-10 text-primary border-0 fw-bold d-flex align-items-center gap-1" style={{fontSize: '0.65rem'}}>
                                                    <Info size={10} /> TAX DEDUCTIBLE
                                                </span>
                                            )}
                                        </div>

                                        <div className="bg-light bg-opacity-50 p-3 rounded-4 mt-2 d-flex justify-content-between align-items-center">
                                            <small className="text-muted fw-bold" style={{fontSize: '0.6rem'}}>SYSTEM COMPLIANCE</small>
                                            <div className="bg-success rounded-circle" style={{width: 6, height: 6}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-12">
                                <div className="text-center py-5 bg-white rounded-4 shadow-sm border">
                                    <div className="py-4">
                                        <Tags size={48} className="text-muted mb-3 opacity-10" />
                                        <h6 className="fw-bold">No categories found</h6>
                                        <p className="text-muted small mb-0">Adjust your search or filters to see more results.</p>
                                        <button onClick={() => {setSearchTerm(''); setActiveFilter('ALL');}} className="btn btn-link btn-sm mt-2 text-decoration-none">Clear all filters</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingCategory ? "Update Category" : "New Account Category"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase ls-1">Account Nature</label>
                        <div className="d-flex gap-2 p-1 bg-light rounded-3 border">
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})} 
                                className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.EXPENSE ? 'btn-white shadow-sm fw-bold border text-danger' : 'text-muted border-0 bg-transparent'}`}
                            >
                                Expense
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setFormData({...formData, type: TransactionType.INCOME})} 
                                className={`btn flex-fill py-2 rounded-2 ${formData.type === TransactionType.INCOME ? 'btn-white shadow-sm fw-bold border text-success' : 'text-muted border-0 bg-transparent'}`}
                            >
                                Income
                            </button>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted text-uppercase">Category Name</label>
                        <input 
                            type="text" 
                            className="form-control bg-light border-0 fw-bold" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            required 
                            placeholder="e.g. Fuel, Tolls, Freight Revenue"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <div className="form-check form-switch p-3 bg-light rounded-4 d-flex justify-content-between align-items-center">
                            <div>
                                <label className="form-check-label fw-bold text-dark d-block mb-0" htmlFor="isTaxDeductible">Tax Deductible</label>
                                <small className="text-muted" style={{fontSize: '0.7rem'}}>Visible in IRS reports (Schedule C)</small>
                            </div>
                            <input 
                                className="form-check-input" 
                                type="checkbox" 
                                style={{cursor: 'pointer', transform: 'scale(1.2)'}}
                                checked={formData.isTaxDeductible} 
                                onChange={e => setFormData({...formData, isTaxDeductible: e.target.checked})} 
                                id="isTaxDeductible" 
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg">
                        <Save size={18} className="me-2" />
                        {editingCategory ? 'Commit Changes' : 'Register Category'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Categories;
