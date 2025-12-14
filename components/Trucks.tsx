
import React, { useState } from 'react';
import Card from './ui/Card';
import { TransactionType, Truck, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { Wrench, Fuel, TrendingUp, TrendingDown, Edit2, Trash2, PlusCircle, Save } from 'lucide-react';
import { useData } from '../lib/DataContext';
import Modal from './ui/Modal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface TruckCardProps {
    truck: Truck;
    transactions: Transaction[];
    onEdit: (truck: Truck) => void;
    onDelete: (id: string) => void;
}

const TruckCard: React.FC<TruckCardProps> = ({ truck, transactions, onEdit, onDelete }) => {
    // Filter transactions for this truck
    const truckTransactions = transactions.filter(t => t.truck?.id === truck.id);
    
    const revenue = truckTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
        
    const expenses = truckTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

    const fuelCost = truckTransactions
        .filter(t => t.category?.name === 'Fuel')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const maintenanceCost = truckTransactions
        .filter(t => t.category?.name === 'Repairs & Maintenance')
        .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = revenue - expenses;
    const isProfitable = netProfit >= 0;

    return (
        <div className="card h-100 border-0 shadow-sm overflow-hidden hover-shadow transition-all group-action">
            {/* Top color strip */}
            <div className={`w-100 ${isProfitable ? 'bg-success' : 'bg-danger'}`} style={{height: '6px'}}></div>
            
            <div className="card-body p-4 d-flex flex-column position-relative">
                {/* Action Buttons (Top Right) */}
                <div className="position-absolute top-0 end-0 p-3">
                    <div className="btn-group shadow-sm">
                        <button 
                            onClick={() => onEdit(truck)} 
                            className="btn btn-sm btn-light text-primary bg-white border"
                            title="Edit Truck"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button 
                            onClick={() => onDelete(truck.id)} 
                            className="btn btn-sm btn-light text-danger bg-white border"
                            title="Delete Truck"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2">
                             <h4 className="fw-bold text-dark mb-0">{truck.unitNumber}</h4>
                             <span className="badge bg-light text-secondary border">{truck.year}</span>
                        </div>
                        <p className="text-muted small mb-0">{truck.make} {truck.model}</p>
                    </div>
                </div>

                <div className="flex-grow-1">
                    <div className="row g-2 mb-3 pb-3 border-bottom">
                         <div className="col-6">
                            <small className="text-muted fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>Revenue</small>
                            <p className="fw-bold text-dark mb-0">{formatCurrency(revenue)}</p>
                        </div>
                        <div className="col-6">
                            <small className="text-muted fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>Expenses</small>
                            <p className="fw-bold text-dark mb-0">{formatCurrency(expenses)}</p>
                        </div>
                    </div>
                    
                    <div className="d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between align-items-center small">
                            <div className="d-flex align-items-center text-muted">
                                <Fuel size={16} className="me-2 text-warning" />
                                <span>Fuel</span>
                            </div>
                            <span className="fw-medium text-dark">{formatCurrency(fuelCost)}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center small">
                            <div className="d-flex align-items-center text-muted">
                                <Wrench size={16} className="me-2 text-info" />
                                <span>Maintenance</span>
                            </div>
                            <span className="fw-medium text-dark">{formatCurrency(maintenanceCost)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-3 text-center text-white ${isProfitable ? 'bg-success bg-gradient' : 'bg-danger bg-gradient'}`}>
                <small className="text-white text-opacity-75 text-uppercase fw-bold" style={{fontSize: '0.7rem'}}>Net Profit</small>
                <h4 className="fw-bold mb-0">{formatCurrency(netProfit)}</h4>
            </div>
        </div>
    );
};


const Trucks: React.FC = () => {
    // Consume Data
    const { trucks, transactions, addLocalTruck, updateLocalTruck, deleteLocalTruck } = useData();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTruck, setEditingTruck] = useState<Truck | null>(null);

    // Form State
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

        const truckId = editingTruck ? editingTruck.id : `truck-${Date.now()}`;
        
        const truckObj: Truck = {
            id: truckId,
            ...formData
        };

        // 1. Optimistic Update (Always happens first)
        if (editingTruck) {
            updateLocalTruck(truckObj);
        } else {
            addLocalTruck(truckObj);
        }

        setIsModalOpen(false);

        // 2. Persist to DB (if configured)
        if (isSupabaseConfigured && supabase) {
            try {
                const payload = {
                    unit_number: formData.unitNumber,
                    make: formData.make,
                    model: formData.model,
                    year: formData.year
                };

                if (editingTruck) {
                    await supabase.from('trucks').update(payload).eq('id', truckId);
                } else {
                    await supabase.from('trucks').insert([payload]);
                }
            } catch (error) {
                console.error("Failed to save truck to DB", error);
                // Do NOT refresh data here, or the local optimistic update disappears.
                // Just log it, as the user is likely on a demo/offline connection.
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this truck?")) {
            // 1. Optimistic Delete
            deleteLocalTruck(id);

            // 2. DB Delete
            if (isSupabaseConfigured && supabase) {
                try {
                    const { error } = await supabase.from('trucks').delete().eq('id', id);
                    if (error) throw error;
                } catch (error) {
                    console.error("Failed to delete truck from DB", error);
                }
            }
        }
    };

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Fleet Management</h2>
                  <p className="text-muted mb-0">Monitor profitability per unit.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()} 
                    className="btn btn-primary d-flex align-items-center shadow-sm"
                >
                    <PlusCircle size={18} className="me-2" />
                    Add Truck
                </button>
            </div>
            
            <div className="row g-4">
                {trucks.length > 0 ? (
                    trucks.map(truck => (
                        <div className="col-12 col-md-6 col-xl-4" key={truck.id}>
                            <TruckCard 
                                truck={truck} 
                                transactions={transactions} 
                                onEdit={handleOpenModal}
                                onDelete={handleDelete}
                            />
                        </div>
                    ))
                ) : (
                    <div className="col-12 text-center py-5">
                        <div className="text-muted opacity-50 mb-3">
                            <PlusCircle size={48} />
                        </div>
                        <p className="text-muted">No trucks in your fleet yet.</p>
                        <button onClick={() => handleOpenModal()} className="btn btn-link">Add your first truck</button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTruck ? "Edit Truck" : "Add New Truck"}
            >
                <form onSubmit={handleSave}>
                    <div className="row g-3">
                        <div className="col-md-8">
                            <label className="form-label fw-bold small text-muted">Unit Number / ID</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="e.g. T-101"
                                value={formData.unitNumber}
                                onChange={e => setFormData({...formData, unitNumber: e.target.value})}
                                required
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label fw-bold small text-muted">Year</label>
                            <input 
                                type="number" 
                                className="form-control" 
                                placeholder="2023"
                                value={formData.year}
                                onChange={e => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Make</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="e.g. Freightliner"
                                value={formData.make}
                                onChange={e => setFormData({...formData, make: e.target.value})}
                                required
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-bold small text-muted">Model</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="e.g. Cascadia"
                                value={formData.model}
                                onChange={e => setFormData({...formData, model: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-light border">Cancel</button>
                        <button type="submit" className="btn btn-primary d-flex align-items-center">
                            <Save size={16} className="me-2" />
                            {editingTruck ? 'Save Changes' : 'Create Truck'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Trucks;
