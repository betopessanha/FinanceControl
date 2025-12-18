
import React, { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { useData } from '../lib/DataContext';
import { BusinessEntity, LegalStructure } from '../types';
import { getTaxFormForStructure } from '../lib/utils';
import Modal from './ui/Modal';
import { Building2, PlusCircle, Globe, Mail, Phone, MapPin, Building, Edit2, Trash2, ShieldCheck, Briefcase } from 'lucide-react';

const Companies: React.FC = () => {
    const { businessEntities, addLocalEntity, updateLocalEntity, deleteLocalEntity } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<BusinessEntity | null>(null);

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
        zip: '',
        logoUrl: ''
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
                zip: entity.zip || '',
                logoUrl: entity.logoUrl || ''
            });
        } else {
            setEditingEntity(null);
            setForm({
                name: '', structure: 'Sole Proprietorship', ein: '', email: '', phone: '', website: '',
                address: '', city: '', state: '', zip: '', logoUrl: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const taxForm = getTaxFormForStructure(form.structure);
        const entity: BusinessEntity = {
            id: editingEntity ? editingEntity.id : `ent-${Date.now()}`,
            ...form,
            taxForm
        };

        if (editingEntity) {
            await updateLocalEntity(entity);
        } else {
            await addLocalEntity(entity);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure? This will un-link all bank accounts associated with this entity.")) {
            await deleteLocalEntity(id);
        }
    };

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Business Profiles</h2>
                  <p className="text-muted mb-0">Manage legal entities, tax details, and company branding.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center shadow-sm">
                    <PlusCircle size={18} className="me-2" /> Add Company
                </button>
            </div>

            <div className="row g-4">
                {businessEntities.length > 0 ? (
                    businessEntities.map(ent => (
                        <div key={ent.id} className="col-12 col-lg-6">
                            <Card className="h-100 border-0 shadow-sm overflow-hidden group-action">
                                <CardHeader className="bg-light bg-opacity-50 border-bottom">
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                        <div className="d-flex align-items-center">
                                            {ent.logoUrl ? (
                                                <img src={ent.logoUrl} alt="Logo" className="rounded-circle me-3 border" style={{width: 48, height: 48, objectFit: 'cover'}} />
                                            ) : (
                                                <div className="bg-white rounded-circle p-2 border me-3 text-primary">
                                                    <Building2 size={24} />
                                                </div>
                                            )}
                                            <div>
                                                <h5 className="mb-0 fw-bold text-dark">{ent.name}</h5>
                                                <span className="badge bg-primary bg-opacity-10 text-primary small border border-primary border-opacity-25">
                                                    {ent.structure}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button onClick={() => handleOpenModal(ent)} className="btn btn-sm btn-light border text-primary">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(ent.id)} className="btn btn-sm btn-light border text-danger">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="row g-3">
                                        <div className="col-sm-6">
                                            <div className="d-flex align-items-center text-muted mb-2">
                                                <ShieldCheck size={16} className="me-2 text-success" />
                                                <small className="fw-bold text-uppercase">Tax Info</small>
                                            </div>
                                            <p className="small mb-1 text-dark">Form: <strong>{ent.taxForm}</strong></p>
                                            <p className="small mb-0 text-dark">EIN: <strong>{ent.ein || 'N/A'}</strong></p>
                                        </div>
                                        <div className="col-sm-6 border-start ps-3">
                                            <div className="d-flex align-items-center text-muted mb-2">
                                                <MapPin size={16} className="me-2 text-info" />
                                                <small className="fw-bold text-uppercase">HQ Address</small>
                                            </div>
                                            <p className="small mb-0 text-dark text-truncate">
                                                {ent.address ? `${ent.address}, ${ent.city}, ${ent.state} ${ent.zip}` : 'No address provided'}
                                            </p>
                                        </div>
                                        <div className="col-12 border-top pt-3">
                                            <div className="d-flex flex-wrap gap-4 mt-1">
                                                {ent.email && (
                                                    <div className="d-flex align-items-center small text-muted">
                                                        <Mail size={14} className="me-2" /> {ent.email}
                                                    </div>
                                                )}
                                                {ent.phone && (
                                                    <div className="d-flex align-items-center small text-muted">
                                                        <Phone size={14} className="me-2" /> {ent.phone}
                                                    </div>
                                                )}
                                                {ent.website && (
                                                    <div className="d-flex align-items-center small text-primary">
                                                        <Globe size={14} className="me-2" /> {ent.website}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))
                ) : (
                    <div className="col-12 text-center py-5">
                        <Building size={48} className="text-muted opacity-25 mb-3" />
                        <p className="text-muted">No business profiles registered yet.</p>
                        <button onClick={() => handleOpenModal()} className="btn btn-link">Register your first company</button>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntity ? "Edit Company Details" : "New Company Registration"} size="lg">
                <form onSubmit={handleSave}>
                    <div className="row g-3">
                        <div className="col-12">
                            <h6 className="fw-bold border-bottom pb-2 mb-3 text-primary small text-uppercase">Legal & Tax Identification</h6>
                        </div>
                        <div className="col-md-8">
                            <label className="form-label fw-bold small text-muted">Legal Entity Name</label>
                            <input type="text" className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Speedy Haulers LLC" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-muted">Tax ID (EIN)</label>
                            <input type="text" className="form-control" value={form.ein} onChange={e => setForm({...form, ein: e.target.value})} placeholder="XX-XXXXXXX" />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Legal Structure</label>
                            <select className="form-select" value={form.structure} onChange={e => setForm({...form, structure: e.target.value as LegalStructure})}>
                                <option value="Sole Proprietorship">Sole Proprietorship (Sch C)</option>
                                <option value="LLC (Single Member)">LLC (Single Member - Sch C)</option>
                                <option value="LLC (Multi-Member)">LLC (Multi-Member - 1065)</option>
                                <option value="S-Corp">S-Corp (1120-S)</option>
                                <option value="C-Corp">C-Corp (1120)</option>
                                <option value="Partnership">Partnership (1065)</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Logo Image URL</label>
                            <input type="url" className="form-control" value={form.logoUrl} onChange={e => setForm({...form, logoUrl: e.target.value})} placeholder="https://..." />
                        </div>

                        <div className="col-12 mt-4">
                            <h6 className="fw-bold border-bottom pb-2 mb-3 text-primary small text-uppercase">Contact Information</h6>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-muted">Business Email</label>
                            <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="contact@company.com" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-muted">Phone Number</label>
                            <input type="tel" className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-muted">Website</label>
                            <input type="text" className="form-control" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="www.company.com" />
                        </div>

                        <div className="col-12 mt-4">
                            <h6 className="fw-bold border-bottom pb-2 mb-3 text-primary small text-uppercase">Mailing / Headquarter Address</h6>
                        </div>
                        <div className="col-md-12">
                            <label className="form-label fw-bold small text-muted">Street Address</label>
                            <input type="text" className="form-control" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>
                        <div className="col-md-5">
                            <label className="form-label fw-bold small text-muted">City</label>
                            <input type="text" className="form-control" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold small text-muted">State</label>
                            <input type="text" className="form-control" value={form.state} onChange={e => setForm({...form, state: e.target.value})} maxLength={2} placeholder="TX" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-muted">Zip Code</label>
                            <input type="text" className="form-control" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} />
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary d-flex align-items-center px-4">
                            <PlusCircle size={18} className="me-2" /> Save Company Profile
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Companies;
