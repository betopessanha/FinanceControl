
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Categories from './components/Categories';
import TaxReports from './components/TaxReports';
import FiscalYears from './components/FiscalYears';
import BankAccounts from './components/BankAccounts';
import Companies from './components/Companies';
import Settings from './components/Settings';
import Profile from './components/Profile';
import UserManagement from './components/UserManagement';
import Header from './components/Header';
import Login from './components/Login';
import { Truck, FileText, LayoutDashboard, BarChart2, Tags, Landmark, CalendarRange, Wallet, Loader2, Settings as SettingsIcon, Building2, User, Users } from 'lucide-react';
import Trucks from './components/Trucks';
import { DataProvider } from './lib/DataContext';
import { AuthProvider, useAuth } from './lib/AuthContext';

export type Page = 'Dashboard' | 'Transactions' | 'Reports' | 'Trucks' | 'Categories' | 'Tax' | 'FiscalYears' | 'Accounts' | 'Companies' | 'Settings' | 'Profile' | 'Users';

const MainLayout: React.FC = () => {
    const [activePage, setActivePage] = useState<Page>('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
                <Loader2 size={40} className="text-primary animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

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
        case 'Companies':
            return <Companies />;
        case 'Tax':
            return <TaxReports setActivePage={setActivePage} />;
        case 'FiscalYears':
            return <FiscalYears />;
        case 'Settings':
            return <Settings />;
        case 'Profile':
            return <Profile />;
        case 'Users':
            return <UserManagement />;
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
        Companies: Building2,
        Settings: SettingsIcon,
        Profile: User,
        Users: Users,
    };

    return (
        <DataProvider>
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
                        setActivePage={setActivePage}
                    />
                    <main className="flex-grow-1 overflow-auto bg-light p-3 p-md-4">
                        <div className="container-fluid p-0">
                            {renderPage()}
                        </div>
                    </main>
                </div>
            </div>
        </DataProvider>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <MainLayout />
    </AuthProvider>
  );
};

export default App;
