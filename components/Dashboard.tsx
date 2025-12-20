
import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ArrowRight, Plus, Calendar, Filter, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate } from '../lib/utils';
import { Page } from '../App';
import { useData } from '../lib/DataContext';

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

const Dashboard: React.FC<{ setActivePage: (p: Page) => void }> = ({ setActivePage }) => {
    const { transactions } = useData();

    const revenue = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const profit = revenue - expense;

    const chartData = transactions.slice(0, 10).map(t => ({ name: formatDate(t.date), value: t.amount })).reverse();

    return (
        <div className="container-fluid py-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                <div>
                    <h1 className="fw-800 tracking-tight text-black mb-1">Financial Overview</h1>
                    <p className="text-muted mb-0">Your fleet's performance for the current fiscal period.</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-white border px-4 fw-bold shadow-sm d-flex align-items-center"><Download size={18} className="me-2"/> Export</button>
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
                    <div className="card p-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-800 text-black mb-0">Cash Flow Trends</h5>
                            <div className="btn-group border rounded-3 p-1">
                                <button className="btn btn-sm btn-dark rounded-2 px-3">1M</button>
                                <button className="btn btn-sm btn-white border-0 px-3">3M</button>
                                <button className="btn btn-sm btn-white border-0 px-3">1Y</button>
                            </div>
                        </div>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#000" stopOpacity={0.08}/>
                                            <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(v) => `$${v/1000}k`} />
                                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                                    <Area type="monotone" dataKey="value" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
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
                                        <div className={`p-2 rounded-circle ${t.type === 'Income' ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                                            {t.type === 'Income' ? <TrendingUp size={16} className="text-success" /> : <TrendingDown size={16} className="text-danger" />}
                                        </div>
                                        <div>
                                            <p className="fw-700 text-black mb-0 small">{t.description}</p>
                                            <p className="text-muted mb-0" style={{fontSize: '0.7rem'}}>{formatDate(t.date)}</p>
                                        </div>
                                    </div>
                                    <span className={`fw-800 small ${t.type === 'Income' ? 'text-success' : 'text-danger'}`}>
                                        {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setActivePage('Transactions')} className="btn btn-white w-100 border mt-4 fw-bold d-flex align-items-center justify-content-center">
                            View All Activity <ArrowRight size={16} className="ms-2" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
