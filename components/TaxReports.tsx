import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { TransactionType, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { Calendar, Printer, AlertCircle, FileSpreadsheet, TrendingUp, Filter, ExternalLink, Wallet } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { Page } from '../App';

interface TaxReportsProps {
    setActivePage?: (page: Page) => void;
}

const TaxReports: React.FC<TaxReportsProps> = ({ setActivePage }) => {
    // Consume Data
    const { transactions, setReportFilter } = useData();
    
    // Determine available years from data, default to current year
    const availableYears = useMemo(() => {
        const years = Array.from<number>(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
        return years.length > 0 ? years : [new Date().getFullYear()];
    }, [transactions]);

    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Update selected year if it's not in the list (e.g. on first load if data is older)
    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    // Filter transactions by year
    const yearlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === selectedYear;
    });

    // 1. Calculate Gross Income
    const grossIncome = yearlyTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

    // 2. Breakdown Income by Category
    const incomeByCategory: { [key: string]: number } = {};
    yearlyTransactions.filter(t => t.type === TransactionType.INCOME).forEach(t => {
        if (t.category) {
            incomeByCategory[t.category.name] = (incomeByCategory[t.category.name] || 0) + t.amount;
        }
    });

    // 3. Robust Mapping Helper
    const getScheduleCLine = (categoryName: string): string => {
        const lower = categoryName.toLowerCase().trim();

        // Specific Keyword Rules (Priority Order)
        
        // Vehicle / Transport
        if (lower.includes('fuel') || lower.includes('diesel') || lower.includes('gas') || lower.includes('combustivel')) return 'Car and truck expenses (Line 9)';
        if (lower.includes('repair') || lower.includes('maint') || lower.includes('tire') || lower.includes('oil') || lower.includes('peca') || lower.includes('manutencao') || lower.includes('pneu')) return 'Repairs and maintenance (Line 21)';
        if (lower.includes('toll') || lower.includes('park') || lower.includes('pedagio') || lower.includes('scale') || lower.includes('weigh')) return 'Car and truck expenses (Line 9)';
        if (lower.includes('lease') || lower.includes('rent') || lower.includes('aluguel')) return 'Rent or lease (Vehicles) (Line 20a)';

        // Insurance / Taxes
        if (lower.includes('insurance') || lower.includes('seguro') || lower.includes('occupational')) return 'Insurance (other than health) (Line 15)';
        if (lower.includes('tax') || lower.includes('license') || lower.includes('permit') || lower.includes('ifta') || lower.includes('hvut') || lower.includes('licenca')) return 'Taxes and licenses (Line 23)';

        // Office / Admin
        if (lower.includes('phone') || lower.includes('cell') || lower.includes('internet') || lower.includes('wifi') || lower.includes('communication') || lower.includes('telef') || lower.includes('software') || lower.includes('subscription')) return 'Office expense (Line 18)';
        if (lower.includes('office') || lower.includes('supplies') || lower.includes('postage') || lower.includes('shipping') || lower.includes('material')) return 'Office expense (Line 18)';
        
        // Professional / Fees
        if (lower.includes('legal') || lower.includes('account') || lower.includes('professional') || lower.includes('attorney') || lower.includes('cpa')) return 'Legal and professional services (Line 17)';
        if (lower.includes('commission') || lower.includes('dispatch') || lower.includes('factoring') || lower.includes('merchant') || lower.includes('bank fee') || lower.includes('comissoes')) return 'Commissions and fees (Line 10)';

        // Labor
        if (lower.includes('wage') || lower.includes('salary') || lower.includes('payroll') || lower.includes('salario')) return 'Wages (less employment credits) (Line 26)';
        if (lower.includes('contract') || lower.includes('labor')) return 'Contract labor (Line 11)';

        // Travel
        if (lower.includes('travel') || lower.includes('meal') || lower.includes('hotel') || lower.includes('lodging') || lower.includes('per diem') || lower.includes('viagem')) return 'Travel, meals (Line 24)';

        // Interest
        if (lower.includes('interest')) return 'Mortgage/Other Interest (Line 16)';
        
        // Depreciation
        if (lower.includes('depreciation')) return 'Depreciation (Line 13)';

        // Fallback
        return 'Other expenses (Line 27a)';
    };

    const expensesByTaxLine: { [key: string]: number } = {};
    let totalDeductions = 0;
    let totalOwnerDraws = 0;

    // List of keywords for Non-Deductible items (Equity/Draws)
    const ownerDrawKeywords = [
        'owner draw', 'owner withdrawal', 'distribution', 'personal', 'equity', 
        'credcard', 'credit card payment', 'credit card bill', 'card payment',
        'loan principal', 'transfer', 'atm withdrawal', 'cash withdrawal',
        'cartao', 'fatura', 'pessoal', 'saque', 'retirada', 
        'pagamento cartao', 'transferencia', 'distribuicao', 'lucro'
    ];

    // List of keywords that are ALWAYS deductible (Safety check against bad flags)
    const forcedDeductibleKeywords = [
        'fuel', 'diesel', 'repair', 'maint', 'tire', 'oil', 'insurance', 'seguro',
        'phone', 'cell', 'internet', 'lease', 'rent', 'tax', 'license', 'permit',
        'toll', 'scale', 'wage', 'salary', 'dispatch', 'factoring'
    ];

    yearlyTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
        const catName = t.category?.name || 'Uncategorized';
        const catNameLower = catName.toLowerCase().trim();
        const categoryObj = t.category;

        // --- DEDUCTIBILITY CHECK ---
        let isDeductible = true;

        // 1. Force Deductible for known business keywords (Overrides DB if marked false accidentally)
        if (forcedDeductibleKeywords.some(k => catNameLower.includes(k))) {
             isDeductible = true;
        }
        // 2. Explicit Flag from Category Object
        else if (categoryObj && categoryObj.isTaxDeductible !== undefined) {
            isDeductible = categoryObj.isTaxDeductible;
        } 
        // 3. Fallback: Check Owner Draw Keywords
        else if (ownerDrawKeywords.some(k => catNameLower.includes(k))) {
            isDeductible = false;
        }

        // --- ASSIGNMENT ---
        if (!isDeductible) {
            // If NOT deductible, it goes to Equity/Draws. NEVER to "Other Expenses".
            totalOwnerDraws += t.amount;
        } else {
            // It is a deductible business expense
            const lineItem = getScheduleCLine(catName);
            expensesByTaxLine[lineItem] = (expensesByTaxLine[lineItem] || 0) + t.amount;
            totalDeductions += t.amount;
        }
    });

    const netProfit = grossIncome - totalDeductions;

    // 4. Estimate Taxes (Very rough approximation for display)
    const estimatedSE = netProfit > 0 ? (netProfit * 0.9235 * 0.153) : 0;
    const estimatedIncomeTax = netProfit > 0 ? (netProfit * 0.22) : 0;
    const totalEstimatedTax = estimatedSE + estimatedIncomeTax;

    // 5. Quarterly Breakdown
    const getQuarterData = (qStartMonth: number, qEndMonth: number) => {
        const qTransactions = yearlyTransactions.filter(t => {
            const m = new Date(t.date).getMonth(); // 0-indexed
            return m >= qStartMonth && m <= qEndMonth;
        });
        const inc = qTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const exp = qTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        return { income: inc, expenses: exp, net: inc - exp };
    };

    const q1 = getQuarterData(0, 2); // Jan-Mar
    const q2 = getQuarterData(3, 5); // Apr-Jun
    const q3 = getQuarterData(6, 8); // Jul-Sep
    const q4 = getQuarterData(9, 11); // Oct-Dec

    // IFTA Helper
    const fuelCost = yearlyTransactions
        .filter((t: Transaction) => {
            const name = ((t.category?.name as string) || '').toLowerCase();
            return name.includes('fuel') || name.includes('diesel') || name.includes('combustivel');
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const handleLineClick = (lineItem: string) => {
        if (!setActivePage) return;

        // Filter Expense Transactions
        const expenseTransactions = yearlyTransactions.filter(t => t.type === TransactionType.EXPENSE);
        const usedCategories = Array.from(new Set(expenseTransactions.map(t => (t.category?.name as string) || 'Uncategorized')));
        
        // Filter categories that map to this line
        const relevantCategories = usedCategories.filter((catName: string) => {
             const catNameLower = catName.toLowerCase().trim();
             
             // Replicate Deductibility Check for Filter
             let isDeductible = true;
             if (forcedDeductibleKeywords.some(k => catNameLower.includes(k))) isDeductible = true;
             else {
                 // We have to find the object to check the flag, which is tricky with just string list
                 // Approximation: rely on mapping logic
                 const repTrans = expenseTransactions.find(t => (t.category?.name || 'Uncategorized') === catName);
                 if (repTrans?.category?.isTaxDeductible === false) isDeductible = false;
                 else if (ownerDrawKeywords.some(k => catNameLower.includes(k))) isDeductible = false;
             }

             if (!isDeductible) return false;

             const mapped = getScheduleCLine(catName);
             return mapped === lineItem;
        });

        setReportFilter({
            year: selectedYear.toString(),
            categoryNames: relevantCategories,
            sourceReport: lineItem
        });

        setActivePage('Transactions');
    };

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Tax Reports & Forms</h2>
                  <p className="text-muted mb-0">Year-end summaries for Schedule C, IFTA, and Form 2290.</p>
                </div>
                <div className="d-flex gap-2 d-print-none align-items-center">
                    <Filter size={18} className="text-muted" />
                    <select 
                        className="form-select w-auto fw-bold text-dark shadow-sm border-0" 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>Tax Year {year}</option>
                        ))}
                    </select>
                    <button className="btn btn-outline-secondary d-flex align-items-center bg-white shadow-sm" onClick={() => window.print()}>
                        <Printer size={18} className="me-2"/>
                        Print
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body p-4">
                            <h6 className="text-uppercase text-muted fw-bold small mb-2">Net Profit (Schedule C)</h6>
                            <h3 className={`fw-bold mb-0 ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(netProfit)}
                            </h3>
                            <small className="text-muted">Taxable Income (Line 31)</small>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100 bg-white">
                        <div className="card-body p-4">
                            <h6 className="text-uppercase text-muted fw-bold small mb-2">Total Deductions</h6>
                            <h3 className="fw-bold text-dark mb-0">{formatCurrency(totalDeductions)}</h3>
                            <small className="text-muted">Excludes Owner Draws & Non-Deductibles</small>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100 bg-info bg-opacity-10">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="text-uppercase text-info fw-bold small mb-2">Est. Tax Liability</h6>
                                    <h3 className="fw-bold text-dark mb-0">{formatCurrency(totalEstimatedTax)}</h3>
                                </div>
                                <AlertCircle className="text-info" size={24} />
                            </div>
                            <small className="text-muted">Est. SE Tax + Income Tax (~37%)</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Main Content Column */}
                <div className="col-lg-8">
                     <div className="d-flex flex-column gap-4">
                        
                        {/* Income Breakdown */}
                        <Card>
                            <CardHeader>
                                <div className="d-flex align-items-center">
                                    <TrendingUp className="me-2 text-success" size={20}/>
                                    <CardTitle>Gross Income Breakdown (Part I)</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="table-responsive">
                                    <table className="table table-striped mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="py-3 ps-4">Category</th>
                                                <th className="py-3 text-end pe-4">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(incomeByCategory)
                                                .sort(([,a], [,b]) => b - a)
                                                .map(([cat, amount]) => (
                                                <tr key={cat}>
                                                    <td className="ps-4 fw-medium text-secondary">{cat}</td>
                                                    <td className="text-end pe-4 fw-bold text-success">{formatCurrency(amount)}</td>
                                                </tr>
                                            ))}
                                            {Object.keys(incomeByCategory).length === 0 && (
                                                <tr><td colSpan={2} className="text-center py-3 text-muted">No income recorded for this year.</td></tr>
                                            )}
                                            <tr className="table-success border-top border-success">
                                                <td className="ps-4 fw-bold">Total Gross Income (Line 1)</td>
                                                <td className="text-end pe-4 fw-bold">{formatCurrency(grossIncome)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Schedule C Expense Breakdown */}
                        <Card>
                            <CardHeader>
                                <div className="d-flex align-items-center">
                                    <FileSpreadsheet className="me-2 text-secondary" size={20}/>
                                    <CardTitle>Schedule C Expense Mapping (Part II)</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="table-responsive">
                                    <table className="table table-striped mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="py-3 ps-4">IRS Description</th>
                                                <th className="py-3 text-end pe-4">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(expensesByTaxLine)
                                                .sort(([,a], [,b]) => b - a)
                                                .map(([line, amount]) => (
                                                <tr key={line}>
                                                    <td className="ps-4 fw-medium text-secondary">{line}</td>
                                                    <td className="text-end pe-4">
                                                        <button 
                                                            onClick={() => handleLineClick(line as string)}
                                                            className="btn btn-link p-0 text-decoration-none fw-bold text-primary d-inline-flex align-items-center"
                                                            title="View transactions for this line"
                                                        >
                                                            {formatCurrency(amount)}
                                                            <ExternalLink size={12} className="ms-1 opacity-50" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                             {Object.keys(expensesByTaxLine).length === 0 && (
                                                <tr><td colSpan={2} className="text-center py-3 text-muted">No expenses recorded for this year.</td></tr>
                                            )}
                                            <tr className="table-secondary border-top border-secondary">
                                                <td className="ps-4 fw-bold">Total Expenses (Line 28)</td>
                                                <td className="text-end pe-4 fw-bold">{formatCurrency(totalDeductions)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Side Panels */}
                <div className="col-lg-4">
                    <div className="d-flex flex-column gap-4">
                        
                        {/* Owner Draws / Equity Panel */}
                        <Card className="border-warning border bg-warning bg-opacity-10">
                            <CardHeader className="bg-transparent pb-0">
                                <div className="d-flex align-items-center">
                                    <Wallet className="me-2 text-warning" size={20}/>
                                    <CardTitle>Non-Deductible / Equity</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-medium text-dark">Distributions</span>
                                    <h4 className="fw-bold mb-0 text-dark">{formatCurrency(totalOwnerDraws)}</h4>
                                </div>
                                <p className="small text-muted mb-0 fst-italic">
                                    <AlertCircle size={14} className="me-1 d-inline" />
                                    Expenses marked as "Not Deductible" (e.g. Owner Draws, Personal Cards) do not lower your taxable income.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Quarterly Estimates */}
                        <Card>
                            <CardHeader>
                                <div className="d-flex align-items-center">
                                    <Calendar className="me-2 text-secondary" size={20}/>
                                    <CardTitle>Quarterly Breakdown</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ul className="list-group list-group-flush">
                                    {[q1, q2, q3, q4].map((q, idx) => (
                                        <li key={idx} className="list-group-item p-3 d-flex justify-content-between align-items-center">
                                            <div>
                                                <span className="fw-bold text-dark d-block">Q{idx + 1}</span>
                                                <small className="text-muted">Net: {formatCurrency(q.net)}</small>
                                            </div>
                                            <div className="text-end">
                                                <span className="badge bg-light text-secondary border d-block mb-1">
                                                    Inc: {formatCurrency(q.income)}
                                                </span>
                                                <span className="badge bg-light text-secondary border">
                                                    Exp: {formatCurrency(q.expenses)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Special Forms Info */}
                        <Card className="bg-light border">
                            <CardHeader className="bg-light pb-0">
                                <CardTitle>Special Forms Data</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-3">
                                    <label className="small fw-bold text-muted text-uppercase">Form 2290 / Taxes</label>
                                    <div className="d-flex justify-content-between align-items-center bg-white p-2 rounded border mt-1">
                                        <span>Line 23 Total</span>
                                        <span className="fw-bold">{formatCurrency(expensesByTaxLine['Taxes and licenses (Line 23)'] || 0)}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="small fw-bold text-muted text-uppercase">IFTA (Fuel Costs)</label>
                                    <div className="d-flex justify-content-between align-items-center bg-white p-2 rounded border mt-1">
                                        <span>Diesel & DEF</span>
                                        <span className="fw-bold">{formatCurrency(fuelCost)}</span>
                                    </div>
                                    <small className="text-muted fst-italic mt-1 d-block">Note: Cross-reference this amount with your gallons purchased for IFTA filing.</small>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxReports;