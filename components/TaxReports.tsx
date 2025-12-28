import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent } from './ui/Card';
import { TransactionType, EntityType, Transaction, LegalStructure } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
    Printer, FileText, Briefcase, User, Info, ShieldCheck, Download, 
    Layout, FileSearch, Building2, AlertCircle, ChevronRight, 
    ArrowLeft, Calendar, ClipboardCheck, Percent, FileCheck, History, MapPin, Search, CheckCircle2, HelpCircle, FileStack
} from 'lucide-react';
import { useData } from '../lib/DataContext';

type TaxTab = 'Questionnaire' | 'Form1040' | 'Schedules12' | 'ScheduleC' | 'ScheduleSE' | 'QBI' | 'EFile' | 'State' | 'History';
type MainFormControl = '1040' | '1120S';

interface Question {
    id: string;
    text: string;
    description?: string;
    category?: 'General' | 'Deductions' | 'Reporting';
}

const FORM_1040_QUESTIONS: Question[] = [
    { id: '1040_q1', text: "Did you receive any 1099-NEC forms for your trucking services?", description: "Non-employee compensation for independent contractors.", category: 'General' },
    { id: '1040_q2', text: "Did you materially participate in the operation of this business?", description: "Significant involvement in day-to-day operations.", category: 'General' },
    { id: '1040_q3', text: "Did you pay any independent contractors more than $600 during the year?", description: "Triggers requirement for filing Form 1099.", category: 'Reporting' },
    { id: '1040_q4', text: "If yes, did you or will you file the required Forms 1099?", description: "IRS compliance check for 1099-NEC/MISC.", category: 'Reporting' },
    { id: '1040_q5', text: "Did you use a personal vehicle for business purposes?", description: "Allows for mileage or actual expense deduction.", category: 'Deductions' },
    { id: '1040_q6', text: "Do you have records/receipts for all meals claimed under Per Diem?", description: "Standard meal allowance for drivers away from home.", category: 'Deductions' },
    { id: '1040_q7', text: "Did you have a home office used exclusively for your business?", description: "Triggers Schedule C Home Office deduction.", category: 'Deductions' },
    { id: '1040_q8', text: "Did you purchase any new equipment (trucks, trailers) over $2,500?", description: "Subject to Section 179 or Bonus Depreciation.", category: 'Deductions' },
    { id: '1040_q9', text: "Was there any change in your accounting method this year?", description: "From Cash to Accrual or vice-versa.", category: 'General' }
];

const FORM_1120S_QUESTIONS: Question[] = [
    { id: '1120s_q1', text: "Did the corporation change its method of accounting during the year?", description: "Cash to Accrual or vice versa.", category: 'General' },
    { id: '1120s_q2', text: "Were there any changes in stock ownership among shareholders?", description: "Critical for S-Corp distribution tracking.", category: 'General' },
    { id: '1120s_q3', text: "Did the corporation pay health insurance for 2%+ shareholders?", description: "Must be included on W-2 to be deductible.", category: 'Deductions' },
    { id: '1120s_q4', text: "Did the corporation own 20% or more of any other entity?", description: "Related party disclosures.", category: 'Reporting' },
    { id: '1120s_q5', text: "Was there a distribution of property other than cash?", description: "Triggers gain/loss recognition at corp level.", category: 'Reporting' },
    { id: '1120s_q6', text: "Did you make payments requiring 1099-NEC filing for the S-Corp?", description: "Corporate compliance for contractors.", category: 'Reporting' },
    { id: '1120s_q7', text: "Were any loans made between the corp and shareholders?", description: "Interest rates must be at AFR levels.", category: 'General' },
    { id: '1120s_q8', text: "Did the corporation pay reasonable officer compensation (W-2)?", description: "IRS requirement for S-Corp status.", category: 'Deductions' }
];

const TaxReports: React.FC<{ setActivePage?: (p: any) => void }> = ({ setActivePage }) => {
    const { transactions, businessEntities, accounts, activeEntityId } = useData();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeForm, setActiveForm] = useState<MainFormControl>('1040');
    const [activeTab, setActiveTab] = useState<TaxTab>('Questionnaire');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});

    const activeEntity = useMemo(() => 
        businessEntities.find(e => e.id === activeEntityId) || businessEntities[0]
    , [activeEntityId, businessEntities]);

    useEffect(() => {
        if (activeEntity?.structure === 'S-Corp') setActiveForm('1120S');
        else setActiveForm('1040');
    }, [activeEntity]);

    // Explicitly typed as number[] to avoid 'unknown' inference in map calls
    const availableYears: number[] = useMemo(() => {
        const transYears = transactions.map(t => new Date(t.date).getFullYear());
        const years = Array.from<number>(new Set([...transYears, new Date().getFullYear()])).sort((a, b) => b - a);
        return years;
    }, [transactions]);

    const taxData = useMemo(() => {
        const entityAccounts = accounts.filter(a => a.businessEntityId === activeEntityId);
        const accountIds = entityAccounts.map(a => a.id);
        
        const filtered = transactions.filter(t => {
            const date = new Date(t.date);
            const yearMatch = date.getFullYear() === selectedYear;
            const accountMatch = accountIds.includes(t.accountId) || (t.toAccountId && accountIds.includes(t.toAccountId));
            return yearMatch && accountMatch;
        });

        let grossRevenue = 0;
        let totalExpenses = 0;
        const categoryTotals: Record<string, number> = {};

        filtered.forEach(t => {
            const val = Number(t.amount) || 0;
            if (t.type === TransactionType.INCOME) {
                grossRevenue += val;
            } else if (t.type === TransactionType.EXPENSE && t.category?.isTaxDeductible) {
                totalExpenses += val;
                const catName = t.category.name;
                categoryTotals[catName] = (categoryTotals[catName] || 0) + val;
            }
        });

        return { grossRevenue, totalExpenses, netProfit: grossRevenue - totalExpenses, categoryTotals, transactionCount: filtered.length };
    }, [transactions, activeEntityId, selectedYear, accounts]);

    const handleAnswer = (qId: string, answer: boolean) => {
        setAnswers(prev => ({ ...prev, [qId]: answer }));
    };

    const currentQuestions = activeForm === '1040' ? FORM_1040_QUESTIONS : FORM_1120S_QUESTIONS;
    const answeredCount = currentQuestions.filter(q => answers[q.id] !== undefined).length;
    const progressPercent = Math.round((answeredCount / currentQuestions.length) * 100);

    return (
        <div className="container-fluid py-3 animate-slide-up pb-5 mb-5">
            {/* Header Area */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div className="d-flex align-items-center gap-3">
                    <button onClick={() => setActivePage?.('Dashboard')} className="btn btn-white border shadow-sm p-2 rounded-3">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="fw-900 fs-3 mb-0 text-black tracking-tight">Tax Reports & Forms</h1>
                        <p className="text-muted small mb-0 d-flex align-items-center gap-2">
                            <Calendar size={14} /> Complete tax forms for Federal & State filing - {selectedYear}
                        </p>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <select className="form-select border-0 shadow-sm fw-bold rounded-3 bg-white" style={{width: '120px'}} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button className="btn btn-success border-0 shadow-sm px-4 fw-bold d-flex align-items-center gap-2 rounded-3" style={{backgroundColor: '#059669'}}>
                        <Download size={18}/> Export to CSV
                    </button>
                </div>
            </div>

            {/* Main Form Selection Cards */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-lg-6">
                    <div 
                        onClick={() => setActiveForm('1040')}
                        className={`card h-100 border-2 cursor-pointer transition-all rounded-4 ${activeForm === '1040' ? 'border-primary shadow-lg bg-white' : 'border-transparent bg-white opacity-75'}`}
                        style={{ minHeight: '160px' }}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div className={`p-3 rounded-3 ${activeForm === '1040' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-light text-muted'}`}>
                                    <User size={24} />
                                </div>
                                <div className="flex-grow-1">
                                    <h5 className="fw-900 mb-0">Form 1040</h5>
                                    <p className="text-muted small mb-0">Individual Income Tax Return</p>
                                </div>
                                {activeForm === '1040' && <ChevronRight size={20} className="text-primary" />}
                            </div>
                            <div className="row g-2">
                                {[
                                    { id: '1040', label: '1040', icon: <User size={14}/> },
                                    { id: 'SchC', label: 'Sch C', icon: <FileText size={14}/> },
                                    { id: 'SchSE', label: 'Sch SE', icon: <Percent size={14}/> },
                                    { id: 'State', label: 'State', icon: <MapPin size={14}/> }
                                ].map(item => (
                                    <div key={item.id} className="col-3">
                                        <div className="bg-light rounded-3 p-2 text-center border">
                                            <div className="text-muted mb-1">{item.icon}</div>
                                            <div className="fw-bold" style={{fontSize: '0.65rem'}}>{item.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-muted mt-3 mb-0" style={{fontSize: '0.7rem'}}>Personal income tax forms for W-2, 1099, self-employment income, and state taxes.</p>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-6">
                    <div 
                        onClick={() => setActiveForm('1120S')}
                        className={`card h-100 border-2 cursor-pointer transition-all rounded-4 ${activeForm === '1120S' ? 'border-primary shadow-lg bg-white' : 'border-transparent bg-white opacity-75'}`}
                        style={{ minHeight: '160px' }}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div className={`p-3 rounded-3 ${activeForm === '1120S' ? 'bg-purple bg-opacity-10 text-purple' : 'bg-light text-muted'}`}>
                                    <Building2 size={24} />
                                </div>
                                <div className="flex-grow-1">
                                    <h5 className="fw-900 mb-0">Form 1120S</h5>
                                    <p className="text-muted small mb-0">S-Corporation Tax Return</p>
                                </div>
                                {activeForm === '1120S' && <ChevronRight size={20} className="text-primary" />}
                            </div>
                            <div className="row g-2">
                                {[
                                    { id: '1120S', label: '1120S', icon: <Briefcase size={14}/> },
                                    { id: 'K1', label: 'K-1', icon: <FileCheck size={14}/> }
                                ].map(item => (
                                    <div key={item.id} className="col-3">
                                        <div className="bg-light rounded-3 p-2 text-center border">
                                            <div className="text-muted mb-1">{item.icon}</div>
                                            <div className="fw-bold" style={{fontSize: '0.65rem'}}>{item.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-muted mt-3 mb-0" style={{fontSize: '0.7rem'}}>S-Corporation income tax return and Schedule K-1 for shareholder distributions.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation Section */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div className="bg-primary bg-opacity-5 p-3 px-4 border-bottom border-primary border-opacity-10 d-flex align-items-center gap-2">
                    <User size={18} className="text-primary" />
                    <span className="fw-800 text-primary small">Form {activeForm} - {activeForm === '1040' ? 'Individual' : 'S-Corp'} Tax Return & Schedules</span>
                </div>
                <div className="p-1 px-3 bg-light border-bottom d-flex gap-1 overflow-auto no-scrollbar">
                    {[
                        { id: 'Questionnaire', label: 'Questionnaire', icon: <ClipboardCheck size={14}/> },
                        { id: 'Form1040', label: activeForm === '1040' ? 'Form 1040' : 'Form 1120S', icon: <FileSearch size={14}/> },
                        { id: 'Schedules12', label: 'Schedules 1 & 2', icon: <Layout size={14}/> },
                        { id: 'ScheduleC', label: 'Schedule C', icon: <Briefcase size={14}/> },
                        { id: 'ScheduleSE', label: 'Schedule SE', icon: <Percent size={14}/> },
                        { id: 'EFile', label: 'E-File (8879)', icon: <FileCheck size={14}/> },
                        { id: 'History', label: 'History', icon: <History size={14}/> }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TaxTab)}
                            className={`btn btn-sm py-2 px-3 border-0 rounded-3 d-flex align-items-center gap-2 fw-bold whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-black' : 'text-muted'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="card-body p-4 bg-white">
                    {activeTab === 'Questionnaire' && (
                        <div className="animate-slide-up">
                            <div className="alert alert-primary bg-primary bg-opacity-5 border-0 rounded-4 p-4 d-flex justify-content-between align-items-center">
                                <div className="d-flex gap-3">
                                    <ClipboardCheck className="text-primary flex-shrink-0" size={24} />
                                    <div>
                                        <h6 className="fw-900 text-black mb-1">Tax Questionnaire - {activeForm === '1040' ? 'Personal & Sole Prop' : 'S-Corp Compliance'}</h6>
                                        <p className="small mb-0 text-muted">Complete these questions to determine required filings and eligible tax credits.</p>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="fw-900 fs-4 mb-0 text-primary">{progressPercent}%</div>
                                    <small className="text-muted fw-bold" style={{fontSize: '0.6rem'}}>COMPLETED</small>
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                {['General', 'Deductions', 'Reporting'].map((cat) => {
                                    const catQuestions = currentQuestions.filter(q => q.category === cat);
                                    if (catQuestions.length === 0) return null;
                                    return (
                                        <div key={cat} className="mb-5">
                                            <h6 className="fw-800 mb-3 text-muted small text-uppercase ls-1">{cat} Compliance Info</h6>
                                            <div className="d-flex flex-column gap-3">
                                                {catQuestions.map((q) => (
                                                    <div key={q.id} className="p-3 bg-light rounded-4 d-flex justify-content-between align-items-center border transition-all hover-shadow-sm">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className={`p-2 rounded-circle ${answers[q.id] !== undefined ? 'bg-success bg-opacity-10 text-success' : 'bg-white text-muted'}`}>
                                                                {answers[q.id] !== undefined ? <CheckCircle2 size={16} /> : <HelpCircle size={16} />}
                                                            </div>
                                                            <div>
                                                                <span className="fw-700 small text-dark d-block">{q.text}</span>
                                                                {q.description && <small className="text-muted" style={{fontSize: '0.65rem'}}>{q.description}</small>}
                                                            </div>
                                                        </div>
                                                        <div className="btn-group shadow-sm p-1 bg-white border rounded-3">
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleAnswer(q.id, true)} 
                                                                className={`btn btn-sm px-4 fw-bold transition-all ${answers[q.id] === true ? 'btn-success text-white shadow-sm' : 'btn-white border-0 text-muted'}`}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleAnswer(q.id, false)} 
                                                                className={`btn btn-sm px-4 fw-bold transition-all ${answers[q.id] === false ? 'btn-black text-white shadow-sm' : 'btn-white border-0 text-muted'}`}
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'ScheduleC' && (
                        <div className="animate-slide-up">
                            <div className="d-flex justify-content-between align-items-end mb-4">
                                <div>
                                    <h5 className="fw-900 mb-1">Schedule C (Form 1040)</h5>
                                    <p className="text-muted small mb-0">Profit or Loss From Business (Sole Proprietorship)</p>
                                </div>
                                <div className="text-end">
                                    <small className="text-muted d-block fw-bold" style={{fontSize: '0.6rem'}}>TOTAL DEDUCTIONS</small>
                                    <h4 className="fw-900 text-danger mb-0">{formatCurrency(taxData.totalExpenses)}</h4>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4 py-3 border-0 fw-800 small text-muted text-uppercase">Form Line</th>
                                            <th className="py-3 border-0 fw-800 small text-muted text-uppercase">Description</th>
                                            <th className="py-3 border-0 fw-800 small text-muted text-uppercase text-end">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="ps-4 py-3 fw-bold text-muted">Line 1</td>
                                            <td className="py-3 fw-800">Gross receipts or sales</td>
                                            <td className="py-3 text-end fw-900 text-success">{formatCurrency(taxData.grossRevenue)}</td>
                                        </tr>
                                        {Object.entries(taxData.categoryTotals).map(([name, val], idx) => (
                                            <tr key={idx}>
                                                <td className="ps-4 py-3 fw-bold text-muted">Line {idx + 8}</td>
                                                <td className="py-3 fw-600">{name}</td>
                                                <td className="py-3 text-end fw-800">{formatCurrency(val)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-light bg-opacity-50">
                                            <td className="ps-4 py-3 fw-900" colSpan={2}>Net Profit or (Loss)</td>
                                            <td className={`py-3 text-end fw-900 fs-5 ${taxData.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(taxData.netProfit)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'Questionnaire' && activeTab !== 'ScheduleC' && (
                        <div className="text-center py-5">
                            <FileSearch size={48} className="text-muted opacity-25 mb-3" />
                            <h6 className="fw-bold">Preview not available</h6>
                            <p className="text-muted small">This form is automatically generated during final export based on your ledger data.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Verification Footer */}
            <div className="card border-0 shadow-sm rounded-4 bg-dark text-white p-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`p-2 rounded-3 ${progressPercent === 100 ? 'bg-success text-white' : 'bg-primary bg-opacity-20 text-primary'}`}>
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h6 className="fw-900 mb-0">Compliance Check Status</h6>
                            <p className="small mb-0 text-white text-opacity-50">Verified mapping for {taxData.transactionCount} transactions. {progressPercent}% of questionnaire complete.</p>
                        </div>
                    </div>
                    <div className="d-flex gap-3 w-100 w-md-auto">
                        <div className="text-end d-none d-md-block">
                            <small className="text-white text-opacity-50 d-block fw-bold" style={{fontSize: '0.6rem'}}>DEDUCTIBILITY RATE</small>
                            <span className="fw-900">{taxData.grossRevenue > 0 ? Math.round((taxData.totalExpenses / taxData.grossRevenue) * 100) : 0}% of revenue</span>
                        </div>
                        <button className="btn btn-primary px-4 fw-900 rounded-3 shadow" disabled={progressPercent < 50}>Lock and Archive Period</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxReports;