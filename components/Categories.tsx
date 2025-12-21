
import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { Category, TransactionType } from '../types';
import { useData } from '../lib/DataContext';
import { generateId } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Tags, Save } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * Categories component for managing transaction classification and tax deductibility.
 */
const Categories: React.FC = () => {
    const { categories, addLocalCategory, updateLocalCategory, deleteLocalCategory } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
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
                type: TransactionType.EXPENSE,
                isTaxDeductible: true
            });
        }
        setIsModalOpen(true);
    };

    // Correcting handleSubmit to be within the component scope
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

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Categories</h2>
                  <p className="text-muted mb-0">Manage transaction categories and tax settings.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center">
                    <PlusCircle size={18} className="me-2" /> Add Category
                </button>
            </div>

            <Card className="min-vh-50">
                <CardContent>
                    <div className="mb-4" style={{maxWidth: '400px'}}>
                        <div className="position-relative">
                            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                                <Search size={16} />
                            </span>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search category name..." 
                                className="form-control ps-5 bg-light border-0" 
                            />
                        </div>
                    </div>

                    <div className="row g-3">
                        {filteredCategories.map(cat => (
                            <div key={cat.id} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className={`p-3 rounded-circle ${cat.type === TransactionType.INCOME ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${cat.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}`}>
                                                <Tags size={24} />
                                            </div>
                                            <div className="btn-group">
                                                <button className="btn btn-link text-primary p-1" onClick={() => handleOpenModal(cat)}><Edit2 size={16} /></button>
                                                <button className="btn btn-link text-danger p-1" onClick={() => deleteLocalCategory(cat.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <h5 className="fw-bold text-dark mb-1">{cat.name}</h5>
                                        <p className="text-muted small mb-3">{cat.type}</p>
                                        <div className="border-top pt-3 d-flex justify-content-between align-items-center">
                                            <span className={`badge ${cat.isTaxDeductible ? 'bg-info text-info' : 'bg-light text-muted'} bg-opacity-10 border`}>
                                                {cat.isTaxDeductible ? 'Tax Deductible' : 'Non-Deductible'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingCategory ? "Edit Category" : "Add New Category"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Category Name</label>
                        <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Type</label>
                        <select className="form-select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType})}>
                            <option value={TransactionType.EXPENSE}>Expense</option>
                            <option value={TransactionType.INCOME}>Income</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" checked={formData.isTaxDeductible} onChange={e => setFormData({...formData, isTaxDeductible: e.target.checked})} id="isTaxDeductible" />
                            <label className="form-check-label fw-bold small text-muted" htmlFor="isTaxDeductible">Tax Deductible</label>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-100 py-2 fw-bold">
                        <Save size={18} className="me-2" />
                        {editingCategory ? 'Save Changes' : 'Add Category'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Categories;
