
import React from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, FileText, Truck, PlusCircle, ArrowRight, Activity, PieChart, ArrowRightLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Page } from '../App';
import { useData } from '../lib/DataContext';

// Bootstrap stylized StatCard
const StatCard: React.FC<{ title: string; amount: string; change: string; icon: React.ElementType; changeType: 'increase' | 'decrease', bgClass: string, textClass: string }> = ({ title, amount, change, icon: Icon, changeType, bgClass, textClass }) => {
    const isIncrease = changeType === 'increase';
    return (
        <div className={`card border-0 shadow-sm ${bgClass} text-white h-100 overflow-hidden position-relative`}>
             <div className="card-body position-relative z-1">
                <div className="d-flex justify-content-between align-items-start mb-4">
                    <div className="bg-white bg-opacity-25 p-2 rounded">
                        <Icon size={24} className="text-white" />
                    </div>
                     <div className="badge bg-white bg-opacity-25 text-white d-flex align-items-center py-2 px-3 rounded-pill">
                        {isIncrease ? <ArrowUp size={14} className="me-1" /> : <ArrowDown size={14} className="me-1" />}
                        <span>{change}</span>
                    </div>
                </div>
                <div>
                    <p className="mb-1 opacity-75 fw-medium">{title}</p>
                    <h2 className="fw-bold mb-0">{amount}</h2>
                </div>
            </div>
             {/* Decorative big icon */}
             <div className="position-absolute" style={{ bottom: '-30px', right: '-20px', opacity: 0.1, transform: 'rotate(15deg)' }}>
                <Icon size={140} />
            </div>
        </div>
    );
};

const QuickAction: React.FC<{ title: string; subtitle: string; icon: React.ElementType; colorClass: string; onClick: () => void }> = ({ title, subtitle, icon: Icon, colorClass, onClick }) => (
    <button onClick={onClick} className="btn btn-white text-start p-4 h-100 w-100 shadow-sm border-0 d-flex align-items-center position-relative overflow-hidden group-hover-action">
        <div className={`rounded-circle p-3 me-3 ${colorClass} bg-opacity-10 text-${colorClass.replace('bg-', '')}`}>
            <Icon size={24} className={`text-${colorClass.replace('bg-', '')}`} />
        </div>
        <div className="flex-grow-1">
            <h6 className="fw-bold mb-1 text-dark">{title}</h6>
            <small className="text-muted">{subtitle}</small>
        </div>
        <div className="bg-light rounded-circle p-2 d-flex justify-content-center align-items-center">
             <ArrowRight size={16} className="text-primary" />
        </div>
    </button>
)

interface DashboardProps {
  setActivePage: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActivePage }) => {
    // Use Context Data
    const { transactions } = useData();

    const totalRevenue = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);
        
    const netIncome = totalRevenue - totalExpenses;
    
    // Prepare data for charts
    const monthlyData = transactions.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!acc[month]) {
            acc[month] = { name: month, Revenue: 0, Expenses: 0 };
        }
        if (t.type === TransactionType.INCOME) {
            acc[month].Revenue += t.amount;
        } else if (t.type === TransactionType.EXPENSE) {
            acc[month].Expenses += t.amount;
        }
        return acc;
    }, {} as { [key: string]: { name: string; Revenue: number; Expenses: number } });

    // Ensure we sort months or handle them (simple reversal might not be enough if data is sparse, but fine for demo)
    const chartData = Object.values(monthlyData).reverse().slice(0, 12).reverse(); 
    const recentTransactions = transactions.slice(0, 5);

    const getIconForType = (type: TransactionType) => {
        if (type === TransactionType.INCOME) return <TrendingUp size={20} />;
        if (type === TransactionType.EXPENSE) return <TrendingDown size={20} />;
        return <ArrowRightLeft size={20} />;
    }

    const getClassForType = (type: TransactionType) => {
        if (type === TransactionType.INCOME) return 'bg-success bg-opacity-10 text-success';
        if (type === TransactionType.EXPENSE) return 'bg-danger bg-opacity-10 text-danger';
        return 'bg-primary bg-opacity-10 text-primary';
    }

    const getTextClassForType = (type: TransactionType) => {
         if (type === TransactionType.INCOME) return 'text-success';
         if (type === TransactionType.EXPENSE) return 'text-danger';
         return 'text-primary';
    }

    return (
        <div className="mb-5">
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Dashboard</h2>
                  <p className="text-muted mb-0 fs-5">Overview of your fleet's financial performance.</p>
                </div>
                <div className="d-inline-flex align-items-center bg-white border px-3 py-2 rounded shadow-sm text-muted small">
                    <Activity size={16} className="text-success me-2" />
                    Last updated: Just now
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                    <StatCard 
                        title="Total Revenue" 
                        amount={formatCurrency(totalRevenue)} 
                        change="+5.2%" 
                        icon={TrendingUp} 
                        changeType="increase" 
                        bgClass="bg-success bg-gradient"
                        textClass="text-success"
                    />
                </div>
                <div className="col-12 col-md-4">
                    <StatCard 
                        title="Total Expenses" 
                        amount={formatCurrency(totalExpenses)} 
                        change="+2.1%" 
                        icon={TrendingDown} 
                        changeType="increase" 
                        bgClass="bg-danger bg-gradient"
                        textClass="text-danger"
                    />
                </div>
                <div className="col-12 col-md-4">
                     <StatCard 
                        title="Net Income" 
                        amount={formatCurrency(netIncome)} 
                        change="+12.5%" 
                        icon={PieChart} 
                        changeType="increase" 
                        bgClass="bg-primary bg-gradient"
                        textClass="text-primary"
                    />
                </div>
            </div>
            
            <div className="row g-4 mb-4">
                 <div className="col-12 col-md-4">
                    <QuickAction 
                        title="New Transaction" 
                        subtitle="Record income or expense" 
                        icon={PlusCircle} 
                        colorClass="bg-primary" 
                        onClick={() => setActivePage('Transactions')} 
                    />
                 </div>
                 <div className="col-12 col-md-4">
                    <QuickAction 
                        title="Financial Reports" 
                        subtitle="View P&L and Balance Sheet" 
                        icon={FileText} 
                        colorClass="bg-info" 
                        onClick={() => setActivePage('Reports')} 
                    />
                 </div>
                 <div className="col-12 col-md-4">
                    <QuickAction 
                        title="Fleet Management" 
                        subtitle="Track vehicle performance" 
                        icon={Truck} 
                        colorClass="bg-warning" 
                        onClick={() => setActivePage('Trucks')} 
                    />
                 </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    <Card className="h-100">
                        <CardHeader>
                            <CardTitle>Revenue vs Expenses</CardTitle>
                            <div className="d-flex gap-3">
                                 <span className="d-flex align-items-center small text-muted"><span className="d-inline-block rounded-circle bg-primary me-2" style={{width: 8, height: 8}}></span>Revenue</span>
                                 <span className="d-flex align-items-center small text-muted"><span className="d-inline-block rounded-circle bg-danger me-2" style={{width: 8, height: 8}}></span>Expenses</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef"/>
                                    <XAxis dataKey="name" tick={{ fill: '#6c757d', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000}k`} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: '#f8f9fa'}}
                                        formatter={(value) => formatCurrency(value as number)} 
                                        contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)' }} 
                                    />
                                    <Bar dataKey="Revenue" fill="#0d6efd" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="Expenses" fill="#dc3545" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="col-lg-4">
                    <Card className="h-100">
                        <CardHeader>
                           <CardTitle>Recent Activity</CardTitle>
                           <button onClick={() => setActivePage('Transactions')} className="btn btn-link btn-sm text-decoration-none fw-bold p-0">View All</button>
                        </CardHeader>
                        <CardContent className="overflow-auto p-0">
                          <ul className="list-group list-group-flush">
                            {recentTransactions.map((t: Transaction) => (
                               <li key={t.id} className="list-group-item list-group-item-action d-flex align-items-center p-3 border-bottom-0">
                                <div className={`rounded-circle p-2 me-3 ${getClassForType(t.type)}`}>
                                    {getIconForType(t.type)}
                                </div>
                                <div className="flex-grow-1 overflow-hidden">
                                    <p className="mb-0 fw-bold text-dark text-truncate small">{t.description}</p>
                                    <small className="text-muted text-truncate">
                                        {t.truck ? t.truck.unitNumber : 'General'} &bull; {formatDate(t.date)}
                                    </small>
                                </div>
                                <div className={`fw-bold small ${getTextClassForType(t.type)}`}>
                                    {t.type === TransactionType.INCOME ? '+' : t.type === TransactionType.EXPENSE ? '-' : ''}
                                    {formatCurrency(t.amount)}
                                </div>
                               </li>
                            ))}
                          </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
