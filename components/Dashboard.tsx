
import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ArrowRight, Plus, Calendar, Filter, Download, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate, downloadCSV } from '../lib/utils';
import { Page } from '../App';
import { useData } from '../lib/DataContext';
import ExportMenu from './ui/ExportMenu';
import { TransactionType } from '../types';

const StatCard: React.FC<{ title: string; amount: string; change: string; isPositive: boolean }> = ({ title, amount, change, isPositive }) => (
    <div className="card h-100 p-4 animate-slide-up">
        <p className="text-muted fw-700 text-uppercase mb-2" style={{fontSize: '0.7rem', letterSpacing: '0.05em'}}>{title}</p>
        <div className="d-flex align-items-baseline gap-2 mb-1">
            <h2 className="stat-value text-black mb-0">{amount}</h2>
            <div className={`d-flex align-items-center small fw-800 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {change}
            </div>
        </div>
        <div className="mt-3"><div className="bg-light rounded-pill" style={{height: 4, width: '100%'}}><div className={`rounded-pill ${isPositive ? 'bg-success' : 'bg-danger'}`} style={{height: 4, width: '65%'}}></div></div></div>
    </div>
);

type Period = '1M' | '3M' | '1Y';

const Dashboard: React.FC<{ setActivePage: (p: Page) => void }> = ({ setActivePage }) => {
    const { transactions } = useData();
    const [chartPeriod, setChartPeriod] = useState<Period>('1M');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Somatória garantindo conversão numérica estrita
    const revenue = useMemo(() => 
        transactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    , [transactions]);

    const expense = useMemo(() => 
        transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    , [transactions]);

    const profit = revenue - expense;

    const chartData = useMemo(() => {
        if (transactions.length === 0) return [];

        const lastDate = transactions.length > 0 
            ? new Date(Math.max(...transactions.map(t => new Date(t.date).getTime())))
            : new Date();
        
        const startDate = new Date(lastDate);
        if (chartPeriod === '1M') startDate.setMonth(lastDate.getMonth() - 1);
        else if (chartPeriod === '3M') startDate.setMonth(lastDate.getMonth() - 3);
        else if (chartPeriod === '1Y') startDate.setFullYear(lastDate.getFullYear() - 1);

        const filtered = transactions.filter(t => new Date(t.date) >= startDate);
        
        const aggregated: { [key: string]: number } = {};
        filtered.forEach(t => {
            const day = t.date.split('T')[0];
            const val = t.type === TransactionType.INCOME ? Number(t.amount) : -Number(t.amount);
            aggregated[day] = (aggregated[day] || 0) + val;
        });

        const result = Object.entries(aggregated)
            .map(([date, value]) => ({ 
                name: formatDate(date), 
                value, 
                rawDate: new Date(date).getTime() 
            }))
            .sort((a, b) => a.rawDate - b.rawDate);

        return result.length > 0 ? result : [{ name: 'N/A', value: 0 }];
    }, [transactions, chartPeriod]);

    return (
        <div className="container-fluid py-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div className="d-print-block">
                    <h1 className="fw-800 tracking-tight text-black mb-1">Financial Overview</h1>
                    <p className="text-muted mb-0">Your fleet's performance for the current period.</p>
                </div>
                <div className="d-flex gap-2 d-print-none">
                    <button onClick={() => setActivePage('Transactions')} className="btn btn-primary shadow-lg d-flex align-items-center"><Plus size={18} className="me-2"/> New Entry</button>
                </div>
            </div>

            <div className="row g-4 mb-5">
                <div className="col-12 col-md-4">
                    <StatCard title="Gross Revenue" amount={formatCurrency(revenue)} change="+12.4%" isPositive={true} />
                </div>
                <div className="col-12 col-md-4">
                    <StatCard title="Operating Expenses" amount={formatCurrency(expense)} change="+3.2%" isPositive={false} />
                </div>
                <div className="col-12 col-md-4">
                    <StatCard title="Net Margin" amount={formatCurrency(profit)} change="+8.1%" isPositive={true} />
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12 col-xl-8">
                    <div className="card p-4 h-100 overflow-hidden">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-800 text-black mb-0">Cash Flow Trends</h5>
                            <div className="btn-group border rounded-3 p-1 d-print-none">
                                {(['1M', '3M', '1Y'] as Period[]).map((p) => (
                                    <button 
                                        key={p}
                                        onClick={() => setChartPeriod(p)}
                                        className={`btn btn-sm rounded-2 px-3 transition-all ${chartPeriod === p ? 'btn-dark shadow-sm' : 'btn-white border-0 text-muted'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ height: 350, minHeight: 350, width: '100%' }}>
                            {isMounted && chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                                                <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fill: '#94a3b8', fontSize: 10}} 
                                            dy={10} 
                                            minTickGap={30}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(v) => `$${v/1000}k`} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} 
                                            formatter={(value: number) => [formatCurrency(value), 'Net Flow']}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                                    <Loader2 className="animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-4">
                    <div className="card h-100 p-4">
                        <h5 className="fw-800 text-black mb-4">Live Activity</h5>
                        <div className="d-flex flex-column gap-3">
                            {transactions.slice(0, 5).map(t => (
                                <div key={t.id} className="d-flex align-items-center justify-content-between p-2 rounded-3 hover-bg-subtle transition-all">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={`p-2 rounded-circle ${t.type === TransactionType.INCOME ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                                            {t.type === TransactionType.INCOME ? <TrendingUp size={16} className="text-success" /> : <TrendingDown size={16} className="text-danger" />}
                                        </div>
                                        <div>
                                            <p className="fw-700 text-black mb-0 small text-truncate" style={{maxWidth: '150px'}}>{t.description}</p>
                                            <p className="text-muted mb-0" style={{fontSize: '0.7rem'}}>{formatDate(t.date)}</p>
                                        </div>
                                    </div>
                                    <span className={`fw-800 small ${t.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}`}>
                                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setActivePage('Transactions')} className="btn btn-white w-100 border mt-4 fw-bold d-flex align-items-center justify-content-center d-print-none">
                            View All <ArrowRight size={16} className="ms-2" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
