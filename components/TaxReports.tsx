
import React, { useState, useMemo } from 'react';
import Card, { CardContent } from './ui/Card';
import { TransactionType, EntityType } from '../types';
import { formatCurrency } from '../lib/utils';
import { Printer, FileText, Briefcase, User, Info, ShieldCheck, Download, Layout, FileSearch, Building2 } from 'lucide-react';
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
    'Owner Equity / Personal Transfer': 'Line 0: Non-Taxable Equity Movement',
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
}

const FormRow: React.FC<FormRowProps> = ({ line, label, value, bold, indent, isTotal, isInfoOnly }) => (
    <div className={`d-flex align-items-baseline py-2 ${indent ? 'ps-4' : ''} ${isTotal ? 'border-top border-dark border-2 mt-2 bg-light bg-opacity-50' : 'border-bottom border-light'}`}>
        <div className="d-flex align-items-center gap-2" style={{ minWidth: '60px' }}>
            <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{line}</span>
        </div>
        <div className="flex-grow-1 d-flex align-items-baseline overflow-hidden">
            <span className={`${bold ? 'fw-800' : 'fw-500'} ${isInfoOnly ? 'text-muted italic' : 'text-dark'} small text-uppercase text-truncate`}>{label}</span>
            <div className="flex-grow-1 mx-2 border-bottom border-dotted opacity-25" style={{ borderStyle: 'dotted', height: '14px' }}></div>
        </div>
        <div className="text-end" style={{ minWidth: '130px' }}>
            <span className={`${bold ? 'fw-900 fs-6' : 'fw-700 small'} font-monospace ${isInfoOnly ? 'text-muted' : ''}`}>
                {formatCurrency(value)}
            </span>
        </div>
    </div>
);

const TaxReports: React.FC = () => {
    const { transactions, businessEntities, accounts, activeEntityId } = useData();
    const [activeTab, setActiveTab] = useState<'business' | 'individual'>('business');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Filter logic
    const activeEntity = useMemo(() => 
        businessEntities.find(e => e.id === activeEntityId) || businessEntities[0]
    , [activeEntityId, businessEntities]);

    // Available years for dropdown
    const availableYears = useMemo(() => {
        const years = Array.from<number>(new Set(transactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
        return years.length > 0 ? years : [new Date().getFullYear()];
    }, [transactions]);

    // Data Engine
    const taxCalculation = useMemo(() => {
        // Filter transactions for specific entity/tab
        const entityAccounts = accounts.filter(a => {
            const ent = businessEntities.find(e => e.id === a.businessEntityId);
            if (activeTab === 'business') return ent?.type === EntityType.BUSINESS;
            return ent?.type === EntityType.PERSONAL;
        });
        
        const accountIds = entityAccounts.map(a => a.id);
        const filtered = transactions.filter(t => 
            new Date(t.date).getFullYear() === selectedYear && accountIds.includes(t.accountId)
        );

        const taxableIncome = filtered.filter(t => {
            if (activeTab === 'individual') {
                return t.type === TransactionType.INCOME && t.category?.name !== 'Owner Equity / Personal Transfer';
            }
            return t.type === TransactionType.INCOME;
        }).reduce((s, t) => s + t.amount, 0);

        const equityMovements = filtered.filter(t => 
            t.category?.name === 'Owner Equity / Personal Transfer' || 
            t.category?.name === 'Owner Draw / Distributions'
        ).reduce((s, t) => s + t.amount, 0);

        const expenses = filtered.filter(t => t.type === TransactionType.EXPENSE && t.category?.isTaxDeductible).reduce((s, t) => s + t.amount, 0);

        // Map by line for display
        const lineData: Record<string, number> = {};
        filtered.forEach(t => {
            const map = activeTab === 'business' ? SCHEDULE_C_MAP : FORM_1040_MAP;
            const line = map[t.category?.name || ''] || (t.type === TransactionType.INCOME ? 'Other Income' : 'Other Deductions');
            lineData[line] = (lineData[line] || 0) + t.amount;
        });

        return { taxableIncome, expenses, net: taxableIncome - expenses, equityMovements, lineData };
    }, [transactions, activeTab, selectedYear, accounts, businessEntities]);

    return (
        <div className="container-fluid py-3 animate-slide-up pb-5 mb-5">
            {/* Control Bar */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 d-print-none">
                <div className="btn-group p-1 bg-white shadow-sm border rounded-4">
                    <button 
                        className={`btn btn-sm px-4 py-2 rounded-3 d-flex align-items-center gap-2 ${activeTab === 'business' ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`}
                        onClick={() => setActiveTab('business')}
                    >
                        <Briefcase size={16} /> Business (Schedule C)
                    </button>
                    <button 
                        className={`btn btn-sm px-4 py-2 rounded-3 d-flex align-items-center gap-2 ${activeTab === 'individual' ? 'btn-primary shadow' : 'btn-white border-0 text-muted'}`}
                        onClick={() => setActiveTab('individual')}
                    >
                        <User size={16} /> Individual (Form 1040)
                    </button>
                </div>

                <div className="d-flex gap-2">
                    <select className="form-select border-0 shadow-sm fw-bold rounded-3" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {availableYears.map(y => <option key={y} value={y}>{y} Fiscal Year</option>)}
                    </select>
                    <button className="btn btn-white border shadow-sm px-3" onClick={() => window.print()}><Printer size={18}/></button>
                    <button className="btn btn-black shadow-lg px-4 fw-900 d-flex align-items-center gap-2">
                        <Download size={18}/> Export PDF
                    </button>
                </div>
            </div>

            <div className="row g-4">
                {/* Main Form Viewer */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: '#fdfdfd' }}>
                        <div className="p-4 bg-white border-bottom border-light">
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                    <div className={`p-3 rounded-4 ${activeTab === 'business' ? 'bg-black text-white' : 'bg-primary text-white'}`}>
                                        {activeTab === 'business' ? <Briefcase size={28}/> : <User size={28}/>}
                                    </div>
                                    <div>
                                        <h4 className="fw-900 mb-0">{activeTab === 'business' ? 'Schedule C (Form 1040)' : 'Form 1040 Summary'}</h4>
                                        <span className="text-muted small fw-bold text-uppercase ls-1">Financial Report for {selectedYear}</span>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="fw-900 fs-2">{selectedYear}</div>
                                    <div className="text-muted small fw-bold">IRS COMPLIANT LEDGER</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 p-md-5">
                            {/* IRS FORM CONTENT */}
                            {activeTab === 'business' ? (
                                <>
                                    <div className="mb-5">
                                        <h6 className="bg-light p-2 rounded-2 fw-900 small text-uppercase ls-1 mb-3">Part I: Income</h6>
                                        <FormRow line="1" label="Gross receipts or sales" value={taxCalculation.taxableIncome} />
                                        <FormRow line="2" label="Returns and allowances" value={0} />
                                        <FormRow line="5" label="Gross Profit" value={taxCalculation.taxableIncome} bold />
                                    </div>

                                    <div className="mb-5">
                                        <h6 className="bg-light p-2 rounded-2 fw-900 small text-uppercase ls-1 mb-3">Part II: Expenses</h6>
                                        <FormRow line="8" label="Advertising" value={taxCalculation.lineData['Line 8: Advertising'] || 0} />
                                        <FormRow line="9" label="Car and truck expenses" value={taxCalculation.lineData['Line 9: Car and truck expenses'] || 0} />
                                        <FormRow line="15" label="Insurance (other than health)" value={taxCalculation.lineData['Line 15: Insurance (other than health)'] || 0} />
                                        <FormRow line="16b" label="Other interest" value={taxCalculation.lineData['Line 16b: Other interest'] || 0} />
                                        <FormRow line="17" label="Legal and professional services" value={taxCalculation.lineData['Line 17: Legal and professional services'] || 0} />
                                        <FormRow line="21" label="Repairs and maintenance" value={taxCalculation.lineData['Line 21: Repairs and maintenance'] || 0} />
                                        <FormRow line="24a" label="Travel" value={taxCalculation.lineData['Line 24a: Travel'] || 0} />
                                        <FormRow line="24b" label="Deductible meals" value={taxCalculation.lineData['Line 24b: Deductible meals'] || 0} />
                                        <FormRow line="27a" label="Other expenses" value={taxCalculation.lineData['Line 27a: Other expenses'] || 0} />
                                        
                                        <FormRow line="28" label="Total Deductible Expenses" value={taxCalculation.expenses} bold isTotal />
                                    </div>

                                    <div className="mb-4">
                                        <FormRow line="-" label="Owner Draws (Non-Deductible)" value={taxCalculation.lineData['Owner Draw / Distributions'] || 0} isInfoOnly />
                                    </div>

                                    <div className="mt-4 p-4 rounded-4 bg-dark text-white shadow-lg">
                                        <FormRow line="31" label="Net Profit or (Loss)" value={taxCalculation.net} bold />
                                        <p className="small text-white text-opacity-50 mt-2 mb-0">Total carryover to Form 1040, line 3.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-5">
                                        <h6 className="bg-primary bg-opacity-10 p-2 rounded-2 fw-900 small text-uppercase text-primary ls-1 mb-3">Taxable Income Summary</h6>
                                        <FormRow line="1z" label="Total Wages/Salaries" value={taxCalculation.lineData['Line 1z: Total Wages'] || 0} />
                                        <FormRow line="2" label="Interest & Dividends" value={taxCalculation.lineData['Line 2: Tax-exempt/Taxable interest'] || 0} />
                                        <FormRow line="3" label="Business Income (from Sched C)" value={0} />
                                        <FormRow line="9" label="Total Taxable Income" value={taxCalculation.taxableIncome} bold isTotal />
                                    </div>

                                    <div className="mb-5">
                                        <h6 className="bg-primary bg-opacity-10 p-2 rounded-2 fw-900 small text-uppercase text-primary ls-1 mb-3">Equity & Transfers (Non-Taxable)</h6>
                                        <FormRow line="-" label="Equity from Business" value={taxCalculation.lineData['Line 0: Non-Taxable Equity Movement'] || 0} isInfoOnly />
                                    </div>

                                    <div className="mb-5">
                                        <h6 className="bg-primary bg-opacity-10 p-2 rounded-2 fw-900 small text-uppercase text-primary ls-1 mb-3">Deductions & Adjustments</h6>
                                        <FormRow line="12" label="Standard Deduction" value={13850} />
                                    </div>

                                    <div className="mt-4 p-4 rounded-4 bg-primary text-white shadow-lg">
                                        <FormRow line="15" label="Taxable Income Estimate" value={Math.max(0, taxCalculation.taxableIncome - 13850)} bold />
                                        <p className="small text-white text-opacity-75 mt-2 mb-0">Note: Equity transfers are excluded from tax calculations.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="col-lg-4">
                    <Card className="border-0 shadow-sm mb-4 rounded-4">
                        <CardContent className="p-4">
                            <h6 className="fw-900 text-black mb-4 small text-uppercase ls-1 d-flex align-items-center gap-2">
                                <FileSearch size={16} className="text-primary"/> 
                                Accounting Tip
                            </h6>
                            <p className="text-muted small">
                                In the US, money moved between your business and personal accounts is an <strong>Equity Transfer</strong>.
                                <br/><br/>
                                Use "Owner Draw" for the business exit and "Owner Equity Transfer" for the personal entry.
                            </p>
                        </CardContent>
                    </Card>
                    {/* Rest of the sidebar... */}
                </div>
            </div>
        </div>
    );
};

export default TaxReports;
