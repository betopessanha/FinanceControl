
import React, { useState, useMemo } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { TransactionType, Category, Transaction } from '../types';
import { formatCurrency, formatDate, downloadCSV } from '../lib/utils';
import { Download, Calendar, LayoutList, Table as TableIcon, ChevronRight, TrendingUp, TrendingDown, DollarSign, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';

type ViewMode = 'standard' | 'monthly';

const Reports: React.FC = () => {
    const { transactions, categories } = useData();
    const [viewMode, setViewMode] = useState<ViewMode>('standard');
    
    const availableYears = useMemo(() => {
        const years = Array.from<number>(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
        return years.length > 0 ? years : [new Date().getFullYear()];
    }, [transactions]);
    
    const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const yearTransactions = useMemo(() => {
        return transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
    }, [transactions, selectedYear]);

    const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

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

    const exportData = useMemo(() => [
        { Section: 'INCOME', Category: 'TOTAL REVENUE', Amount: totalIncome },
        ...incomeCategories.map(cat => ({ Section: 'INCOME', Category: cat.name, Amount: calculateTotalForCategory(cat.id) })),
        { Section: 'EXPENSE', Category: 'TOTAL OPERATING', Amount: totalExpenses },
        ...expenseCategories.map(cat => ({ Section: 'EXPENSE', Category: cat.name, Amount: calculateTotalForCategory(cat.id) })),
        { Section: 'SUMMARY', Category: 'NET PROFIT/LOSS', Amount: netIncome }
    ], [totalIncome, incomeCategories, totalExpenses, expenseCategories, netIncome, yearTransactions]);

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

    const hasMonthlyData = useMemo(() => {
        return incomeCategories.some(cat => calculateTotalForCategory(cat.id) > 0) || 
               expenseCategories.some(cat => calculateTotalForCategory(cat.id) > 0);
    }, [incomeCategories, expenseCategories, yearTransactions]);

    return (
        <div className="container-fluid py-2 animate-slide-up pb-5 mb-5">
            {/* Header Section */}
            <div className="mb-4 d-print-none">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div className="d-print-block">
                        <h1 className="fw-800 tracking-tight text-black mb-1">Profit & Loss</h1>
                        <p className="text-muted mb-0 small">Performance summary for {selectedYear}.</p>
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <div className="input-group w-auto shadow-sm">
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
                                className={`btn btn-sm rounded-2 px-2 px-sm-3 ${viewMode === 'standard' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`} 
                                onClick={() => setViewMode('standard')}
                            >
                                <LayoutList size={14} className="me-1" /> <span className="d-inline-block">Summary</span>
                            </button>
                            <button 
                                className={`btn btn-sm rounded-2 px-2 px-sm-3 ${viewMode === 'monthly' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`} 
                                onClick={() => setViewMode('monthly')}
                            >
                                <TableIcon size={14} className="me-1" /> <span className="d-inline-block">Monthly</span>
                            </button>
                        </div>
                        <ExportMenu data={exportData} filename={`PnL_${selectedYear}`} />
                    </div>
                </div>
            </div>

            {/* Mobile Summary Cards */}
            <div className="row g-2 mb-4 d-flex d-md-none">
                <div className="col-4">
                    <div className="card border-0 bg-white p-2 text-center shadow-sm">
                        <small className="text-muted fw-bold" style={{fontSize: '0.6rem'}}>REVENUE</small>
                        <div className="fw-800 text-success small">{formatCurrency(totalIncome).split('.')[0]}</div>
                    </div>
                </div>
                <div className="col-4">
                    <div className="card border-0 bg-white p-2 text-center shadow-sm">
                        <small className="text-muted fw-bold" style={{fontSize: '0.6rem'}}>EXPENSES</small>
                        <div className="fw-800 text-danger small">{formatCurrency(totalExpenses).split('.')[0]}</div>
                    </div>
                </div>
                <div className="col-4">
                    <div className="card border-0 bg-black p-2 text-center shadow-sm">
                        <small className="text-white opacity-50 fw-bold" style={{fontSize: '0.6rem'}}>NET</small>
                        <div className={`fw-800 small ${netIncome >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netIncome).split('.')[0]}</div>
                    </div>
                </div>
            </div>

            <Card className="shadow-lg border-0 mb-4">
                <CardContent className="p-0 overflow-visible">
                    {viewMode === 'standard' ? (
                        <div className="d-flex flex-column">
                            <div className="p-4 p-md-5">
                                <h5 className="fw-800 text-black mb-4 d-flex align-items-center gap-2"><TrendingUp className="text-success" size={20} /> Total Income</h5>
                                {incomeCategories.map(cat => {
                                    const amount = calculateTotalForCategory(cat.id);
                                    if (amount === 0) return null;
                                    return (
                                        <div key={cat.id} className="d-flex justify-content-between align-items-center p-3 rounded-3 hover-bg-subtle border-bottom border-light">
                                            <span className="text-muted fw-600 small">{cat.name}</span>
                                            <span className="fw-800 text-black small">{formatCurrency(amount)}</span>
                                        </div>
                                    );
                                })}
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top">
                                    <span className="fw-800 text-black fs-6 fs-md-5">Gross Income</span>
                                    <span className="fw-800 text-success fs-5 fs-md-4">{formatCurrency(totalIncome)}</span>
                                </div>
                            </div>
                            
                            <div className="p-4 p-md-5 bg-subtle">
                                <h5 className="fw-800 text-black mb-4 d-flex align-items-center gap-2"><TrendingDown className="text-danger" size={20} /> Total Expenses</h5>
                                {expenseCategories.map(cat => {
                                    const amount = calculateTotalForCategory(cat.id);
                                    if (amount === 0) return null;
                                    return (
                                        <div key={cat.id} className="d-flex justify-content-between align-items-center p-3 rounded-3 hover-bg-white shadow-sm-hover border-bottom border-white border-opacity-50">
                                            <span className="text-muted fw-600 small">{cat.name}</span>
                                            <span className="fw-800 text-black small">{formatCurrency(amount)}</span>
                                        </div>
                                    );
                                })}
                                <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top border-dark border-opacity-10">
                                    <span className="fw-800 text-black fs-6 fs-md-5">Operating Expenses</span>
                                    <span className="fw-800 text-danger fs-5 fs-md-4">{formatCurrency(totalExpenses)}</span>
                                </div>
                            </div>
                            
                            <div className={`p-4 p-md-5 ${netIncome >= 0 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={`p-3 rounded-circle ${netIncome >= 0 ? 'bg-success' : 'bg-danger'} text-white shadow-lg`}><DollarSign size={24} /></div>
                                        <div>
                                            <h4 className="fw-800 text-black mb-0">Net Performance</h4>
                                            <p className="text-muted mb-0 small">Final balance after all expenses</p>
                                        </div>
                                    </div>
                                    <div className="w-100 w-sm-auto text-end">
                                        <span className={`fw-800 fs-2 ${netIncome >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netIncome)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="table-responsive border-0" style={{ overflow: 'auto' }}>
                            {hasMonthlyData ? (
                                <table className="table align-middle mb-0 table-sticky-header" style={{ minWidth: '1300px' }}>
                                    <thead>
                                        <tr>
                                            <th className="ps-4 py-3 sticky-column border-bottom border-end bg-light">Structure</th>
                                            {months.map(m => <th key={m} className="text-center py-3 text-muted small fw-800 text-uppercase border-bottom">{m}</th>)}
                                            <th className="text-end py-3 pe-4 text-black small fw-800 text-uppercase border-bottom border-start bg-light">Annual</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-light border-bottom">
                                            <td colSpan={months.length + 2} className="ps-4 py-3 fw-800 text-success small sticky-column border-end bg-light">OPERATING REVENUE</td>
                                        </tr>
                                        {incomeCategories.map(cat => {
                                            const monthly = getMonthlyData(cat);
                                            const total = monthly.reduce((a, b) => a + b, 0);
                                            if (total === 0) return null;
                                            return (
                                                <tr key={cat.id} className="border-bottom">
                                                    <td className="ps-5 py-3 fw-600 text-dark sticky-column border-end bg-white">{cat.name}</td>
                                                    {monthly.map((val, idx) => <td key={idx} className="text-center small">{val > 0 ? formatCurrency(val).replace('.00', '') : '-'}</td>)}
                                                    <td className="text-end pe-4 fw-700 text-success border-start bg-light bg-opacity-50">{formatCurrency(total)}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-success-subtle border-bottom">
                                            <td className="ps-4 py-3 fw-800 text-success sticky-column border-end bg-success-subtle">Total Revenue</td>
                                            {incomeMonthlyTotals.map((val, idx) => <td key={idx} className="text-center fw-800 text-success small bg-success-subtle">{formatCurrency(val).replace('.00', '')}</td>)}
                                            <td className="text-end pe-4 fw-900 text-success border-start bg-success-subtle">{formatCurrency(totalIncome)}</td>
                                        </tr>
                                        
                                        <tr className="bg-light border-bottom">
                                            <td colSpan={months.length + 2} className="ps-4 py-3 fw-800 text-danger small sticky-column border-end bg-light">OPERATING EXPENSES</td>
                                        </tr>
                                        {expenseCategories.map(cat => {
                                            const monthly = getMonthlyData(cat);
                                            const total = monthly.reduce((a, b) => a + b, 0);
                                            if (total === 0) return null;
                                            return (
                                                <tr key={cat.id} className="border-bottom">
                                                    <td className="ps-5 py-3 fw-600 text-dark sticky-column border-end bg-white">{cat.name}</td>
                                                    {monthly.map((val, idx) => <td key={idx} className="text-center small">{val > 0 ? formatCurrency(val).replace('.00', '') : '-'}</td>)}
                                                    <td className="text-end pe-4 fw-700 text-danger border-start bg-light bg-opacity-50">{formatCurrency(total)}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-danger-subtle border-bottom">
                                            <td className="ps-4 py-3 fw-800 text-danger sticky-column border-end bg-danger-subtle">Total Expenses</td>
                                            {expenseMonthlyTotals.map((val, idx) => <td key={idx} className="text-center fw-800 text-danger small bg-danger-subtle">{formatCurrency(val).replace('.00', '')}</td>)}
                                            <td className="text-end pe-4 fw-900 text-danger border-start bg-danger-subtle">{formatCurrency(totalExpenses)}</td>
                                        </tr>

                                        <tr style={{ height: '48px' }}><td colSpan={months.length + 2} className="bg-white border-0 sticky-column"></td></tr>
                                        <tr className="bg-dark text-white shadow-lg">
                                            <td className="ps-4 py-4 fw-900 sticky-column border-end bg-dark text-white">NET PROFIT / LOSS</td>
                                            {netMonthlyTotals.map((val, idx) => <td key={idx} className={`text-center fw-900 bg-dark ${val >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(val).replace('.00', '')}</td>)}
                                            <td className={`text-end pe-4 fw-900 border-start bg-dark ${netIncome >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netIncome)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-5">
                                    <p className="text-muted">No monthly data available for the selected period.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Espaçador final extra para garantir visibilidade no mobile */}
            <div style={{ height: '40px' }}></div>
        </div>
    );
};

export default Reports;
