
import React, { useState, useMemo } from 'react';
import Card, { CardContent } from './ui/Card';
import { TransactionType, EntityType, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { Printer, FileText, Briefcase, User, Info, ShieldCheck, Download, Layout, FileSearch, Building2, AlertCircle } from 'lucide-react';
import { useData } from '../lib/DataContext';

// Official IRS Schedule C Line Mapping (Business)
const SCHEDULE_C_MAP: Record<string, string> = {
    'Freight Revenue': 'Line 1: Gross receipts or sales',
    'Fuel & DEF': 'Line 9: Car and truck expenses',
    'Tires': 'Line 9: Car and truck expenses',
    'Insurance Premiums': 'Line 15: Insurance (other than health)',
    'Loan Interest': 'Line 16b: Other interest',
    'Professional Services': 'Line 17: Legal and professional services',
    'Rent / Lease': 'Line 20: Rent or lease',
    'Repairs & Maintenance': 'Line 21: Repairs and maintenance',
    'Travel': 'Line 24a: Travel',
    'Meals & Per Diem': 'Line 24b: Deductible meals',
    'Tolls & Scales': 'Line 27a: Other expenses',
    'Dispatch Fees': 'Line 27a: Other expenses',
};

// Official IRS Form 1040 Line Mapping (Personal/Individual)
const FORM_1040_MAP: Record<string, string> = {
    'Wages': 'Line 1z: Total Wages',
    'Investment Income': 'Line 2: Tax-exempt/Taxable interest',
    'Owner Equity (Non-Taxable)': 'Line 0: Equity Movement (Exempt)',
    'Standard Deduction': 'Line 12: Standard Deduction',
    'Charitable Contributions': 'Line 12: Itemized Deductions',
};

interface FormRowProps {
    line?: string;
    label: string;
    value: number;
    bold?: boolean;
    indent?: boolean;
    isTotal?: boolean;
    isInfoOnly?: boolean;
    isExempt?: boolean;
}

const FormRow: React.FC<FormRowProps> = ({ line, label, value, bold, indent, isTotal, isInfoOnly, isExempt }) => (
    <div className={`d-flex align-items-baseline py-2 ${indent ? 'ps-4' : ''} ${isTotal ? 'border-top border-dark border-2 mt-2 bg-light bg-opacity-50' : 'border-bottom border-light'}`}>
        <div className="d-flex align-items-center gap-2" style={{ minWidth: '60px' }}>
            <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{line}</span>
        </div>
        <div className="flex-grow-1 d-flex align-items-baseline overflow-hidden">
            <span className={`${bold ? 'fw-800' : 'fw-500'} ${isInfoOnly || isExempt ? 'text-muted italic' : 'text-dark'} small text-uppercase text-truncate`}>
                {label} {isExempt && <span className="badge bg-primary bg-opacity-10 text-primary fw-900 ms-1" style={{fontSize: '0.5rem'}}>EXEMPT</span>}
            </span>
            <div className="flex-grow-1 mx-2 border-bottom border-dotted opacity-25" style={{ borderStyle: 'dotted', height: '14px' }}></div>
        </div>
        <div className="text-end" style={{ minWidth: '130px' }}>
            <span className={`${bold ? 'fw-900 fs-6' : 'fw-700 small'} font-monospace ${isInfoOnly || isExempt ? 'text-muted' : ''}`}>
                {formatCurrency(value)}
            </span>
        </div>
    </div>
);

const TaxReports: React.FC = () => {
    const { transactions, businessEntities, accounts, activeEntityId } = useData();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const activeEntity = useMemo(() => 
        businessEntities.find(e => e.id === activeEntityId) || businessEntities[0]
    , [activeEntityId, businessEntities]);

    // Available years from both transactions and current date
    const availableYears = useMemo(() => {
        const transYears = transactions.map(t => new Date(t.date).getFullYear());
        const years = Array.from<number>(new Set([...transYears, new Date().getFullYear()])).sort((a, b) => b - a);
        return years;
    }, [transactions]);

    const taxCalculation = useMemo(() => {
        // 1. Get ONLY accounts belonging to the active entity
        const entityAccounts = accounts.filter(a => a.businessEntityId === activeEntityId);
        const accountIds = entityAccounts.map(a => a.id);
        
        // 2. Filter transactions for the selected year and entity accounts
        const filtered = transactions.filter(t => {
            const yearMatch = new Date(t.date).getFullYear() === selectedYear;
            const accountMatch = accountIds.includes(t.accountId) || (t.toAccountId && accountIds.includes(t.toAccountId));
            return yearMatch && accountMatch;
        });

        // 3. Logic for Business (Schedule C) vs Personal (1040) depends on activeEntity.type
        const isBusiness = activeEntity?.type === EntityType.BUSINESS;
        const currentMap = isBusiness ? SCHEDULE_C_MAP : FORM_1040_MAP;

        let taxableIncome = 0;
        let expenses = 0;
        let equityInflows = 0;
        const lineData: Record<string, number> = {};

        filtered.forEach(t => {
            const amount = Number(t.amount) || 0;
            const catName = t.category?.name || 'Uncategorized';
            
            // Map line items based on category name
            const line = currentMap[catName] || (t.type === TransactionType.INCOME ? 'Other Income' : 'Other Expenses');

            if (t.type === TransactionType.INCOME) {
                // Check for non-taxable equity (Owner transfer)
                if (catName === 'Owner Equity (Non-Taxable)') {
                    equityInflows += amount;
                } else {
                    taxableIncome += amount;
                    lineData[line] = (lineData[line] || 0) + amount;
                }
            } else if (t.type === TransactionType.EXPENSE) {
                // Only count tax deductible expenses for totals
                if (t.category?.isTaxDeductible) {
                    expenses += amount;
                    lineData[line] = (lineData[line] || 0) + amount;
                } else {
                    lineData['Non-Deductible Expenses'] = (lineData['Non-Deductible Expenses'] || 0) + amount;
                }
            }
            // Transfers between accounts of the same entity are ignored for Tax P&L
        });

        return { taxableIncome, expenses, net: taxableIncome - expenses, equityInflows, lineData, isBusiness };
    }, [transactions, activeEntityId, selectedYear, accounts, activeEntity]);

    return (
        <div className="container-fluid py-3 animate-slide-up pb-5 mb-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 d-print-none">
                <div className="d-flex align-items-center gap-3">
                    <div className={`p-2 rounded-3 ${taxCalculation.isBusiness ? 'bg-black text-white' : 'bg-primary text-white'}`}>
                        {taxCalculation.isBusiness ? <Briefcase size={20}/> : <User size={20}/>}
                    </div>
                    <h5 className="fw-900 mb-0">
                        {taxCalculation.isBusiness ? 'Schedule C (Business)' : 'Personal Tax Summary'}
                    </h5>
                </div>

                <div className="d-flex gap-2">
                    <select className="form-select border-0 shadow-sm fw-bold rounded-3" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {availableYears.map(y => <option key={y} value={y}>{y} Fiscal Year</option>)}
                    </select>
                    <button className="btn btn-white border shadow-sm px-3" onClick={() => window.print()} title="Print Report"><Printer size={18}/></button>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: '#fdfdfd' }}>
                        <div className="p-4 bg-white border-bottom border-light">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h4 className="fw-900 mb-0">{activeEntity?.name}</h4>
                                    <div className="d-flex align-items-center gap-2 mt-1">
                                        <span className="text-muted small fw-bold text-uppercase ls-1">Tax ID: {activeEntity?.ein || activeEntity?.ssn || 'PENDING'}</span>
                                        <span className="text-muted opacity-25">|</span>
                                        <span className="text-muted small fw-bold text-uppercase ls-1">{selectedYear} Filing</span>
                                    </div>
                                </div>
                                <div className="text-end d-none d-sm-block">
                                    <div className="badge bg-light text-dark border fw-bold">{activeEntity?.structure}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 p-md-5">
                            {taxCalculation.isBusiness ? (
                                <>
                                    <div className="mb-5">
                                        <h6 className="bg-light p-2 rounded-2 fw-900 small text-uppercase ls-1 mb-3">Part I: Income</h6>
                                        <FormRow line="1" label="Gross receipts or sales" value={taxCalculation.lineData['Line 1: Gross receipts or sales'] || taxCalculation.taxableIncome} />
                                        {/* Other Income logic can go here if lineData has other entries */}
                                        <FormRow line="5" label="Gross Profit" value={taxCalculation.taxableIncome} bold />
                                    </div>

                                    <div className="mb-5">
                                        <h6 className="bg-light p-2 rounded-2 fw-900 small text-uppercase ls-1 mb-3">Part II: Expenses</h6>
                                        {Object.entries(taxCalculation.lineData).map(([label, val]) => {
                                            if (label.startsWith('Line')) {
                                                const lineNum = label.split(':')[0].replace('Line ', '');
                                                return <FormRow key={label} line={lineNum} label={label.split(': ')[1]} value={val} />;
                                            }
                                            return null;
                                        })}
                                        {/* Fallback for unmapped deductible expenses */}
                                        {taxCalculation.lineData['Other Expenses'] > 0 && (
                                            <FormRow line="27a" label="Other Expenses (Misc)" value={taxCalculation.lineData['Other Expenses']} />
                                        )}
                                        <FormRow line="28" label="Total Deductible Expenses" value={taxCalculation.expenses} bold isTotal />
                                    </div>

                                    <div className="mt-4 p-4 rounded-4 bg-black text-white shadow-lg">
                                        <FormRow line="31" label="Net Taxable Profit" value={taxCalculation.net} bold />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-5">
                                        <h6 className="bg-primary bg-opacity-10 p-2 rounded-2 fw-900 small text-uppercase text-primary ls-1 mb-3">Taxable Income Summary</h6>
                                        <FormRow line="1z" label="Total Wages/Salaries" value={taxCalculation.lineData['Line 1z: Total Wages'] || 0} />
                                        <FormRow line="-" label="Other Taxable Income" value={taxCalculation.taxableIncome - (taxCalculation.lineData['Line 1z: Total Wages'] || 0)} />
                                        <FormRow line="9" label="Adjusted Gross Income (Taxable)" value={taxCalculation.taxableIncome} bold isTotal />
                                    </div>

                                    <div className="mb-5">
                                        <h6 className="bg-primary bg-opacity-10 p-2 rounded-2 fw-900 small text-uppercase text-primary ls-1 mb-3">Exempt Movement (Non-Taxable)</h6>
                                        <FormRow line="-" label="Owner Equity Inflow" value={taxCalculation.equityInflows} isExempt />
                                        <p className="text-muted small mt-2 italic">Equity transfers from linked business accounts are excluded from taxable totals.</p>
                                    </div>

                                    <div className="mt-4 p-4 rounded-4 bg-primary text-white shadow-lg">
                                        <FormRow line="15" label="Est. Taxable Base" value={Math.max(0, taxCalculation.taxableIncome)} bold />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <Card className="border-0 shadow-sm rounded-4 bg-white mb-4">
                        <CardContent className="p-4">
                            <div className="d-flex align-items-center gap-2 mb-3 text-primary">
                                <ShieldCheck size={20}/>
                                <h6 className="fw-900 mb-0 small text-uppercase ls-1">Compliance Check</h6>
                            </div>
                            <div className="d-flex flex-column gap-3">
                                <div className="p-3 bg-light rounded-3">
                                    <small className="text-muted d-block fw-bold" style={{fontSize: '0.6rem'}}>DEDUCTIBILITY RATE</small>
                                    <div className="d-flex justify-content-between align-items-end">
                                        <span className="fw-900 fs-4">{taxCalculation.taxableIncome > 0 ? Math.round((taxCalculation.expenses / taxCalculation.taxableIncome) * 100) : 0}%</span>
                                        <span className="small text-muted mb-1">of revenue</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-light rounded-3">
                                    <small className="text-muted d-block fw-bold" style={{fontSize: '0.6rem'}}>REPORT STATUS</small>
                                    <span className="badge bg-success bg-opacity-10 text-success fw-900 px-3 py-1 mt-1 border-0">READY FOR FILING</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm rounded-4 bg-subtle">
                        <CardContent className="p-4">
                            <h6 className="fw-900 text-black mb-3 small text-uppercase ls-1 d-flex align-items-center gap-2">
                                <Info size={16} className="text-primary"/> IRS Reporting Logic
                            </h6>
                            <p className="text-muted small mb-0">
                                This report maps your <strong>FleetLedger</strong> categories to the official lines of <strong>Schedule C</strong>. 
                                <br/><br/>
                                Only transactions with categories marked as <strong>"Tax Deductible"</strong> contribute to total expenses. Ensure your "Chart of Accounts" is correctly configured.
                            </p>
                        </CardContent>
                    </Card>
                    
                    {taxCalculation.net < 0 && (
                        <div className="alert alert-warning border-0 shadow-sm rounded-4 p-4 mt-4 d-flex gap-3">
                            <AlertCircle className="text-warning flex-shrink-0" size={24} />
                            <div>
                                <h6 className="fw-bold mb-1">Loss Reported</h6>
                                <p className="small mb-0 text-muted">A net loss in {selectedYear} may be used to offset future income (NOL Carryforward). Consult your tax professional.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaxReports;
