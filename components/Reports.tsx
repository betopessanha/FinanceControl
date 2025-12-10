
import React from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { TransactionType } from '../types';
import { formatCurrency } from '../lib/utils';
import { Download } from 'lucide-react';
import { useData } from '../lib/DataContext';

const Reports: React.FC = () => {
    // Consume Data
    const { transactions, categories } = useData();
    
    // Derived lists from state
    const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

    const calculateTotalForCategory = (categoryId: string) => {
        return transactions
            // Safely check for t.category existence
            .filter(t => t.category && t.category.id === categoryId)
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const totalIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    return (
        <div className="container p-0" style={{ maxWidth: '900px' }}>
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center w-100 gap-3">
                        <div className="text-center text-sm-start">
                            <CardTitle>Profit & Loss Statement</CardTitle>
                            <p className="text-muted small mb-0">For the period: Year-to-Date</p>
                        </div>
                        <button className="btn btn-outline-secondary d-flex align-items-center shadow-sm">
                            <Download size={18} className="me-2"/>
                            Export CSV
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="d-flex flex-column">
                        {/* Income Section */}
                        <div className="p-4 p-md-5">
                            <h5 className="fw-bold text-success mb-4 border-bottom pb-2">
                                Income
                            </h5>
                            <div className="d-flex flex-column gap-2">
                                {incomeCategories.map(cat => {
                                    const amount = calculateTotalForCategory(cat.id);
                                    if (amount === 0) return null;
                                    return (
                                        <div key={cat.id} className="d-flex justify-content-between align-items-center p-2 rounded hover-bg-light">
                                            <span className="text-secondary">{cat.name}</span>
                                            <span className="fw-bold text-dark">{formatCurrency(amount)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                                <span className="fw-bold text-dark">Total Income</span>
                                <span className="fw-bold text-success fs-5">{formatCurrency(totalIncome)}</span>
                            </div>
                        </div>
                        
                        {/* Expenses Section */}
                        <div className="p-4 p-md-5 bg-light">
                            <h5 className="fw-bold text-danger mb-4 border-bottom pb-2">
                                Expenses
                            </h5>
                            <div className="d-flex flex-column gap-2">
                                {expenseCategories.map(cat => {
                                    const amount = calculateTotalForCategory(cat.id);
                                    if (amount === 0) return null;
                                    return (
                                        <div key={cat.id} className="d-flex justify-content-between align-items-center p-2 rounded hover-bg-white">
                                            <span className="text-secondary">{cat.name}</span>
                                            <span className="fw-bold text-dark">{formatCurrency(amount)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                                <span className="fw-bold text-dark">Total Expenses</span>
                                <span className="fw-bold text-danger fs-5">{formatCurrency(totalExpenses)}</span>
                            </div>
                        </div>
                        
                        {/* Net Income Section */}
                        <div className={`p-4 p-md-5 ${netIncome >= 0 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                             <div className="d-flex justify-content-between align-items-center">
                                <span className="fs-5 fw-bold text-dark">Net Income</span>
                                <span className={`fs-4 fw-bold ${netIncome >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(netIncome)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Reports;
