
import React, { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { TransactionType } from '../types';
import { formatCurrency } from '../lib/utils';
import { CalendarRange, Lock, Unlock, TrendingUp, TrendingDown, Eye, Landmark, Edit3, Save, AlertTriangle, FileText, CheckCircle, Calendar } from 'lucide-react';
import Modal from './ui/Modal';
import { useData } from '../lib/DataContext';

const FiscalYears: React.FC = () => {
    // Consume Data
    const { transactions } = useData();

    // State to store manually entered balances. Key is the year, value is the balance amount.
    const [manualBalances, setManualBalances] = useState<{[key: number]: number}>({});
    
    // State to store year statuses (Open/Closed). Default is empty (derived logic used if missing)
    const [yearStatuses, setYearStatuses] = useState<{[key: number]: 'Open' | 'Closed'}>({});

    // State to store notes for closing
    const [closingNotes, setClosingNotes] = useState<{[key: number]: string}>({});

    // Modal State
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [activeYear, setActiveYear] = useState<number | null>(null);
    
    // Form State
    const [formStatus, setFormStatus] = useState<'Open' | 'Closed'>('Open');
    const [formBalance, setFormBalance] = useState('');
    const [formNotes, setFormNotes] = useState('');

    // 1. Extract Years from data
    const years = Array.from<number>(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);

    // Helper to determine status (State > Default Logic)
    const getStatus = (year: number) => {
        if (yearStatuses[year]) return yearStatuses[year];
        const currentYear = new Date().getFullYear();
        return year === currentYear ? 'Open' : 'Closed';
    };

    const handleOpenManageModal = (year: number, currentCalculatedBalance: number, currentStatus: 'Open' | 'Closed') => {
        setActiveYear(year);
        setFormStatus(currentStatus);
        
        // Pre-fill balance: Manual if exists, else System Calculated
        const existingBalance = manualBalances[year] !== undefined ? manualBalances[year] : currentCalculatedBalance;
        setFormBalance(existingBalance.toString());

        // Pre-fill notes
        setFormNotes(closingNotes[year] || '');

        setIsManageModalOpen(true);
    };

    const handleSavePeriod = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeYear !== null) {
            // Update Status
            setYearStatuses(prev => ({...prev, [activeYear]: formStatus}));

            // Update Balance
            if (formBalance !== '') {
                setManualBalances(prev => ({...prev, [activeYear]: parseFloat(formBalance)}));
            }

            // Update Notes
            setClosingNotes(prev => ({...prev, [activeYear]: formNotes}));

            setIsManageModalOpen(false);
        }
    };

    // 2. Calculate stats per year
    const yearStats = years.map(year => {
        const yearTrans = transactions.filter(t => new Date(t.date).getFullYear() === year);
        
        const income = yearTrans
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expense = yearTrans
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);

        const net = income - expense;
        const count = yearTrans.length;

        // System calculation for reference (Cumulative)
        const systemCalculatedBalance = transactions
            .filter(t => new Date(t.date).getFullYear() <= year)
            .reduce((acc, t) => {
                return t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount;
            }, 0);

        // Determine which balance to show
        const displayBalance = manualBalances[year] !== undefined ? manualBalances[year] : systemCalculatedBalance;
        const isManual = manualBalances[year] !== undefined;

        const status = getStatus(year);
        const notes = closingNotes[year];

        return { year, income, expense, net, count, status, displayBalance, isManual, systemCalculatedBalance, notes };
    });

    // Get the stats for the currently active year in the modal
    const activeStat = activeYear ? yearStats.find(s => s.year === activeYear) : null;

    return (
        <div className="mb-5">
             <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Fiscal Years & Periods</h2>
                  <p className="text-muted mb-0">Open or close accounting periods and reconcile balances.</p>
                </div>
            </div>

            <div className="row g-4 mb-4">
                {yearStats.map(stat => (
                    <div className="col-12" key={stat.year}>
                        <Card className={`border-start border-4 ${stat.status === 'Closed' ? 'border-secondary bg-light bg-opacity-25' : (stat.net >= 0 ? 'border-success' : 'border-danger')}`}>
                            <div className="card-body p-4">
                                <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-4">
                                    
                                    {/* Year & Status */}
                                    <div className="d-flex align-items-center gap-3" style={{minWidth: '200px'}}>
                                        <div className={`rounded p-3 text-center ${stat.status === 'Closed' ? 'bg-secondary text-white' : 'bg-light text-dark'}`} style={{minWidth: '80px'}}>
                                            <h4 className="fw-bold mb-0">{stat.year}</h4>
                                        </div>
                                        <div>
                                            <div className={`badge rounded-pill d-inline-flex align-items-center mb-1 ${stat.status === 'Open' ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary text-white'}`}>
                                                {stat.status === 'Open' ? <Unlock size={12} className="me-1"/> : <Lock size={12} className="me-1"/>}
                                                {stat.status.toUpperCase()}
                                            </div>
                                            <p className="text-muted small mb-0">{stat.count} Transactions</p>
                                        </div>
                                    </div>

                                    {/* Financials */}
                                    <div className="flex-grow-1 d-flex flex-wrap gap-4 gap-md-5 justify-content-start justify-content-xl-center">
                                        <div className="d-flex align-items-center">
                                            <div className="rounded-circle bg-success bg-opacity-10 p-2 me-2 text-success">
                                                <TrendingUp size={18} />
                                            </div>
                                            <div>
                                                <small className="text-muted d-block text-uppercase" style={{fontSize: '0.7rem'}}>Income</small>
                                                <span className="fw-bold text-dark">{formatCurrency(stat.income)}</span>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-2 text-danger">
                                                <TrendingDown size={18} />
                                            </div>
                                            <div>
                                                <small className="text-muted d-block text-uppercase" style={{fontSize: '0.7rem'}}>Expenses</small>
                                                <span className="fw-bold text-dark">{formatCurrency(stat.expense)}</span>
                                            </div>
                                        </div>
                                        <div className="vr d-none d-md-block text-muted opacity-25"></div>
                                        
                                        {/* Net Profit */}
                                        <div className="d-flex align-items-center">
                                            <div className={`rounded-circle bg-opacity-10 p-2 me-2 ${stat.net >= 0 ? 'bg-primary text-primary' : 'bg-danger text-danger'}`}>
                                                <span className="fw-bold" style={{fontSize: '1.2rem'}}>=</span>
                                            </div>
                                            <div>
                                                <small className="text-muted d-block text-uppercase" style={{fontSize: '0.7rem'}}>Net Profit</small>
                                                <span className={`fw-bold ${stat.net >= 0 ? 'text-dark' : 'text-danger'}`}>{formatCurrency(stat.net)}</span>
                                            </div>
                                        </div>

                                         <div className="vr d-none d-md-block text-muted opacity-25"></div>
                                         
                                         {/* Closing Balance */}
                                         <div className="d-flex align-items-center">
                                            <div className={`rounded-circle bg-opacity-10 p-2 me-2 ${stat.displayBalance >= 0 ? 'bg-info text-info' : 'bg-warning text-warning'}`}>
                                                <Landmark size={18} />
                                            </div>
                                            <div className="position-relative">
                                                <small className="text-muted d-block text-uppercase d-flex align-items-center gap-1" style={{fontSize: '0.7rem'}}>
                                                    Closing Bal. (12/31)
                                                    {stat.isManual && <span className="badge bg-secondary text-white p-0 px-1" style={{fontSize: '0.6rem'}}>Manual</span>}
                                                </small>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className={`fw-bold ${stat.displayBalance >= 0 ? 'text-dark' : 'text-danger'}`}>{formatCurrency(stat.displayBalance)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="d-flex justify-content-end align-items-center gap-2">
                                        <button 
                                            className={`btn btn-sm d-flex align-items-center shadow-sm ${stat.status === 'Open' ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => handleOpenManageModal(stat.year, stat.systemCalculatedBalance, stat.status)}
                                        >
                                            {stat.status === 'Open' ? <Unlock size={16} className="me-2"/> : <Lock size={16} className="me-2"/>}
                                            {stat.status === 'Open' ? 'Manage Period' : 'Period Closed'}
                                        </button>
                                    </div>
                                </div>
                                {stat.notes && (
                                    <div className="mt-3 pt-3 border-top d-flex align-items-start text-muted small">
                                        <FileText size={14} className="me-2 mt-1 flex-shrink-0" />
                                        <span><span className="fw-bold">Closing Notes:</span> {stat.notes}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                ))}
            </div>

            {/* Manage Period Modal */}
            <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title={`Manage Fiscal Period: ${activeYear}`}>
                <form onSubmit={handleSavePeriod}>
                    
                    {/* Period Date Display */}
                    <div className="d-flex align-items-center mb-4 p-2 bg-light rounded border text-muted">
                         <CalendarRange size={18} className="me-2 text-primary" />
                         <span className="fw-medium small">Period: <span className="text-dark">Jan 1, {activeYear} – Dec 31, {activeYear}</span></span>
                    </div>

                    {/* Movement Summary */}
                    {activeStat && (
                        <div className="card border-0 bg-light bg-opacity-50 mb-4 shadow-sm">
                            <div className="card-body p-3">
                                <h6 className="fw-bold text-dark small text-uppercase mb-3 d-flex align-items-center">
                                    <Landmark size={14} className="me-2" />
                                    Period Movement
                                </h6>
                                <div className="row g-0 text-center">
                                    <div className="col border-end">
                                        <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>Total Income</small>
                                        <span className="fw-bold text-success">{formatCurrency(activeStat.income)}</span>
                                    </div>
                                    <div className="col border-end">
                                        <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>Total Expenses</small>
                                        <span className="fw-bold text-danger">{formatCurrency(activeStat.expense)}</span>
                                    </div>
                                    <div className="col">
                                        <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>Net Profit</small>
                                        <span className={`fw-bold ${activeStat.net >= 0 ? 'text-dark' : 'text-danger'}`}>{formatCurrency(activeStat.net)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Status Toggle */}
                    <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase mb-2">Period Status</label>
                        <div className="d-flex gap-2">
                            <div 
                                onClick={() => setFormStatus('Open')}
                                className={`flex-fill p-3 rounded border text-center cursor-pointer transition-all ${formStatus === 'Open' ? 'bg-white border-success shadow-sm' : 'bg-light text-muted opacity-50'}`}
                                style={{cursor: 'pointer'}}
                            >
                                <Unlock size={24} className={`mb-2 ${formStatus === 'Open' ? 'text-success' : 'text-secondary'}`} />
                                <div className={`fw-bold ${formStatus === 'Open' ? 'text-success' : ''}`}>OPEN</div>
                                <small className="d-block text-muted" style={{fontSize: '0.75rem'}}>Unlocked</small>
                            </div>

                            <div 
                                onClick={() => setFormStatus('Closed')}
                                className={`flex-fill p-3 rounded border text-center cursor-pointer transition-all ${formStatus === 'Closed' ? 'bg-white border-primary shadow-sm' : 'bg-light text-muted opacity-50'}`}
                                style={{cursor: 'pointer'}}
                            >
                                <Lock size={24} className={`mb-2 ${formStatus === 'Closed' ? 'text-primary' : 'text-secondary'}`} />
                                <div className={`fw-bold ${formStatus === 'Closed' ? 'text-primary' : ''}`}>CLOSED</div>
                                <small className="d-block text-muted" style={{fontSize: '0.75rem'}}>Locked</small>
                            </div>
                        </div>
                    </div>

                    {/* Closing Balance Input */}
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted text-uppercase">Closing Balance (Dec 31)</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input 
                                type="number" 
                                className="form-control fw-bold" 
                                step="0.01" 
                                value={formBalance} 
                                onChange={(e) => setFormBalance(e.target.value)} 
                            />
                        </div>
                        <div className="form-text text-muted small">
                            {formStatus === 'Closed' 
                                ? <span className="text-primary"><CheckCircle size={12} className="me-1"/>Confirmed final balance for tax purposes.</span>
                                : 'Calculated automatically, but can be adjusted manually.'
                            }
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-3">
                        <label className="form-label fw-bold small text-muted text-uppercase">Notes / Adjustments</label>
                        <textarea 
                            className="form-control" 
                            rows={3} 
                            placeholder="e.g. Adjusted for depreciation entry..."
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Warning if Closing */}
                    {formStatus === 'Closed' && (
                        <div className="alert alert-warning d-flex align-items-start small p-2 mb-3">
                            <AlertTriangle size={16} className="me-2 mt-1 flex-shrink-0" />
                            <div>
                                <strong>Warning:</strong> Closing this period indicates that all transactions are final.
                            </div>
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2 border-top pt-3">
                        <button type="button" className="btn btn-light" onClick={() => setIsManageModalOpen(false)}>Cancel</button>
                        <button type="submit" className={`btn ${formStatus === 'Closed' ? 'btn-primary' : 'btn-success'}`}>
                            <Save size={16} className="me-2"/>
                            {formStatus === 'Closed' ? 'Close Period' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default FiscalYears;
