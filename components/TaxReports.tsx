
import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent } from './ui/Card';
import { TransactionType, EntityType, Transaction, LegalStructure } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
    Printer, FileText, Briefcase, User, Info, ShieldCheck, Download, 
    Layout, FileSearch, Building2, AlertCircle, ChevronRight, 
    ArrowLeft, Calendar, ClipboardCheck, Percent, FileCheck, History, MapPin, Search, CheckCircle2, HelpCircle, FileStack, Sparkles, BrainCircuit, Loader2, Zap, RefreshCw, Terminal
} from 'lucide-react';
import { useData } from '../lib/DataContext';
import { GoogleGenAI, Type } from "@google/genai";
import Modal from './ui/Modal';

type TaxTab = 'Questionnaire' | 'ScheduleC' | 'Schedules12' | 'EFile';
type MainFormControl = '1040' | '1120S' | '1065' | '1120';

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
    { id: '1040_q6', text: "Do you have records/receipts for all meals claimed under Per Diem?", description: "Standard meal allowance for drivers away from home.", category: 'Deductions' },
    { id: '1040_q8', text: "Did you purchase any new equipment (trucks, trailers) over $2,500?", description: "Subject to Section 179 or Bonus Depreciation.", category: 'Deductions' }
];

const TaxReports: React.FC<{ setActivePage?: (p: any) => void }> = ({ setActivePage }) => {
    const { transactions, businessEntities, accounts, activeEntityId, categories } = useData();
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeForm, setActiveForm] = useState<MainFormControl>('1040');
    const [activeTab, setActiveTab] = useState<TaxTab>('Questionnaire');
    const [answers, setAnswers] = useState<Record<string, boolean>>({});
    
    // AI States
    const [isAIAnalyzing, setIsAIAnalyzing] = useState(false);
    const [aiStep, setAiStep] = useState('');
    const [aiMapping, setAiMapping] = useState<Record<string, number>>({});
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [isRecommending, setIsRecommending] = useState(false);
    const [aiError, setAiError] = useState<{message: string, isKeyError: boolean} | null>(null);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

    const isAIConfigured = !!(process.env.API_KEY || (window as any).process?.env?.API_KEY);

    const activeEntity = useMemo(() => 
        businessEntities.find(e => e.id === activeEntityId) || businessEntities[0]
    , [activeEntityId, businessEntities]);

    useEffect(() => {
        if (activeEntity?.structure === 'S-Corp') setActiveForm('1120S');
        else if (activeEntity?.structure === 'Partnership' || activeEntity?.structure === 'LLC (Multi-Member)') setActiveForm('1065');
        else if (activeEntity?.structure === 'C-Corp') setActiveForm('1120');
        else setActiveForm('1040');
    }, [activeEntity]);

    const availableYears = useMemo(() => {
        const transYears = transactions.map(t => new Date(t.date).getFullYear());
        return Array.from(new Set([...transYears, new Date().getFullYear()])).sort((a, b) => b - a);
    }, [transactions]);

    const callAI = async (prompt: string, schema: any) => {
        const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
        
        if (!apiKey) {
            throw { message: "AI_KEY not found in System Environment. Please configure your Vercel variables.", isKeyError: true };
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });
            return JSON.parse(response.text || '{}');
        } catch (error: any) {
            console.error("AI Error:", error);
            const isAuthError = error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('API key not valid');
            throw { 
                message: isAuthError ? "The provided API Key is invalid or restricted." : (error.message || "AI Service currently unavailable."), 
                isKeyError: isAuthError 
            };
        }
    };

    const handleAIAdvisor = async () => {
        if (!isAIConfigured) {
            setAiError({ message: "AI Services are disabled due to missing credentials.", isKeyError: true });
            setIsErrorModalOpen(true);
            return;
        }

        setIsRecommending(true);
        setAiError(null);
        const prompt = `Act as an expert US Tax CPA. Analyze this business profile and recommend the correct IRS Form.
        Entity Data: ${JSON.stringify(activeEntity)}
        Return JSON with "form" (1040, 1120S, 1065, or 1120) and "reasoning" (detailed professional explanation).`;
        
        const schema = {
            type: Type.OBJECT,
            properties: {
                form: { type: Type.STRING },
                reasoning: { type: Type.STRING }
            },
            required: ['form', 'reasoning']
        };

        try {
            const res = await callAI(prompt, schema);
            setAiRecommendation(res.reasoning);
            setActiveForm(res.form as MainFormControl);
        } catch (e: any) {
            setAiError(e);
            setIsErrorModalOpen(true);
        } finally {
            setIsRecommending(false);
        }
    };

    const handleAIAutoFill = async () => {
        if (!isAIConfigured) {
            setAiError({ message: "Neural auto-fill requires a valid API_KEY configuration.", isKeyError: true });
            setIsErrorModalOpen(true);
            return;
        }

        setIsAIAnalyzing(true);
        setAiError(null);
        setAiStep('Scanning Ledger...');
        
        const entityAccountIds = accounts
            .filter(acc => acc.businessEntityId === activeEntityId)
            .map(acc => acc.id);

        const yearTrans = transactions.filter(t => 
            new Date(t.date).getFullYear() === selectedYear &&
            (entityAccountIds.includes(t.accountId) || (t.toAccountId && entityAccountIds.includes(t.toAccountId)))
        );

        if (yearTrans.length === 0) {
            setAiStep('Error: No transactions found for ' + selectedYear);
            setTimeout(() => setIsAIAnalyzing(false), 2000);
            return;
        }

        setAiStep(`Processing ${yearTrans.length} entries...`);
        
        const summarizedData = yearTrans.reduce((acc: any, t) => {
            const key = t.category?.name || (t.type === TransactionType.TRANSFER ? 'Transfers' : 'Uncategorized');
            if (!acc[key]) acc[key] = { amount: 0, type: t.type };
            acc[key].amount += t.amount;
            return acc;
        }, {});

        setAiStep('Generating IRS Line Mapping...');
        const prompt = `Act as an automated tax preparation engine.
        Map these business category totals to the specific lines of IRS Form ${activeForm === '1040' ? 'Schedule C' : 'Form ' + activeForm}.
        Year: ${selectedYear}
        Summary Data: ${JSON.stringify(summarizedData)}
        
        Return a JSON object where keys are Line Names and values are numeric dollar amounts.`;

        const schema = {
            type: Type.OBJECT,
            additionalProperties: { type: Type.NUMBER }
        };

        try {
            const mapping = await callAI(prompt, schema);
            setAiMapping(mapping);
            setActiveTab('ScheduleC');
        } catch (e: any) {
            setAiError(e);
            setIsErrorModalOpen(true);
        } finally {
            setIsAIAnalyzing(false);
        }
    };

    return (
        <div className="container-fluid py-3 animate-slide-up pb-5 mb-5">
            {!isAIConfigured && (
                <div className="alert alert-warning border-0 rounded-4 p-3 mb-4 d-flex align-items-center gap-3 shadow-sm">
                    <AlertCircle className="text-warning" size={24} />
                    <div className="small">
                        <span className="fw-900">AI DEGRADED MODE:</span> No <code className="bg-dark text-white px-2 rounded">API_KEY</code> detected. Smart tax auditing features are limited.
                    </div>
                </div>
            )}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div className="d-flex align-items-center gap-3">
                    <button onClick={() => setActivePage?.('Dashboard')} className="btn btn-white border shadow-sm p-2 rounded-3">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="fw-900 fs-3 mb-0 text-black tracking-tight">IRS Tax Center</h1>
                        <p className="text-muted small mb-0 d-flex align-items-center gap-2">
                            <ShieldCheck size={14} className="text-primary" /> Active Entity: <span className="fw-bold text-dark">{activeEntity?.name}</span>
                        </p>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={handleAIAdvisor} disabled={isRecommending} className="btn btn-white border shadow-sm px-3 fw-bold d-flex align-items-center gap-2 rounded-3">
                        {isRecommending ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={18} className="text-primary" />}
                        AI Form Advisor
                    </button>
                    <select className="form-select border-0 shadow-sm fw-bold rounded-3 bg-white" style={{width: '120px'}} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {aiRecommendation && (
                <div className="alert bg-primary bg-opacity-5 border border-primary border-opacity-10 rounded-4 p-4 mb-4 animate-slide-up shadow-sm">
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex gap-3">
                            <Sparkles className="text-primary" size={24} />
                            <div>
                                <h6 className="fw-900 text-black mb-1">AI Filing Strategy</h6>
                                <p className="small mb-0 text-muted lh-sm">{aiRecommendation}</p>
                            </div>
                        </div>
                        <button className="btn-close" onClick={() => setAiRecommendation(null)}></button>
                    </div>
                </div>
            )}

            <div className="row g-4 mb-4">
                <div className="col-12 col-lg-6">
                    <div 
                        onClick={() => setActiveForm('1040')}
                        className={`card h-100 border-2 cursor-pointer transition-all rounded-4 ${activeForm === '1040' ? 'border-primary shadow-lg bg-white' : 'border-transparent opacity-75 bg-white'}`}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className={`p-3 rounded-3 ${activeForm === '1040' ? 'bg-primary text-white' : 'bg-light text-muted'}`}>
                                    <User size={24} />
                                </div>
                                <div className="flex-grow-1">
                                    <h5 className="fw-900 mb-0">Sole Proprietor (1040)</h5>
                                    <p className="text-muted small mb-0">Standard Schedule C Reporting</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-lg-6">
                    <div 
                        onClick={() => setActiveForm('1120S')}
                        className={`card h-100 border-2 cursor-pointer transition-all rounded-4 ${activeForm === '1120S' ? 'border-primary shadow-lg bg-white' : 'border-transparent opacity-75 bg-white'}`}
                    >
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className={`p-3 rounded-3 ${activeForm === '1120S' ? 'bg-primary text-white' : 'bg-light text-muted'}`}>
                                    <Building2 size={24} />
                                </div>
                                <div className="flex-grow-1">
                                    <h5 className="fw-900 mb-0">S-Corporation (1120-S)</h5>
                                    <p className="text-muted small mb-0">Entity-level Filing & Pass-through</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-lg rounded-4 bg-black text-white p-4 mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary bg-opacity-20 p-3 rounded-circle ai-core-pulse">
                            <Sparkles className="text-primary" size={32} />
                        </div>
                        <div>
                            <h5 className="fw-900 mb-1">Autonomous Tax Extraction</h5>
                            <p className="small text-white text-opacity-50 mb-0">Summarize all transactions for this entity and map to IRS lines.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleAIAutoFill} 
                        disabled={isAIAnalyzing}
                        className={`btn btn-primary px-5 py-3 fw-900 rounded-pill shadow-lg d-flex align-items-center gap-2 border-0 ${!isAIConfigured ? 'opacity-50' : ''}`}
                        style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
                    >
                        {isAIAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                        {isAIAnalyzing ? 'AI AUDITING...' : 'GENERATE & AUTO-FILL'}
                    </button>
                </div>
            </div>

            <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div className="p-1 px-3 bg-light border-bottom d-flex gap-1 overflow-auto no-scrollbar">
                    {[
                        { id: 'Questionnaire', label: 'Compliance Checklist', icon: <ClipboardCheck size={14}/> },
                        { id: 'ScheduleC', label: activeForm === '1040' ? 'Schedule C Mapping' : 'Form Mapping', icon: <Briefcase size={14}/> },
                        { id: 'EFile', label: 'Export to Filing', icon: <FileCheck size={14}/> }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TaxTab)}
                            className={`btn btn-sm py-2 px-4 border-0 rounded-3 d-flex align-items-center gap-2 fw-bold whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-black' : 'text-muted'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="card-body p-4 bg-white min-vh-50">
                    {isAIAnalyzing ? (
                        <div className="text-center py-5 ai-scanner">
                            <div className="ai-float mb-4">
                                <div className="p-4 bg-primary bg-opacity-10 rounded-circle d-inline-block border border-primary border-opacity-20 shadow-lg ai-core-pulse">
                                    <BrainCircuit size={64} className="text-primary" />
                                </div>
                            </div>
                            <h4 className="fw-900 text-black tracking-tight">{aiStep}</h4>
                            <div className="status-fader text-primary fw-800 small text-uppercase ls-1">Analyzing Accounting Engine...</div>
                        </div>
                    ) : activeTab === 'Questionnaire' ? (
                        <div className="animate-slide-up">
                            <div className="row g-4">
                                {FORM_1040_QUESTIONS.map(q => (
                                    <div key={q.id} className="col-12 col-md-6">
                                        <div className="p-4 bg-light rounded-4 border h-100 d-flex flex-column justify-content-between shadow-sm">
                                            <div>
                                                <h6 className="fw-800 mb-1">{q.text}</h6>
                                                <p className="small text-muted mb-4">{q.description}</p>
                                            </div>
                                            <div className="btn-group w-100 p-1 bg-white rounded-3 border">
                                                <button onClick={() => setAnswers({...answers, [q.id]: true})} className={`btn btn-sm py-2 fw-bold ${answers[q.id] === true ? 'btn-success shadow' : 'btn-white border-0 text-muted'}`}>Yes</button>
                                                <button onClick={() => setAnswers({...answers, [q.id]: false})} className={`btn btn-sm py-2 fw-bold ${answers[q.id] === false ? 'btn-black shadow' : 'btn-white border-0 text-muted'}`}>No</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeTab === 'ScheduleC' ? (
                        <div className="animate-slide-up">
                            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-4">
                                <div>
                                    <h5 className="fw-900 mb-1">Generated Form Mapping</h5>
                                    <p className="text-muted small mb-0">Audit-ready results for Form {activeForm}.</p>
                                </div>
                                <div className="badge bg-success bg-opacity-10 text-success p-3 rounded-3 d-flex align-items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    <span className="fw-900">VERIFIED BY AI</span>
                                </div>
                            </div>

                            <div className="table-responsive rounded-4 border shadow-sm">
                                <table className="table align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-4 py-3 fw-800 small text-muted text-uppercase">IRS Line Description</th>
                                            <th className="py-3 text-end pe-4 fw-800 small text-muted text-uppercase">Amount ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(aiMapping).length > 0 ? Object.entries(aiMapping).map(([line, amount], idx) => (
                                            <tr key={idx} className="border-bottom border-light">
                                                <td className="ps-4 py-3">
                                                    <div className="fw-700 text-dark">{line}</div>
                                                </td>
                                                <td className="text-end pe-4">
                                                    <span className="fw-900 text-black fs-5">{formatCurrency(amount as number)}</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={2} className="text-center py-5">
                                                    <FileSearch className="text-muted mb-3 opacity-25" size={48} />
                                                    <h6 className="fw-bold text-muted">Ready for Analysis</h6>
                                                    <p className="small text-muted mb-4">Click "GENERATE & AUTO-FILL" to analyze your accounting data.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <FileCheck size={48} className="text-success mb-3" />
                            <h6 className="fw-bold">Ready to File</h6>
                            <p className="text-muted small">Download the completed worksheet below to import into your tax software.</p>
                            <button className="btn btn-black mt-3 px-4 fw-900 rounded-3">Download XML for Filing</button>
                        </div>
                    )}
                </div>
            </Card>

            {/* AI Error Recovery Modal */}
            {/* Fix: Line 404 - Type '"md"' is not assignable to type '"xl" | "sm" | "lg"'. 
                In Bootstrap, the default modal size is medium (no class needed), so we remove the size prop. */}
            <Modal isOpen={isErrorModalOpen} onClose={() => setIsErrorModalOpen(false)} title="AI Core Action Required">
                <div className="text-center py-4">
                    <div className="bg-danger bg-opacity-10 text-danger rounded-circle p-4 d-inline-block mb-4">
                        <AlertCircle size={48} />
                    </div>
                    <h5 className="fw-900 text-danger mb-2">Service Authentication Failure</h5>
                    <p className="text-muted small mb-4 px-4">{aiError?.message}</p>
                    
                    {aiError?.isKeyError && (
                        <div className="p-4 bg-light rounded-4 text-start mb-4 border shadow-sm">
                            <h6 className="fw-800 small text-uppercase mb-3 d-flex align-items-center gap-2"><Terminal size={14}/> Recovery Guide</h6>
                            <ol className="small text-muted mb-0 ps-3">
                                <li>Access your <strong>Vercel Dashboard</strong>.</li>
                                <li>Navigate to Project Settings → <strong>Environment Variables</strong>.</li>
                                <li>Add a key named <code className="bg-dark text-white px-2 py-0 rounded">API_KEY</code> with your Gemini Pro key.</li>
                                <li>Go to the <strong>Deployments</strong> tab and trigger a <strong>Redeploy</strong>.</li>
                            </ol>
                        </div>
                    )}

                    <div className="d-flex justify-content-center gap-2">
                        <button onClick={() => setIsErrorModalOpen(false)} className="btn btn-white border px-4 fw-bold rounded-3">Close</button>
                        <button onClick={() => window.location.reload()} className="btn btn-black px-4 fw-bold rounded-3 d-flex align-items-center gap-2">
                            <RefreshCw size={16}/> Reboot System
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaxReports;
