
import React, { useState, useMemo } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { TransactionType, Category, Transaction } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Download, Calendar, LayoutList, Table as TableIcon, ChevronRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useData } from '../lib/DataContext';

type ViewMode = 'standard' | 'monthly';

const Reports: React.FC = () => {
    const { transactions, categories } = useData();
    const [viewMode, setViewMode] = useState<ViewMode>('standard');
    
    // Year Selection Logic
    const availableYears = useMemo(() => {
        const years = Array.from<number>(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
        return years.length > 0 ? years : [new Date().getFullYear()];
    }, [transactions]);
    
    const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Filter transactions by selected year
    const yearTransactions = useMemo(() => {
        return transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
    }, [transactions, selectedYear]);

    // Derived lists
    const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

    // Standard View Calculations
    const calculateTotalForCategory = (categoryId: string) => {
        return yearTransactions
            .filter(t => t.category && t.category.id === categoryId)
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const totalIncome = yearTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = yearTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    // Monthly View Matrix Helper
    const getMonthlyData = (category: Category) => {
        const monthlyTotals = new Array(12).fill(0);
        yearTransactions
            .filter(t => t.category && t.category.id === category.id)
            .forEach(t => {
                const monthIdx = new Date(t.date).getMonth();
                monthlyTotals[monthIdx] += t.amount;
            });
        return monthlyTotals;
    };

    const getMonthlyTotalsByType = (type: TransactionType) => {
        const monthlyTotals = new Array(12).fill(0);
        yearTransactions
            .filter(t => t.type === type)
            .forEach(t => {
                const monthIdx = new Date(t.date).getMonth();
                monthlyTotals[monthIdx] += t.amount;
            });
        return monthlyTotals;
    };

    const incomeMonthlyTotals = getMonthlyTotalsByType(TransactionType.INCOME);
    const expenseMonthlyTotals = getMonthlyTotalsByType(TransactionType.EXPENSE);
    const netMonthlyTotals = incomeMonthlyTotals.map((inc, idx) => inc - expenseMonthlyTotals[idx]);

    return (
        <div className="container-fluid py-2 animate-slide-up">
            {/* Sticky Header Section */}
            <div className="sticky-report-header mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div>
                        <h1 className="fw-800 tracking-tight text-black mb-1">Profit & Loss</h1>
                        <p className="text-muted mb-0 small">Monitor company income statement and monthly performance.</p>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <div className="input-group w-auto shadow-sm me-2">
                            <span className="input-group-text bg-white border-0 text-muted small fw-bold"><Calendar size={14}/></span>
                            <select 
                                className="form-select border-0 fw-bold text-dark small" 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="btn-group p-1 bg-subtle rounded-3 shadow-sm border">
                            <button 
                                className={`btn btn-sm rounded-2 d-flex align-items-center gap-2 px-3 ${viewMode === 'standard' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`}
                                onClick={() => setViewMode('standard')}
                            >
                                <LayoutList size={14} /> Summary
                            </button>
                            <button 
                                className={`btn btn-sm rounded-2 d-flex align-items-center gap-2 px-3 ${viewMode === 'monthly' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`}
                                onClick={() => setViewMode('monthly')}
                            >
                                <TableIcon size={14} /> Monthly
                            </button>
                        </div>
                        <button className="btn btn-white border px-4 fw-bold shadow-sm d-flex align-items-center rounded-3">
                            <Download size={18} className="me-2"/> Export
                        </button>
                    </div>
                </div>
            </div>

            <Card className="shadow-lg border-0 overflow-hidden">
                <CardContent className="p-0">
                    {viewMode === 'standard' ? (
                        <div className="d-flex flex-column">
                            {/* Standard View Sections */}
                            <div className="p-4 p-md-5">
                                <h5 className="fw-800 text-black mb-4 d-flex align-items-center gap-2">
                                    <TrendingUp className="text-success" size={20} />
                                    Total Income
                                </h5>
                                <div className="d-flex flex-column gap-1">
                                    {incomeCategories.map(cat => {
                                        const amount = calculateTotalForCategory(cat.id);
                                        if (amount === 0) return null;
                                        return (
                                            <div key={cat.id} className="d-flex justify-content-between align-items-center p-3 rounded-3 hover-bg-subtle transition-all">
                                                <span className="text-muted fw-600">{cat.name}</span>
                                                <span className="fw-800 text-black">{formatCurrency(amount)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top">
                                    <span className="fw-800 text-black fs-5">Total Gross Income</span>
                                    <span className="fw-800 text-success fs-4">{formatCurrency(totalIncome)}</span>
                                </div>
                            </div>
                            
                            <div className="p-4 p-md-5 bg-subtle">
                                <h5 className="fw-800 text-black mb-4 d-flex align-items-center gap-2">
                                    <TrendingDown className="text-danger" size={20} />
                                    Total Expenses
                                </h5>
                                <div className="d-flex flex-column gap-1">
                                    {expenseCategories.map(cat => {
                                        const amount = calculateTotalForCategory(cat.id);
                                        if (amount === 0) return null;
                                        return (
                                            <div key={cat.id} className="d-flex justify-content-between align-items-center p-3 rounded-3 hover-bg-white transition-all shadow-sm-hover">
                                                <span className="text-muted fw-600">{cat.name}</span>
                                                <span className="fw-800 text-black">{formatCurrency(amount)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top">
                                    <span className="fw-800 text-black fs-5">Total Operating Expenses</span>
                                    <span className="fw-800 text-danger fs-4">{formatCurrency(totalExpenses)}</span>
                                </div>
                            </div>
                            
                            <div className={`p-4 p-md-5 ${netIncome >= 0 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={`p-3 rounded-circle ${netIncome >= 0 ? 'bg-success' : 'bg-danger'} text-white shadow-lg`}>
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <h4 className="fw-800 text-black mb-0">Net Performance</h4>
                                            <p className="text-muted mb-0 small">Final balance after all expenses</p>
                                        </div>
                                    </div>
                                    <span className={`fw-800 fs-2 ${netIncome >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netIncome)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle mb-0 table-sticky-header" style={{ minWidth: '1200px' }}>
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 py-3 sticky-column bg-light border-bottom" style={{ width: '280px' }}>
                                            <span className="text-muted small fw-800 text-uppercase">Financial Structure</span>
                                        </th>
                                        {months.map(m => (
                                            <th key={m} className="text-center py-3 text-muted small fw-800 text-uppercase border-bottom">{m}</th>
                                        ))}
                                        <th className="text-end py-3 pe-4 text-black small fw-800 text-uppercase border-bottom">Annual Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* --- INCOME SECTION --- */}
                                    <tr className="bg-light border-bottom">
                                        <td colSpan={14} className="ps-4 py-3 fw-800 text-success small sticky-column bg-light" style={{ letterSpacing: '0.05em' }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <TrendingUp size={16} /> OPERATING REVENUE (INCOME)
                                            </div>
                                        </td>
                                    </tr>
                                    {incomeCategories.map(cat => {
                                        const monthly = getMonthlyData(cat);
                                        const total = monthly.reduce((a, b) => a + b, 0);
                                        if (total === 0) return null;
                                        return (
                                            <tr key={cat.id} className="border-bottom">
                                                <td className="ps-5 py-3 fw-600 text-dark sticky-column bg-white">{cat.name}</td>
                                                {monthly.map((val, idx) => (
                                                    <td key={idx} className={`text-center small ${val > 0 ? 'text-dark fw-500' : 'text-muted opacity-25'}`}>
                                                        {val > 0 ? formatCurrency(val).replace('.00', '') : '-'}
                                                    </td>
                                                ))}
                                                <td className="text-end pe-4 fw-700 text-success">{formatCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total Income Highlighted */}
                                    <tr className="bg-success-subtle border-bottom border-success border-opacity-25">
                                        <td className="ps-4 py-3 fw-800 text-success sticky-column bg-success-subtle">Total Operating Revenue</td>
                                        {incomeMonthlyTotals.map((val, idx) => (
                                            <td key={idx} className="text-center fw-800 text-success small bg-success-subtle">{formatCurrency(val).replace('.00', '')}</td>
                                        ))}
                                        <td className="text-end pe-4 fw-900 text-success bg-success-subtle">{formatCurrency(totalIncome)}</td>
                                    </tr>

                                    {/* --- SPACER --- */}
                                    <tr style={{ height: '32px' }}><td colSpan={14} className="bg-white border-0 sticky-column"></td></tr>

                                    {/* --- EXPENSE SECTION --- */}
                                    <tr className="bg-light border-bottom">
                                        <td colSpan={14} className="ps-4 py-3 fw-800 text-danger small sticky-column bg-light" style={{ letterSpacing: '0.05em' }}>
                                            <div className="d-flex align-items-center gap-2">
                                                <TrendingDown size={16} /> OPERATING EXPENSES
                                            </div>
                                        </td>
                                    </tr>
                                    {expenseCategories.map(cat => {
                                        const monthly = getMonthlyData(cat);
                                        const total = monthly.reduce((a, b) => a + b, 0);
                                        if (total === 0) return null;
                                        return (
                                            <tr key={cat.id} className="border-bottom">
                                                <td className="ps-5 py-3 fw-600 text-dark sticky-column bg-white">{cat.name}</td>
                                                {monthly.map((val, idx) => (
                                                    <td key={idx} className={`text-center small ${val > 0 ? 'text-dark fw-500' : 'text-muted opacity-25'}`}>
                                                        {val > 0 ? formatCurrency(val).replace('.00', '') : '-'}
                                                    </td>
                                                ))}
                                                <td className="text-end pe-4 fw-700 text-danger">{formatCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total Expense Highlighted */}
                                    <tr className="bg-danger-subtle border-bottom border-danger border-opacity-25">
                                        <td className="ps-4 py-3 fw-800 text-danger sticky-column bg-danger-subtle">Total Operating Expenses</td>
                                        {expenseMonthlyTotals.map((val, idx) => (
                                            <td key={idx} className="text-center fw-800 text-danger small bg-danger-subtle">{formatCurrency(val).replace('.00', '')}</td>
                                        ))}
                                        <td className="text-end pe-4 fw-900 text-danger bg-danger-subtle">{formatCurrency(totalExpenses)}</td>
                                    </tr>

                                    {/* --- SPACER --- */}
                                    <tr style={{ height: '48px' }}><td colSpan={14} className="bg-white border-0 sticky-column"></td></tr>

                                    {/* --- NET PERFORMANCE SECTION --- */}
                                    <tr className="border-top border-dark border-3 bg-light">
                                        <td className="ps-4 py-4 fw-900 text-black sticky-column bg-light" style={{ fontSize: '1.1rem' }}>
                                            NET PROFIT / LOSS
                                        </td>
                                        {netMonthlyTotals.map((val, idx) => (
                                            <td key={idx} className={`text-center fw-900 bg-light ${val >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1rem' }}>
                                                {formatCurrency(val).replace('.00', '')}
                                            </td>
                                        ))}
                                        <td className={`text-end pe-4 fw-900 bg-light ${netIncome >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1.25rem' }}>
                                            {formatCurrency(netIncome)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Reports;
