
import React, { useState, useMemo } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import { LoadRecord, PaymentType } from '../types';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { MapPin, Navigation, DollarSign, Save, Trash2, Edit2, ChevronRight, Calculator, FileText, Calendar, ArrowRight, Map as MapIcon, Info, ArrowDown, Loader2, AlertTriangle, Settings } from 'lucide-react';
import Modal from './ui/Modal';
import ExportMenu from './ui/ExportMenu';
import { isValidUUID } from '../lib/utils';

const Loads: React.FC = () => {
    const { loadRecords, addLocalLoad, updateLocalLoad, deleteLocalLoad, trucks } = useData();
    const [viewMode, setViewMode] = useState<'register' | 'planner'>('register');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoad, setEditingLoad] = useState<LoadRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<LoadRecord>>({
        currentLocation: '',
        milesToPickup: 0,
        pickupLocation: '',
        pickupDate: new Date().toISOString().split('T')[0],
        milesToDelivery: 0,
        deliveryLocation: '',
        deliveryDate: new Date().toISOString().split('T')[0],
        paymentType: PaymentType.PER_MILE,
        rate: 0,
        truckId: ''
    });

    const totalMiles = (Number(formData.milesToPickup) || 0) + (Number(formData.milesToDelivery) || 0);
    const totalRevenue = formData.paymentType === PaymentType.PER_MILE 
        ? totalMiles * (Number(formData.rate) || 0)
        : (Number(formData.rate) || 0);

    const handleOpenModal = (load?: LoadRecord) => {
        setSaveError(null);
        if (load) {
            setEditingLoad(load);
            setFormData({ ...load, truckId: load.truckId || '' });
        } else {
            setEditingLoad(null);
            setFormData({
                currentLocation: '', milesToPickup: 0, pickupLocation: '',
                pickupDate: new Date().toISOString().split('T')[0],
                milesToDelivery: 0, deliveryLocation: '',
                deliveryDate: new Date().toISOString().split('T')[0],
                paymentType: PaymentType.PER_MILE, rate: 0, truckId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError(null);
        
        try {
            const loadObj: LoadRecord = {
                id: editingLoad ? editingLoad.id : generateId(),
                currentLocation: (formData.currentLocation || '').toUpperCase(),
                milesToPickup: Number(formData.milesToPickup) || 0,
                pickupLocation: (formData.pickupLocation || '').toUpperCase(),
                pickupDate: formData.pickupDate || null,
                milesToDelivery: Number(formData.milesToDelivery) || 0,
                deliveryLocation: (formData.deliveryLocation || '').toUpperCase(),
                deliveryDate: formData.deliveryDate || null,
                totalMiles,
                paymentType: formData.paymentType || PaymentType.PER_MILE,
                rate: Number(formData.rate) || 0,
                totalRevenue: Number(totalRevenue.toFixed(2)),
                truckId: isValidUUID(formData.truckId || '') ? formData.truckId : undefined,
                status: editingLoad ? editingLoad.status : 'Planned'
            };

            const success = editingLoad 
                ? await updateLocalLoad(loadObj) 
                : await addLocalLoad(loadObj);

            if (!success) {
                setSaveError("Erro de sincronização: Verifique se o Caminhão selecionado já existe na nuvem. Use 'Push Local Data' em Settings.");
            } else {
                setIsModalOpen(false);
                setViewMode('register');
            }
        } catch (error: any) {
            setSaveError("Erro de sistema: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const exportData = useMemo(() => loadRecords.map(l => ({
        ID: l.id, 'Pickup Date': l.pickupDate ? formatDate(l.pickupDate) : 'N/A',
        'Pickup Location': l.pickupLocation.toUpperCase(), 'Delivery Date': l.deliveryDate ? formatDate(l.deliveryDate) : 'N/A',
        'Delivery Location': l.deliveryLocation.toUpperCase(), 'Total Miles': l.totalMiles,
        'Payment Type': l.paymentType, 'Revenue': l.totalRevenue, 'Truck Unit': l.truckId || 'N/A'
    })), [loadRecords]);

    return (
        <div className="container-fluid py-2 animate-slide-up pb-5 mb-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h1 className="fw-800 tracking-tight text-black mb-1">Logistics Center</h1>
                    <p className="text-muted mb-0 small">Freight planning and performance tracking.</p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <div className="btn-group p-1 bg-subtle rounded-3 shadow-sm border">
                        <button className={`btn btn-sm rounded-2 px-3 ${viewMode === 'register' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`} onClick={() => setViewMode('register')}><FileText size={14} className="me-1"/> Register</button>
                        <button className={`btn btn-sm rounded-2 px-3 ${viewMode === 'planner' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`} onClick={() => setViewMode('planner')}><Calculator size={14} className="me-1"/> Trip Planner</button>
                    </div>
                    <ExportMenu data={exportData} filename="loads_register" />
                </div>
            </div>

            {viewMode === 'planner' ? (
                <div className="row g-4">
                    <div className="col-12 col-xl-8">
                        <Card className="shadow-lg border-0 overflow-hidden">
                            <CardHeader className="bg-white pb-0">
                                <CardTitle className="d-flex align-items-center gap-2">
                                    <MapIcon className="text-primary" size={20} />
                                    Linear Trip Planner
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 p-md-5">
                                <form onSubmit={handleSave}>
                                    {saveError && (
                                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                                            <AlertTriangle size={18} />
                                            <span className="small fw-bold">{saveError}</span>
                                        </div>
                                    )}
                                    <div className="d-flex flex-column gap-4">
                                        <div className="p-3 rounded-4 bg-light border border-2 border-dashed border-opacity-50">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24, fontSize: '10px'}}>1</div>
                                                <h6 className="fw-800 text-dark mb-0 small text-uppercase ls-1">Current Origin</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small text-muted">Current Location (City, ST)</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-white border-end-0"><MapPin size={16}/></span>
                                                        <input type="text" className="form-control border-start-0 text-uppercase" placeholder="WHERE IS THE TRUCK NOW?" value={formData.currentLocation} onChange={e => setFormData({...formData, currentLocation: e.target.value.toUpperCase()})} required />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center py-0 opacity-25"><ArrowDown size={20} /></div>

                                        <div className="p-4 rounded-4 bg-subtle border">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24, fontSize: '10px'}}>2</div>
                                                <h6 className="fw-800 text-primary mb-0 small text-uppercase ls-1">Deadhead & Pickup</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Miles to Pickup</label>
                                                    <input type="number" className="form-control bg-white" placeholder="0" value={formData.milesToPickup} onChange={e => setFormData({...formData, milesToPickup: Number(e.target.value)})} required />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Pickup Location</label>
                                                    <input type="text" className="form-control bg-white text-uppercase" placeholder="WHERE IS THE LOAD?" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value.toUpperCase()})} required />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small">Pickup Date</label>
                                                    <input type="date" className="form-control bg-white" value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center py-0 opacity-25"><ArrowDown size={20} /></div>

                                        <div className="p-4 rounded-4 bg-subtle border border-success border-opacity-25">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24, fontSize: '10px'}}>3</div>
                                                <h6 className="fw-800 text-success mb-0 small text-uppercase ls-1">Loaded Leg & Delivery</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Loaded Miles</label>
                                                    <input type="number" className="form-control bg-white" placeholder="0" value={formData.milesToDelivery} onChange={e => setFormData({...formData, milesToDelivery: Number(e.target.value)})} required />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Delivery Location</label>
                                                    <input type="text" className="form-control bg-white text-uppercase" placeholder="FINAL DESTINATION" value={formData.deliveryLocation} onChange={e => setFormData({...formData, deliveryLocation: e.target.value.toUpperCase()})} required />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small">Delivery Date</label>
                                                    <input type="date" className="form-control bg-white" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-4 bg-dark text-white shadow-sm mt-2">
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Payment Basis</label>
                                                    <select className="form-select bg-white bg-opacity-10 border-0 text-white" value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value as PaymentType})}>
                                                        <option value={PaymentType.PER_MILE}>Per Mile Rate</option>
                                                        <option value={PaymentType.FLAT_LOAD}>Flat Load Amount</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Rate / Amount ($)</label>
                                                    <input type="number" className="form-control bg-white bg-opacity-10 border-0 text-white" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} required />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Assign Truck</label>
                                                    <select className="form-select bg-white bg-opacity-10 border-0 text-white" value={formData.truckId} onChange={e => setFormData({...formData, truckId: e.target.value})}>
                                                        <option value="">Select Truck...</option>
                                                        {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 d-flex justify-content-end gap-3 border-top pt-4">
                                        <button type="submit" className="btn btn-black px-5 shadow-lg d-flex align-items-center gap-2 rounded-3 fw-800" disabled={isSaving}>
                                            {isSaving ? <Loader2 size={18} className="animate-spin me-2" /> : <Save size={18} className="me-2" />}
                                            Register Load
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="col-12 col-xl-4">
                        <Card className="bg-black text-white border-0 shadow-lg mb-4 rounded-4">
                            <CardContent className="p-4">
                                <h6 className="text-white text-opacity-50 fw-800 text-uppercase small mb-4 ls-1">Trip Summary</h6>
                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex justify-content-between"><span>Deadhead</span><span className="fw-700">{formData.milesToPickup || 0} mi</span></div>
                                    <div className="d-flex justify-content-between"><span>Loaded Leg</span><span className="fw-700">{formData.milesToDelivery || 0} mi</span></div>
                                    <div className="mt-2 pt-2 border-top border-white border-opacity-10 d-flex justify-content-between"><span className="fw-bold">Total Trip</span><span className="fw-800 fs-5">{totalMiles} mi</span></div>
                                    <div className="mt-3 pt-3 border-top border-white border-opacity-20 text-center">
                                        <small className="text-white text-opacity-50 text-uppercase ls-1">Estimated Revenue</small>
                                        <h2 className="fw-900 fs-1 text-success mt-1 mb-0">{formatCurrency(totalRevenue)}</h2>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    <div className="col-12">
                        <Card className="shadow-lg border-0">
                            <CardContent className="p-0">
                                <div className="table-responsive border-0">
                                    <table className="table align-middle mb-0 table-hover">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4 py-3 fw-800 text-muted small text-uppercase">Route Leg</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase">Distance</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase">Revenue</th>
                                                <th className="pe-4 py-3 fw-800 text-muted small text-uppercase text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadRecords.map(l => (
                                                <tr key={l.id} className="border-bottom">
                                                    <td className="ps-4 py-4 fw-bold">
                                                        {l.pickupLocation} <ArrowRight size={14} className="mx-2"/> {l.deliveryLocation}
                                                    </td>
                                                    <td className="py-4">{l.totalMiles} mi</td>
                                                    <td className="py-4 text-success fw-bold">{formatCurrency(l.totalRevenue)}</td>
                                                    <td className="pe-4 py-4 text-end">
                                                        <div className="btn-group">
                                                            <button className="btn btn-sm btn-light border" onClick={() => handleOpenModal(l)}><Edit2 size={14}/></button>
                                                            <button className="btn btn-sm btn-light border text-danger" onClick={() => deleteLocalLoad(l.id)}><Trash2 size={14}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {loadRecords.length === 0 && (
                                                <tr><td colSpan={4} className="text-center py-5 text-muted">No loads registered yet. Use the Planner to start.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => !isSaving && setIsModalOpen(false)} title="Edit Load Details" size="lg">
                <form onSubmit={handleSave}>
                     <div className="row g-3">
                        <div className="col-md-6"><label className="form-label fw-bold small">Pickup Location</label><input type="text" className="form-control" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value.toUpperCase()})} required /></div>
                        <div className="col-md-6"><label className="form-label fw-bold small">Delivery Location</label><input type="text" className="form-control" value={formData.deliveryLocation} onChange={e => setFormData({...formData, deliveryLocation: e.target.value.toUpperCase()})} required /></div>
                        <div className="col-md-6"><label className="form-label fw-bold small">Deadhead Miles</label><input type="number" className="form-control" value={formData.milesToPickup} onChange={e => setFormData({...formData, milesToPickup: Number(e.target.value)})} /></div>
                        <div className="col-md-6"><label className="form-label fw-bold small">Loaded Miles</label><input type="number" className="form-control" value={formData.milesToDelivery} onChange={e => setFormData({...formData, milesToDelivery: Number(e.target.value)})} /></div>
                        <div className="col-md-6"><label className="form-label fw-bold small">Rate ($)</label><input type="number" className="form-control" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} /></div>
                        <div className="col-md-6"><label className="form-label fw-bold small">Assigned Truck</label>
                            <select className="form-select" value={formData.truckId} onChange={e => setFormData({...formData, truckId: e.target.value})}>
                                <option value="">None</option>
                                {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                            </select>
                        </div>
                     </div>
                     <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                        <button type="button" className="btn btn-light" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-black px-4" disabled={isSaving}>Update Load</button>
                     </div>
                </form>
            </Modal>
        </div>
    );
};

export default Loads;
