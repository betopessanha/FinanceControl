
import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { BusinessEntity, LegalStructure } from '../types';
import { useData } from '../lib/DataContext';
import { generateId, getTaxFormForStructure } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Building2, Save, CheckCircle2 } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * Companies component for managing business legal structures and contact information.
 */
const Companies: React.FC = () => {
    const { businessEntities, addLocalEntity, updateLocalEntity, deleteLocalEntity } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<BusinessEntity | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [form, setForm] = useState<Omit<BusinessEntity, 'id' | 'taxForm'>>({
        name: '',
        structure: 'Sole Proprietorship',
        ein: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        zip: ''
    });

    const handleOpenModal = (entity?: BusinessEntity) => {
        if (entity) {
            setEditingEntity(entity);
            setForm({
                name: entity.name,
                structure: entity.structure,
                ein: entity.ein || '',
                email: entity.email || '',
                phone: entity.phone || '',
                website: entity.website || '',
                address: entity.address || '',
                city: entity.city || '',
                state: entity.state || '',
                zip: entity.zip || ''
            });
        } else {
            setEditingEntity(null);
            setForm({
                name: '',
                structure: 'Sole Proprietorship',
                ein: '',
                email: '',
                phone: '',
                website: '',
                address: '',
                city: '',
                state: '',
                zip: ''
            });
        }
        setIsModalOpen(true);
    };

    // Correcting handleSave to be within the component scope
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const taxForm = getTaxFormForStructure(form.structure);
        const entity: BusinessEntity = { id: editingEntity ? editingEntity.id : generateId(), ...form, taxForm };

        const success = editingEntity ? await updateLocalEntity(entity) : await addLocalEntity(entity);
        setIsSaving(false);
        if (success) {
            setShowSuccess(true);
            setTimeout(() => { setShowSuccess(false); setIsModalOpen(false); }, 1500);
        }
    };

    const filteredEntities = businessEntities.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Business Entities</h2>
                  <p className="text-muted mb-0">Manage legal structures and tax profiles for your companies.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center">
                    <PlusCircle size={18} className="me-2" /> Add Entity
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
                                placeholder="Search entity name..." 
                                className="form-control ps-5 bg-light border-0" 
                            />
                        </div>
                    </div>

                    <div className="row g-3">
                        {filteredEntities.map(ent => (
                            <div key={ent.id} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="btn-group">
                                                <button className="btn btn-link text-primary p-1" onClick={() => handleOpenModal(ent)}><Edit2 size={16} /></button>
                                                <button className="btn btn-link text-danger p-1" onClick={() => deleteLocalEntity(ent.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <h5 className="fw-bold text-dark mb-1">{ent.name}</h5>
                                        <p className="text-muted small mb-1">{ent.structure}</p>
                                        <p className="text-muted small mb-3">Filing: {ent.taxForm}</p>
                                        <div className="border-top pt-3">
                                            <span className="small text-muted">EIN: {ent.ein || 'Not provided'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingEntity ? "Edit Entity" : "Add New Entity"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {showSuccess ? (
                    <div className="text-center py-4">
                        <CheckCircle2 size={48} className="text-success mb-3" />
                        <h5>Settings Saved Successfully</h5>
                    </div>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Business Name</label>
                            <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                        </div>
                        <div className="row g-3 mb-3">
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted">Structure</label>
                                <select className="form-select" value={form.structure} onChange={e => setForm({...form, structure: e.target.value as LegalStructure})}>
                                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                                    <option value="LLC (Single Member)">LLC (Single Member)</option>
                                    <option value="LLC (Multi-Member)">LLC (Multi-Member)</option>
                                    <option value="S-Corp">S-Corp</option>
                                    <option value="C-Corp">C-Corp</option>
                                    <option value="Partnership">Partnership</option>
                                </select>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted">EIN / Tax ID</label>
                                <input type="text" className="form-control" value={form.ein} onChange={e => setForm({...form, ein: e.target.value})} />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted">Email</label>
                            <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        </div>
                        <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={isSaving}>
                            <Save size={18} className="me-2" />
                            {isSaving ? 'Saving...' : (editingEntity ? 'Save Changes' : 'Create Entity')}
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Companies;
