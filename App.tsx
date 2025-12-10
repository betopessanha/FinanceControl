
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Categories from './components/Categories';
import TaxReports from './components/TaxReports';
import FiscalYears from './components/FiscalYears';
import BankAccounts from './components/BankAccounts';
import Header from './components/Header';
import { Truck, FileText, LayoutDashboard, BarChart2, Tags, Landmark, CalendarRange, Wallet } from 'lucide-react';
import Trucks from './components/Trucks';
import { DataProvider } from './lib/DataContext';

export type Page = 'Dashboard' | 'Transactions' | 'Reports' | 'Trucks' | 'Categories' | 'Tax' | 'FiscalYears' | 'Accounts';

const MainContent: React.FC = () => {
    const [activePage, setActivePage] = useState<Page>('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const renderPage = () => {
        switch (activePage) {
        case 'Dashboard':
            return <Dashboard setActivePage={setActivePage} />;
        case 'Transactions':
            return <Transactions />;
        case 'Reports':
            return <Reports />;
        case 'Trucks':
            return <Trucks />;
        case 'Categories':
            return <Categories />;
        case 'Accounts':
            return <BankAccounts />;
        case 'Tax':
            return <TaxReports setActivePage={setActivePage} />;
        case 'FiscalYears':
            return <FiscalYears />;
        default:
            return <Dashboard setActivePage={setActivePage} />;
        }
    };

    const pageIcons: { [key in Page]: React.ElementType } = {
        Dashboard: LayoutDashboard,
        Transactions: FileText,
        Reports: BarChart2,
        Trucks: Truck,
        Categories: Tags,
        Tax: Landmark,
        FiscalYears: CalendarRange,
        Accounts: Wallet,
    };

    return (
        <div className="d-flex vh-100 overflow-hidden">
        <Sidebar 
            activePage={activePage} 
            setActivePage={setActivePage}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
        />
        <div className="flex-grow-1 d-flex flex-column h-100 overflow-hidden position-relative">
            <Header 
            title={activePage} 
            icon={pageIcons[activePage]}
            onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main className="flex-grow-1 overflow-auto bg-light p-3 p-md-4">
            <div className="container-fluid p-0">
                {renderPage()}
            </div>
            </main>
        </div>
        </div>
    );
}

const App: React.FC = () => {
  return (
    <DataProvider>
        <MainContent />
    </DataProvider>
  );
};

export default App;
