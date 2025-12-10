
import React from 'react';
import Card from './ui/Card';
import { TransactionType, Truck, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { Wrench, Fuel, TrendingUp, TrendingDown } from 'lucide-react';
import { useData } from '../lib/DataContext';


const TruckCard: React.FC<{ truck: Truck, transactions: Transaction[] }> = ({ truck, transactions }) => {
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
        <div className="card h-100 border-0 shadow-sm overflow-hidden hover-shadow transition-all">
            {/* Top color strip */}
            <div className={`w-100 ${isProfitable ? 'bg-success' : 'bg-danger'}`} style={{height: '6px'}}></div>
            
            <div className="card-body p-4 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2">
                             <h4 className="fw-bold text-dark mb-0">{truck.unitNumber}</h4>
                             <span className="badge bg-light text-secondary border">{truck.year}</span>
                        </div>
                        <p className="text-muted small mb-0">{truck.make} {truck.model}</p>
                    </div>
                     <div className={`rounded-circle p-2 ${isProfitable ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                        {isProfitable ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
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
    const { trucks, transactions } = useData();

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Fleet Management</h2>
                  <p className="text-muted mb-0">Monitor profitability per unit.</p>
                </div>
            </div>
            <div className="row g-4">
                {trucks.map(truck => (
                    <div className="col-12 col-md-6 col-xl-4" key={truck.id}>
                        <TruckCard truck={truck} transactions={transactions} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Trucks;
