
import React, { useState, useMemo } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import { LoadRecord, PaymentType } from '../types';
import { formatCurrency, formatDate, formatNumber, generateId, isValidUUID } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { MapPin, Navigation, DollarSign, Save, Trash2, Edit2, ChevronRight, Calculator, FileText, Calendar, ArrowRight, Map as MapIcon, Info, ArrowDown, Loader2, AlertTriangle, Settings, Route } from 'lucide-react';
import Modal from './ui/Modal';
import ExportMenu from './ui/ExportMenu';

const Loads: React.FC = () => {
    const { loadRecords, addLocalLoad, updateLocalLoad, deleteLocalLoad, trucks } = useData();
    const [viewMode, setViewMode] = useState<'register' | 'planner'>('planner');
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

    // USA Standard Trip Calculation
    const totalMiles = useMemo(() => {
        const dh = Number(formData.milesToPickup) || 0;
        const loaded = Number(formData.milesToDelivery) || 0;
        return dh + loaded;
    }, [formData.milesToPickup, formData.milesToDelivery]);

    const totalRevenue = useMemo(() => {
        const rateValue = Number(formData.rate) || 0;
        if (formData.paymentType === PaymentType.PER_MILE) {
            // Per Mile usually applies to Loaded Miles in many contracts, but we follow standard formula
            return totalMiles * rateValue;
        }
        return rateValue;
    }, [totalMiles, formData.rate, formData.paymentType]);

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
                setSaveError("Cloud Sync Warning: Ensure the assigned truck exists in the cloud first.");
            } else {
                setIsModalOpen(false);
                setViewMode('register');
            }
        } catch (error: any) {
            setSaveError("System Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const exportData = useMemo(() => loadRecords.map(l => ({
        ID: l.id, 
        'Pickup Date': l.pickupDate ? formatDate(l.pickupDate) : 'N/A',
        'Pickup Location': l.pickupLocation.toUpperCase(), 
        'Delivery Date': l.deliveryDate ? formatDate(l.deliveryDate) : 'N/A',
        'Delivery Location': l.deliveryLocation.toUpperCase(), 
        'Total Miles': l.totalMiles,
        'Payment Type': l.paymentType, 
        'Revenue': l.totalRevenue, 
        'Truck Unit': trucks.find(t => t.id === l.truckId)?.unitNumber || 'N/A'
    })), [loadRecords, trucks]);

    return (
        <div className="container-fluid py-2 animate-slide-up pb-5 mb-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h1 className="fw-800 tracking-tight text-black mb-1">Dispatch Hub</h1>
                    <p className="text-muted mb-0 small">USA Premium Load Planning & Management.</p>
                </div>
                <div className="d-flex gap-2 align-items-center">
                    <div className="btn-group p-1 bg-white rounded-3 shadow-sm border">
                        <button className={`btn btn-sm rounded-2 px-3 ${viewMode === 'planner' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`} onClick={() => setViewMode('planner')}><Calculator size={14} className="me-1"/> Trip Planner</button>
                        <button className={`btn btn-sm rounded-2 px-3 ${viewMode === 'register' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`} onClick={() => setViewMode('register')}><FileText size={14} className="me-1"/> Ledger</button>
                    </div>
                    <ExportMenu data={exportData} filename="trucking_loads" />
                </div>
            </div>

            {viewMode === 'planner' ? (
                <div className="row g-4">
                    <div className="col-12 col-xl-8">
                        <Card className="shadow-lg border-0 overflow-hidden">
                            <CardHeader className="bg-white pb-0 pt-4 px-4 px-md-5">
                                <CardTitle className="d-flex align-items-center gap-2">
                                    <Route className="text-primary" size={24} />
                                    Trip Cost & Revenue Planner
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 p-md-5">
                                <form onSubmit={handleSave}>
                                    {saveError && (
                                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 border-0 shadow-sm">
                                            <AlertTriangle size={18} />
                                            <span className="small fw-bold">{saveError}</span>
                                        </div>
                                    )}
                                    <div className="d-flex flex-column gap-4">
                                        <div className="p-3 rounded-4 bg-light border border-2 border-dashed">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width: 24, height: 24, fontSize: '10px'}}>1</div>
                                                <h6 className="fw-800 text-dark mb-0 small text-uppercase ls-1">Current Origin</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small text-muted">Vehicle Location (City, ST)</label>
                                                    <div className="input-group input-group-lg shadow-sm rounded-3 overflow-hidden border">
                                                        <span className="input-group-text bg-white border-0"><MapPin size={20} className="text-muted"/></span>
                                                        <input type="text" className="form-control border-0 text-uppercase fw-bold" placeholder="E.G. CHICAGO, IL" value={formData.currentLocation} onChange={e => setFormData({...formData, currentLocation: e.target.value.toUpperCase()})} required />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center py-0 opacity-25"><ArrowDown size={20} /></div>

                                        <div className="p-4 rounded-4 bg-subtle border">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width: 24, height: 24, fontSize: '10px'}}>2</div>
                                                <h6 className="fw-800 text-primary mb-0 small text-uppercase ls-1">Empty Leg (Deadhead)</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Deadhead Miles</label>
                                                    <div className="input-group">
                                                        <input type="number" className="form-control bg-white fw-bold" placeholder="0" value={formData.milesToPickup} onChange={e => setFormData({...formData, milesToPickup: Number(e.target.value)})} required />
                                                        <span className="input-group-text bg-white">mi</span>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Pickup Location</label>
                                                    <input type="text" className="form-control bg-white text-uppercase fw-bold" placeholder="PICKUP CITY, ST" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value.toUpperCase()})} required />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small">Pickup Date</label>
                                                    <input type="date" className="form-control bg-white fw-bold" value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center py-0 opacity-25"><ArrowDown size={20} /></div>

                                        <div className="p-4 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-25">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{width: 24, height: 24, fontSize: '10px'}}>3</div>
                                                <h6 className="fw-800 text-success mb-0 small text-uppercase ls-1">Loaded Leg</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Loaded Miles</label>
                                                    <div className="input-group">
                                                        <input type="number" className="form-control bg-white fw-bold" placeholder="0" value={formData.milesToDelivery} onChange={e => setFormData({...formData, milesToDelivery: Number(e.target.value)})} required />
                                                        <span className="input-group-text bg-white">mi</span>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Delivery Location</label>
                                                    <input type="text" className="form-control bg-white text-uppercase fw-bold" placeholder="DELIVERY CITY, ST" value={formData.deliveryLocation} onChange={e => setFormData({...formData, deliveryLocation: e.target.value.toUpperCase()})} required />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small">Delivery Date</label>
                                                    <input type="date" className="form-control bg-white fw-bold" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-4 bg-dark text-white shadow-sm mt-2 border-0">
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Payment Basis</label>
                                                    <select className="form-select bg-white bg-opacity-10 border-0 text-white fw-bold" value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value as PaymentType})}>
                                                        <option value={PaymentType.PER_MILE} className="text-dark">Per Mile Rate</option>
                                                        <option value={PaymentType.FLAT_LOAD} className="text-dark">Flat Load Amount</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Rate / Amount ($)</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-white bg-opacity-10 border-0 text-white">$</span>
                                                        <input type="number" className="form-control bg-white bg-opacity-10 border-0 text-white fw-bold" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} required />
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Assign Equipment</label>
                                                    <select className="form-select bg-white bg-opacity-10 border-0 text-white fw-bold" value={formData.truckId} onChange={e => setFormData({...formData, truckId: e.target.value})}>
                                                        <option value="" className="text-dark">Select Truck...</option>
                                                        {trucks.map(t => <option key={t.id} value={t.id} className="text-dark">{t.unitNumber} - {t.make}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 d-flex justify-content-end gap-3 border-top pt-4">
                                        <button type="submit" className="btn btn-black px-5 py-3 shadow-lg d-flex align-items-center gap-2 rounded-3 fw-900 fs-6" disabled={isSaving}>
                                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                            CONFIRM LOAD REGISTER
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="col-12 col-xl-4">
                        <Card className="bg-black text-white border-0 shadow-lg mb-4 rounded-4 position-sticky" style={{ top: '100px' }}>
                            <CardContent className="p-4">
                                <h6 className="text-white text-opacity-50 fw-800 text-uppercase small mb-4 ls-1">Trip Economics (USA)</h6>
                                <div className="d-flex flex-column gap-3">
                                    <div className="d-flex justify-content-between align-items-center p-2 rounded-3 hover-bg-white hover-bg-opacity-5">
                                        <span className="text-white text-opacity-75">Empty Miles</span>
                                        <span className="fw-700">{formatNumber(Number(formData.milesToPickup) || 0)} mi</span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center p-2 rounded-3 hover-bg-white hover-bg-opacity-5">
                                        <span className="text-white text-opacity-75">Loaded Miles</span>
                                        <span className="fw-700 text-success">{formatNumber(Number(formData.milesToDelivery) || 0)} mi</span>
                                    </div>
                                    <div className="mt-2 pt-3 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
                                        <span className="fw-bold fs-6">Total Trip Distance</span>
                                        <span className="fw-900 fs-4">{formatNumber(totalMiles)} mi</span>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-top border-white border-opacity-20 text-center">
                                        <small className="text-white text-opacity-50 text-uppercase ls-1 fw-bold">Projected Revenue</small>
                                        <h2 className="fw-900 fs-1 text-success mt-2 mb-0 tracking-tight">{formatCurrency(totalRevenue)}</h2>
                                        {formData.paymentType === PaymentType.PER_MILE && totalMiles > 0 && (
                                            <div className="badge bg-white bg-opacity-10 mt-2 px-3 py-2 text-white text-opacity-50">
                                                {formatCurrency(Number(formData.rate) || 0)} / mile
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    <div className="col-12">
                        <Card className="shadow-lg border-0 rounded-4">
                            <CardContent className="p-0">
                                <div className="table-responsive border-0">
                                    <table className="table align-middle mb-0 table-hover">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4 py-3 fw-800 text-muted small text-uppercase">Route Leg (Pickup → Delivery)</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase text-center">Distance</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase text-center">Assign</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase text-end">Gross Revenue</th>
                                                <th className="pe-4 py-3 fw-800 text-muted small text-uppercase text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadRecords.map(l => (
                                                <tr key={l.id} className="border-bottom border-light">
                                                    <td className="ps-4 py-4">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="p-2 bg-light rounded-3 text-primary"><MapIcon size={20}/></div>
                                                            <div>
                                                                <span className="fw-800 text-dark d-block">
                                                                    {l.pickupLocation} <ArrowRight size={14} className="mx-1 text-muted"/> {l.deliveryLocation}
                                                                </span>
                                                                <small className="text-muted">{l.pickupDate ? formatDate(l.pickupDate) : 'TBD'}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <span className="fw-700 text-dark">{formatNumber(l.totalMiles)} mi</span>
                                                        <br/>
                                                        <small className="text-muted" style={{fontSize: '0.65rem'}}>{formatNumber(l.milesToPickup)} DH | {formatNumber(l.milesToDelivery)} LOADED</small>
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <span className="badge bg-light text-dark border fw-bold">
                                                            {trucks.find(t => t.id === l.truckId)?.unitNumber || 'UNASSIGNED'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-end">
                                                        <div className="fw-900 text-success fs-5">{formatCurrency(l.totalRevenue)}</div>
                                                        <small className="text-muted" style={{fontSize: '0.65rem'}}>{l.paymentType === PaymentType.PER_MILE ? `${formatCurrency(l.rate)}/mi` : 'Flat Rate'}</small>
                                                    </td>
                                                    <td className="pe-4 py-4 text-end">
                                                        <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                                                            <button className="btn btn-sm btn-white border-0" onClick={() => handleOpenModal(l)}><Edit2 size={16} className="text-muted"/></button>
                                                            <button className="btn btn-sm btn-white border-0 text-danger" onClick={() => deleteLocalLoad(l.id)}><Trash2 size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {loadRecords.length === 0 && (
                                                <tr><td colSpan={5} className="text-center py-5 text-muted">
                                                    <div className="py-5">
                                                        <MapIcon size={48} className="text-muted mb-3 opacity-25" />
                                                        <p className="fw-bold mb-0">No Load Records Found</p>
                                                        <small>Use the Trip Planner to create your first dispatch entry.</small>
                                                    </div>
                                                </td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => !isSaving && setIsModalOpen(false)} title="Update Load Documentation" size="lg">
                <form onSubmit={handleSave}>
                     {saveError && <div className="alert alert-danger small py-2 border-0 shadow-sm mb-4">{saveError}</div>}
                     <div className="row g-4">
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Pickup Location (City, ST)</label>
                            <input type="text" className="form-control fw-bold text-uppercase" value={formData.pickupLocation} onChange={e => setFormData({...formData, pickupLocation: e.target.value.toUpperCase()})} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Delivery Location (City, ST)</label>
                            <input type="text" className="form-control fw-bold text-uppercase" value={formData.deliveryLocation} onChange={e => setFormData({...formData, deliveryLocation: e.target.value.toUpperCase()})} required />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Deadhead Miles</label>
                            <input type="number" className="form-control fw-bold" value={formData.milesToPickup} onChange={e => setFormData({...formData, milesToPickup: Number(e.target.value)})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Loaded Miles</label>
                            <input type="number" className="form-control fw-bold" value={formData.milesToDelivery} onChange={e => setFormData({...formData, milesToDelivery: Number(e.target.value)})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Rate / Amount</label>
                            <div className="input-group">
                                <span className="input-group-text">$</span>
                                <input type="number" className="form-control fw-bold" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Assigned Truck</label>
                            <select className="form-select fw-bold" value={formData.truckId} onChange={e => setFormData({...formData, truckId: e.target.value})}>
                                <option value="">None</option>
                                {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber}</option>)}
                            </select>
                        </div>
                     </div>
                     <div className="d-flex justify-content-end gap-2 mt-5 pt-3 border-top">
                        <button type="button" className="btn btn-white border px-4 fw-bold" onClick={() => setIsModalOpen(false)}>Discard</button>
                        <button type="submit" className="btn btn-black px-5 fw-900" disabled={isSaving}>
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Save Trip Update'}
                        </button>
                     </div>
                </form>
            </Modal>
        </div>
    );
};

export default Loads;
