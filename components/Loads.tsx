
import React, { useState, useMemo } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import { LoadRecord, PaymentType } from '../types';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { MapPin, Navigation, DollarSign, Save, Trash2, Edit2, ChevronRight, Calculator, FileText, Calendar, ArrowRight, Map as MapIcon, Info, ArrowDown, Loader2, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import ExportMenu from './ui/ExportMenu';

const Loads: React.FC = () => {
    const { loadRecords, addLocalLoad, updateLocalLoad, deleteLocalLoad, trucks } = useData();
    const [viewMode, setViewMode] = useState<'register' | 'planner'>('register');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoad, setEditingLoad] = useState<LoadRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Planner/Form State
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
    
    // Revenue logic
    const totalRevenue = formData.paymentType === PaymentType.PER_MILE 
        ? totalMiles * (Number(formData.rate) || 0)
        : (Number(formData.rate) || 0);

    // Calculated Effective Rate Per Mile (RPM)
    const effectiveRPM = totalMiles > 0 ? totalRevenue / totalMiles : 0;

    const handleOpenModal = (load?: LoadRecord) => {
        setSaveError(null);
        if (load) {
            setEditingLoad(load);
            setFormData({
                ...load,
                truckId: load.truckId || ''
            });
        } else {
            setEditingLoad(null);
            setFormData({
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
                truckId: formData.truckId || undefined,
                status: editingLoad ? editingLoad.status : 'Planned'
            };

            let result;
            if (editingLoad) {
                result = await updateLocalLoad(loadObj);
            } else {
                result = await addLocalLoad(loadObj);
            }

            if (result === false) {
                throw new Error("Cloud synchronization failed. This is usually caused by an invalid Supabase API Key, URL, or database schema mismatch (Ensure ID is UUID).");
            }

            setIsModalOpen(false);
            setViewMode('register');
        } catch (error: any) {
            console.error("Failed to save load:", error);
            setSaveError(error.message || "An unexpected error occurred while saving.");
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
        'Truck Unit': l.truckId || 'N/A'
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
                                            <span className="small">{saveError}</span>
                                        </div>
                                    )}
                                    <div className="d-flex flex-column gap-4">
                                        
                                        {/* STEP 1: ORIGIN */}
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
                                                        <input 
                                                            type="text" 
                                                            className="form-control border-start-0 text-uppercase" 
                                                            placeholder="WHERE IS THE TRUCK NOW?" 
                                                            style={{ textTransform: 'uppercase' }}
                                                            value={formData.currentLocation} 
                                                            onChange={e => setFormData({...formData, currentLocation: e.target.value.toUpperCase()})} 
                                                            required 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center py-0 opacity-25">
                                            <ArrowDown size={20} />
                                        </div>

                                        {/* STEP 2: DEADHEAD & PICKUP */}
                                        <div className="p-4 rounded-4 bg-subtle border">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24, fontSize: '10px'}}>2</div>
                                                <h6 className="fw-800 text-primary mb-0 small text-uppercase ls-1">Deadhead & Pickup</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Miles from Origin to Pickup</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-white border-end-0 text-muted small">Deadhead</span>
                                                        <input type="number" className="form-control border-start-0 bg-white" placeholder="0" value={formData.milesToPickup} onChange={e => setFormData({...formData, milesToPickup: Number(e.target.value)})} required />
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Pickup Location (City, ST)</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control bg-white text-uppercase" 
                                                        placeholder="WHERE IS THE LOAD?" 
                                                        style={{ textTransform: 'uppercase' }}
                                                        value={formData.pickupLocation} 
                                                        onChange={e => setFormData({...formData, pickupLocation: e.target.value.toUpperCase()})} 
                                                        required 
                                                    />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small">Pickup Date</label>
                                                    <input type="date" className="form-control bg-white" value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center py-0 opacity-25">
                                            <ArrowDown size={20} />
                                        </div>

                                        {/* STEP 3: LOADED & DELIVERY */}
                                        <div className="p-4 rounded-4 bg-subtle border border-success border-opacity-25">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24, fontSize: '10px'}}>3</div>
                                                <h6 className="fw-800 text-success mb-0 small text-uppercase ls-1">Loaded Leg & Delivery</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Miles from Pickup to Delivery</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-white border-end-0 text-muted small">Loaded</span>
                                                        <input type="number" className="form-control border-start-0 bg-white" placeholder="0" value={formData.milesToDelivery} onChange={e => setFormData({...formData, milesToDelivery: Number(e.target.value)})} required />
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small">Delivery Location (City, ST)</label>
                                                    <input 
                                                        type="text" 
                                                        className="form-control bg-white text-uppercase" 
                                                        placeholder="FINAL DESTINATION" 
                                                        style={{ textTransform: 'uppercase' }}
                                                        value={formData.deliveryLocation} 
                                                        onChange={e => setFormData({...formData, deliveryLocation: e.target.value.toUpperCase()})} 
                                                        required 
                                                    />
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small">Delivery Date</label>
                                                    <input type="date" className="form-control bg-white" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 4: FINANCIALS */}
                                        <div className="p-4 rounded-4 bg-dark text-white shadow-sm mt-2">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <div className="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24, fontSize: '10px'}}>4</div>
                                                <h6 className="fw-800 text-white mb-0 small text-uppercase ls-1">Rate & Dispatch</h6>
                                            </div>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Payment Basis</label>
                                                    <select className="form-select bg-white bg-opacity-10 border-0 text-white" value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value as PaymentType})}>
                                                        <option className="text-dark" value={PaymentType.PER_MILE}>Per Mile Rate</option>
                                                        <option className="text-dark" value={PaymentType.FLAT_LOAD}>Flat Load Amount</option>
                                                    </select>
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">
                                                        {formData.paymentType === PaymentType.PER_MILE ? 'Rate per Mile ($)' : 'Total Flat Rate ($)'}
                                                    </label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-white bg-opacity-10 border-0 text-white"><DollarSign size={16}/></span>
                                                        <input type="number" className="form-control bg-white bg-opacity-10 border-0 text-white" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} required />
                                                    </div>
                                                </div>
                                                <div className="col-md-12">
                                                    <label className="form-label fw-bold small text-white text-opacity-50">Assign Truck Unit</label>
                                                    <select className="form-select bg-white bg-opacity-10 border-0 text-white" value={formData.truckId} onChange={e => setFormData({...formData, truckId: e.target.value})}>
                                                        <option className="text-dark" value="">Select Unit...</option>
                                                        {trucks.map(t => <option key={t.id} className="text-dark" value={t.id}>{t.unitNumber} - {t.make}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 d-flex justify-content-end gap-3 border-top pt-4">
                                        <button type="button" className="btn btn-white border px-4 rounded-3 fw-bold" onClick={() => setViewMode('register')}>Discard Planner</button>
                                        <button type="submit" className="btn btn-black px-5 shadow-lg d-flex align-items-center gap-2 rounded-3 fw-800" disabled={isSaving}>
                                            {isSaving ? <Loader2 size={18} className="animate-spin me-2" /> : <Save size={18} className="me-2" />}
                                            Register Load
                                        </button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pre-Save Totalization Card */}
                    <div className="col-12 col-xl-4">
                        <div className="sticky-top" style={{ top: '100px', zIndex: 10 }}>
                            <Card className="bg-black text-white border-0 shadow-lg mb-4 rounded-4">
                                <CardContent className="p-4">
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <Calculator className="text-success" size={20} />
                                            <h6 className="text-white text-opacity-50 fw-800 text-uppercase small mb-0 ls-1">Trip Totalization</h6>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-white text-opacity-50 small">Deadhead Miles</span>
                                            <span className="fw-700">{formData.milesToPickup || 0} mi</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-white text-opacity-50 small">Loaded Miles</span>
                                            <span className="fw-700">{formData.milesToDelivery || 0} mi</span>
                                        </div>
                                        <div className="mt-2 pt-2 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center">
                                            <span className="text-white fw-bold">Total Distance</span>
                                            <span className="fw-800 fs-5 text-white">{totalMiles} mi</span>
                                        </div>
                                        
                                        {formData.paymentType === PaymentType.FLAT_LOAD && (
                                            <div className="d-flex justify-content-between align-items-center animate-slide-up bg-white bg-opacity-10 p-2 rounded-3">
                                                <span className="text-white text-opacity-50 small d-flex align-items-center">
                                                    Effective Rate <span title="Total Revenue / Total Miles"><Info size={12} className="ms-1 text-info opacity-50" /></span>
                                                </span>
                                                <span className="fw-800 text-info">{formatCurrency(effectiveRPM)}/mi</span>
                                            </div>
                                        )}

                                        {formData.paymentType === PaymentType.PER_MILE && (
                                             <div className="d-flex justify-content-between align-items-center animate-slide-up bg-white bg-opacity-10 p-2 rounded-3">
                                                <span className="text-white text-opacity-50 small">Stated Rate</span>
                                                <span className="fw-800 text-primary">{formatCurrency(Number(formData.rate) || 0)}/mi</span>
                                            </div>
                                        )}

                                        <div className="mt-3 pt-3 border-top border-white border-opacity-20 text-center">
                                            <small className="text-white text-opacity-50 text-uppercase ls-1" style={{fontSize: '0.65rem'}}>Estimated Revenue</small>
                                            <h2 className="fw-900 fs-1 text-success mt-1 mb-0">{formatCurrency(totalRevenue)}</h2>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-subtle border-0 rounded-4 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="d-flex align-items-center gap-2 mb-4">
                                        <Navigation className="text-primary" size={18} />
                                        <h6 className="mb-0 fw-800 small text-uppercase ls-1">Route Visualization</h6>
                                    </div>
                                    <div className="position-relative ps-4 border-start border-2 border-primary border-opacity-25 ms-2">
                                        <div className="mb-5 position-relative">
                                            <div className="position-absolute translate-middle-x start-0 ms-n3 bg-white border border-dark border-2 rounded-circle shadow-sm" style={{width: 14, height: 14, left: '-2px'}}></div>
                                            <div className="bg-white p-2 rounded-3 shadow-sm border border-light">
                                                <small className="text-muted fw-bold d-block ls-1 small mb-1" style={{fontSize: '0.6rem'}}>ORIGIN</small>
                                                <p className="fw-800 mb-0 small text-dark text-uppercase">{formData.currentLocation || 'STARTING POINT...'}</p>
                                            </div>
                                        </div>
                                        <div className="mb-5 position-relative">
                                            <div className="position-absolute translate-middle-x start-0 ms-n3 bg-primary border border-white border-2 rounded-circle shadow-sm" style={{width: 14, height: 14, left: '-2px'}}></div>
                                            <div className="bg-white p-2 rounded-3 shadow-sm border border-light">
                                                <small className="text-primary fw-bold d-block ls-1 small mb-1" style={{fontSize: '0.6rem'}}>PICKUP (+{formData.milesToPickup} mi)</small>
                                                <p className="fw-800 mb-0 small text-dark text-uppercase">{formData.pickupLocation || 'PICKUP LOCATION...'}</p>
                                            </div>
                                        </div>
                                        <div className="position-relative">
                                            <div className="position-absolute translate-middle-x start-0 ms-n3 bg-success border border-white border-2 rounded-circle shadow-sm" style={{width: 14, height: 14, left: '-2px'}}></div>
                                            <div className="bg-white p-2 rounded-3 shadow-sm border border-light">
                                                <small className="text-success fw-bold d-block ls-1 small mb-1" style={{fontSize: '0.6rem'}}>DELIVERY (+{formData.milesToDelivery} mi)</small>
                                                <p className="fw-800 mb-0 small text-dark text-uppercase">{formData.deliveryLocation || 'DELIVERY LOCATION...'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    <div className="col-12">
                        <Card className="shadow-lg border-0">
                            <CardContent className="p-0">
                                <div className="table-responsive border-0">
                                    <table className="table align-middle mb-0 table-hover table-sticky-header">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4 py-3 fw-800 text-muted small text-uppercase sticky-column">Route Leg</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase">Distance</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase">Payment Info</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase text-end">Projected Pay</th>
                                                <th className="py-3 fw-800 text-muted small text-uppercase text-center">Unit</th>
                                                <th className="pe-4 py-3 fw-800 text-muted small text-uppercase text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadRecords.map(l => {
                                                const rpm = l.totalMiles > 0 ? l.totalRevenue / l.totalMiles : 0;
                                                return (
                                                    <tr key={l.id} className="border-bottom">
                                                        <td className="ps-4 py-4 sticky-column bg-white">
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div className="bg-subtle p-2 rounded-3 text-primary"><Navigation size={18}/></div>
                                                                <div>
                                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                                        <span className="fw-800 text-black text-uppercase">{l.pickupLocation}</span>
                                                                        <ArrowRight size={14} className="text-muted" />
                                                                        <span className="fw-800 text-black text-uppercase">{l.deliveryLocation}</span>
                                                                    </div>
                                                                    <div className="d-flex gap-3 text-muted" style={{fontSize: '0.75rem'}}>
                                                                        <span><Calendar size={12} className="me-1"/> {l.pickupDate ? formatDate(l.pickupDate) : 'TBD'}</span>
                                                                        <span className="text-truncate text-uppercase" style={{maxWidth: '120px'}}>Origin: {l.currentLocation}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="d-flex flex-column">
                                                                <span className="fw-700 text-dark">{l.totalMiles} mi</span>
                                                                <small className="text-muted" style={{fontSize: '0.65rem'}}>{l.milesToPickup} dh / {l.milesToDelivery} loaded</small>
                                                            </div>
                                                        </td>
                                                        <td className="py-4">
                                                            <span className={`badge rounded-pill px-3 py-2 ${l.paymentType === PaymentType.PER_MILE ? 'bg-primary bg-opacity-10 text-primary' : 'bg-info bg-opacity-10 text-info'}`}>
                                                                {l.paymentType}
                                                            </span>
                                                            <div className="mt-1 small text-muted" style={{fontSize: '0.65rem'}}>
                                                                {l.paymentType === PaymentType.PER_MILE 
                                                                    ? `${formatCurrency(l.rate)}/mi` 
                                                                    : `Flat (${formatCurrency(rpm)}/mi)`}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-end">
                                                            <span className="fw-800 text-success fs-5">{formatCurrency(l.totalRevenue)}</span>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            <span className="badge bg-light text-muted border px-3 py-2">{trucks.find(t => t.id === l.truckId)?.unitNumber || 'N/A'}</span>
                                                        </td>
                                                        <td className="pe-4 py-4 text-end">
                                                            <div className="btn-group shadow-sm bg-white rounded-3 border">
                                                                <button className="btn btn-sm px-3 py-2 border-0 text-muted hover-bg-subtle" onClick={() => handleOpenModal(l)}><Edit2 size={14}/></button>
                                                                <button className="btn btn-sm px-3 py-2 border-0 text-danger hover-bg-subtle" onClick={() => deleteLocalLoad(l.id)}><Trash2 size={14}/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {loadRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-5">
                                                        <div className="bg-subtle d-inline-flex p-4 rounded-circle mb-3"><Calculator size={32} className="text-muted" /></div>
                                                        <h5 className="fw-800 text-muted">No loads registered yet</h5>
                                                        <button className="btn btn-black mt-3 px-4 rounded-3 fw-bold shadow" onClick={() => setViewMode('planner')}>Start Planning Trips</button>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Edit Modal (Simplified Form) */}
            <Modal isOpen={isModalOpen} onClose={() => !isSaving && setIsModalOpen(false)} title="Update Load Record" size="lg">
                <form onSubmit={handleSave}>
                     {saveError && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                            <AlertTriangle size={18} />
                            <span className="small">{saveError}</span>
                        </div>
                     )}
                     <div className="row g-3">
                        <div className="col-md-12">
                            <label className="form-label fw-bold small text-muted">Current Location</label>
                            <input 
                                type="text" 
                                className="form-control bg-light border-0 rounded-3 text-uppercase" 
                                style={{ textTransform: 'uppercase' }}
                                value={formData.currentLocation} 
                                onChange={e => setFormData({...formData, currentLocation: e.target.value.toUpperCase()})} 
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Pickup Location</label>
                            <input 
                                type="text" 
                                className="form-control bg-light border-0 rounded-3 text-uppercase" 
                                style={{ textTransform: 'uppercase' }}
                                value={formData.pickupLocation} 
                                onChange={e => setFormData({...formData, pickupLocation: e.target.value.toUpperCase()})} 
                                required 
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Delivery Location</label>
                            <input 
                                type="text" 
                                className="form-control bg-light border-0 rounded-3 text-uppercase" 
                                style={{ textTransform: 'uppercase' }}
                                value={formData.deliveryLocation} 
                                onChange={e => setFormData({...formData, deliveryLocation: e.target.value.toUpperCase()})} 
                                required 
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Deadhead Miles (Origin to Pickup)</label>
                            <input type="number" className="form-control bg-light border-0 rounded-3" value={formData.milesToPickup} onChange={e => setFormData({...formData, milesToPickup: Number(e.target.value)})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Loaded Miles (Pickup to Delivery)</label>
                            <input type="number" className="form-control bg-light border-0 rounded-3" value={formData.milesToDelivery} onChange={e => setFormData({...formData, milesToDelivery: Number(e.target.value)})} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Payment Type</label>
                            <select className="form-select bg-light border-0 rounded-3" value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value as PaymentType})}>
                                <option value={PaymentType.PER_MILE}>Per Mile</option>
                                <option value={PaymentType.FLAT_LOAD}>Flat Load</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Rate / Revenue</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light border-0 rounded-start-3">$</span>
                                <input type="number" step="0.01" className="form-control bg-light border-0 rounded-end-3" value={formData.rate} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} />
                            </div>
                        </div>
                        <div className="col-md-12">
                            <label className="form-label fw-bold small text-muted">Assign Truck Unit</label>
                            <select className="form-select bg-light border-0 rounded-3" value={formData.truckId} onChange={e => setFormData({...formData, truckId: e.target.value})}>
                                <option value="">Select Unit...</option>
                                {trucks.map(t => <option key={t.id} value={t.id}>{t.unitNumber} - {t.make}</option>)}
                            </select>
                        </div>
                     </div>
                     <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                        <button type="button" className="btn btn-light rounded-3 px-4" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-black rounded-3 px-4" disabled={isSaving}>
                            {isSaving ? <Loader2 size={18} className="animate-spin me-2" /> : <Save size={18} className="me-2" />}
                            Update Record
                        </button>
                     </div>
                </form>
            </Modal>
        </div>
    );
};

export default Loads;
