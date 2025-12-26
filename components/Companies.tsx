
import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { BusinessEntity, LegalStructure, EntityType } from '../types';
import { useData } from '../lib/DataContext';
import { generateId, getTaxFormForStructure } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Building2, Save, CheckCircle2, User, Briefcase } from 'lucide-react';
import Modal from './ui/Modal';

const Companies: React.FC = () => {
    const { businessEntities, addLocalEntity, updateLocalEntity, deleteLocalEntity } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<BusinessEntity | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [form, setForm] = useState<Omit<BusinessEntity, 'id' | 'taxForm'>>({
        name: '',
        type: EntityType.BUSINESS,
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
                type: entity.type || EntityType.BUSINESS,
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
                type: EntityType.BUSINESS,
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
        <div className="container-fluid py-2 animate-slide-up">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-800 tracking-tight text-black mb-1">Entity Management</h2>
                  <p className="text-muted mb-0 small">Define Business Units vs. Personal Owner Profiles.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center shadow-sm px-4">
                    <PlusCircle size={18} className="me-2" /> Add New Entity
                </button>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="p-4 bg-white border-bottom">
                        <div className="position-relative" style={{maxWidth: '400px'}}>
                            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search entities..." className="form-control ps-5 bg-subtle border-0 rounded-pill" />
                        </div>
                    </div>

                    <div className="row g-0">
                        {filteredEntities.map(ent => (
                            <div key={ent.id} className="col-12 col-xl-4 border-end border-bottom">
                                <div className="p-4 hover-bg-subtle transition-all">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div className={`p-3 rounded-4 ${ent.type === EntityType.PERSONAL ? 'bg-primary bg-opacity-10 text-primary' : 'bg-dark text-white shadow-sm'}`}>
                                            {ent.type === EntityType.PERSONAL ? <User size={24} /> : <Briefcase size={24} />}
                                        </div>
                                        <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                                            <button className="btn btn-sm btn-white border-0" onClick={() => handleOpenModal(ent)}><Edit2 size={16}/></button>
                                            <button className="btn btn-sm btn-white border-0 text-danger" onClick={() => deleteLocalEntity(ent.id)}><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <h5 className="fw-900 text-black mb-1">{ent.name}</h5>
                                    <div className="badge bg-light text-dark border fw-bold mb-3" style={{fontSize: '0.65rem'}}>{ent.type?.toUpperCase()} ACCOUNT</div>
                                    
                                    <div className="d-flex flex-column gap-2 border-top pt-3 mt-2">
                                        <div className="d-flex justify-content-between small">
                                            <span className="text-muted">Tax ID / EIN:</span>
                                            <span className="fw-bold text-dark">{ent.ein || 'N/A'}</span>
                                        </div>
                                        <div className="d-flex justify-content-between small">
                                            <span className="text-muted">IRS Form:</span>
                                            <span className="fw-bold text-dark">{ent.taxForm}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingEntity ? "Edit Profile" : "Register New Profile"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {showSuccess ? (
                    <div className="text-center py-5">
                        <CheckCircle2 size={48} className="text-success mb-3" />
                        <h5 className="fw-900">Entity Registry Updated</h5>
                    </div>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="mb-4">
                            <label className="form-label fw-bold small text-muted text-uppercase ls-1">Account Classification</label>
                            <div className="d-flex gap-2 p-1 bg-light rounded-3 border">
                                <button type="button" onClick={() => setForm({...form, type: EntityType.BUSINESS})} className={`btn flex-fill py-2 rounded-2 ${form.type === EntityType.BUSINESS ? 'btn-white shadow-sm fw-bold border' : 'text-muted border-0 bg-transparent'}`}>Business / Fleet</button>
                                <button type="button" onClick={() => setForm({...form, type: EntityType.PERSONAL})} className={`btn flex-fill py-2 rounded-2 ${form.type === EntityType.PERSONAL ? 'btn-white shadow-sm fw-bold border' : 'text-muted border-0 bg-transparent'}`}>Individual / Owner</button>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Legal Registry Name</label>
                            <input type="text" className="form-control bg-light border-0 fw-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="E.G. FAST HAUL LLC" />
                        </div>
                        
                        <div className="row g-3 mb-4">
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted">Structure</label>
                                <select className="form-select bg-light border-0 fw-bold" value={form.structure} onChange={e => setForm({...form, structure: e.target.value as LegalStructure})}>
                                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                                    <option value="LLC (Single Member)">LLC (Single Member)</option>
                                    <option value="LLC (Multi-Member)">LLC (Multi-Member)</option>
                                    <option value="S-Corp">S-Corp</option>
                                    <option value="C-Corp">C-Corp</option>
                                    <option value="Individual / Owner">Individual / Owner</option>
                                </select>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-bold small text-muted">EIN / SSN</label>
                                <input type="text" className="form-control bg-light border-0 fw-bold" value={form.ein} onChange={e => setForm({...form, ein: e.target.value})} placeholder="00-0000000" />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-black w-100 py-3 fw-900 rounded-3 shadow-lg" disabled={isSaving}>
                            <Save size={18} className="me-2" />
                            {isSaving ? 'Registering...' : (editingEntity ? 'Update Identity' : 'Confirm Registration')}
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Companies;
