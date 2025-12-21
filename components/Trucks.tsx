import React, { useState } from 'react';
import Card, { CardContent } from './ui/Card';
import { Truck } from '../types';
import { useData } from '../lib/DataContext';
import { generateId } from '../lib/utils';
import { PlusCircle, Search, Edit2, Trash2, Truck as TruckIcon, Save } from 'lucide-react';
import Modal from './ui/Modal';

/**
 * Trucks component for managing the fleet inventory.
 */
const Trucks: React.FC = () => {
    const { trucks, addLocalTruck, updateLocalTruck, deleteLocalTruck } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<Omit<Truck, 'id'>>({
        unitNumber: '',
        make: '',
        model: '',
        year: new Date().getFullYear()
    });

    const handleOpenModal = (truck?: Truck) => {
        if (truck) {
            setEditingTruck(truck);
            setFormData({
                unitNumber: truck.unitNumber,
                make: truck.make,
                model: truck.model,
                year: truck.year
            });
        } else {
            setEditingTruck(null);
            setFormData({
                unitNumber: '',
                make: '',
                model: '',
                year: new Date().getFullYear()
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const truckId = editingTruck ? editingTruck.id : generateId();
        const truckObj: Truck = {
            id: truckId,
            ...formData
        };

        if (editingTruck) {
            await updateLocalTruck(truckObj);
        } else {
            await addLocalTruck(truckObj);
        }
        setIsModalOpen(false);
    };

    const filteredTrucks = trucks.filter(t => 
        t.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Fleet / Trucks</h2>
                  <p className="text-muted mb-0">Manage your active vehicle inventory.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="btn btn-primary d-flex align-items-center">
                    <PlusCircle size={18} className="me-2" /> Add Truck
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
                                placeholder="Search unit number, make..." 
                                className="form-control ps-5 bg-light border-0" 
                            />
                        </div>
                    </div>

                    <div className="row g-3">
                        {filteredTrucks.map(truck => (
                            <div key={truck.id} className="col-12 col-md-6 col-lg-4">
                                <div className="card h-100 border bg-white shadow-sm hover-shadow transition-all">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                                <TruckIcon size={24} />
                                            </div>
                                            <div className="btn-group">
                                                <button className="btn btn-link text-primary p-1" onClick={() => handleOpenModal(truck)}><Edit2 size={16} /></button>
                                                <button className="btn btn-link text-danger p-1" onClick={() => deleteLocalTruck(truck.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <h5 className="fw-bold text-dark mb-1">Unit {truck.unitNumber}</h5>
                                        <p className="text-muted small mb-3">{truck.year} {truck.make} {truck.model}</p>
                                        <div className="border-top pt-3">
                                            <span className="badge bg-light text-muted border">Active Fleet</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal title={editingTruck ? "Edit Truck" : "Add New Truck"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSave}>
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted">Unit Number</label>
                        <input type="text" className="form-control" value={formData.unitNumber} onChange={e => setFormData({...formData, unitNumber: e.target.value})} required />
                    </div>
                    <div className="row">
                        <div className="col-6 mb-3">
                            <label className="form-label fw-bold small text-muted">Make</label>
                            <input type="text" className="form-control" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} required />
                        </div>
                        <div className="col-6 mb-3">
                            <label className="form-label fw-bold small text-muted">Model</label>
                            <input type="text" className="form-control" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} required />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted">Year</label>
                        <input type="number" className="form-control" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || 0})} required />
                    </div>
                    <button type="submit" className="btn btn-primary w-100 py-2 fw-bold">
                        <Save size={18} className="me-2" />
                        {editingTruck ? 'Save Changes' : 'Add Truck'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Trucks;