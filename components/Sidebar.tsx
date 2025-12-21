
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, BarChart2, Truck, UserCircle, X, Tags, Landmark, CalendarRange, Wallet, LogOut, Settings, Building2, ChevronRight, Zap, Users } from 'lucide-react';
import { Page } from '../App';
import { useAuth } from '../lib/AuthContext';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  icon: React.ElementType;
  label: Page;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, isActive, onClick }) => {
  const displayLabels: Partial<Record<Page, string>> = {
    FiscalYears: 'Periods',
    Tax: 'Tax Hub',
    Users: 'Team Members'
  };
  
  const displayLabel = displayLabels[label] || label;

  return (
    <li className="nav-item">
      <a
        href="#"
        className={`nav-link ${isActive ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        <Icon className="me-3" size={18} />
        <span className="flex-grow-1">{displayLabel}</span>
        {isActive && <div className="rounded-circle bg-white opacity-25" style={{width: 6, height: 6}}></div>}
      </a>
    </li>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, isOpen, setIsOpen }) => {
  const { user, signOut } = useAuth();
  
  const handleNavigation = (page: Page) => {
    setActivePage(page);
    setIsOpen(false); 
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {isMobile && isOpen && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-40" style={{ zIndex: 1040 }} onClick={() => setIsOpen(false)}></div>
      )}

      <aside className={`sidebar shadow-sm d-flex flex-column h-100 d-print-none ${isMobile ? (isOpen ? 'position-fixed start-0 top-0' : 'position-fixed start-n100 top-0') : ''}`} style={{ zIndex: 1050, transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', left: isMobile && !isOpen ? '-260px' : '0' }}>
        <div className="p-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-black text-white p-2 rounded-3 d-flex align-items-center justify-content-center shadow-lg">
                <Zap size={20} fill="white" />
            </div>
            <h5 className="mb-0 fw-800 tracking-tight text-black">TRUCKING<span className="text-muted">.IO</span></h5>
          </div>
          {isMobile && <button className="btn btn-link text-dark p-0" onClick={() => setIsOpen(false)}><X size={20} /></button>}
        </div>

        <div className="flex-grow-1 overflow-auto py-2">
            <div className="px-4 mb-3"><small className="text-uppercase fw-800 text-muted" style={{fontSize: '0.65rem', letterSpacing: '0.1em'}}>Insights</small></div>
            <ul className="nav flex-column mb-4">
              {['Dashboard', 'Transactions', 'Reports'].map((item) => (
                <NavItem key={item} icon={item === 'Dashboard' ? LayoutDashboard : item === 'Transactions' ? FileText : BarChart2} label={item as Page} isActive={activePage === item} onClick={() => handleNavigation(item as Page)} />
              ))}
            </ul>

            <div className="px-4 mb-3"><small className="text-uppercase fw-800 text-muted" style={{fontSize: '0.65rem', letterSpacing: '0.1em'}}>Fleet Operations</small></div>
            <ul className="nav flex-column mb-4">
              {['Trucks', 'Accounts', 'Companies'].map((item) => (
                <NavItem key={item} icon={item === 'Trucks' ? Truck : item === 'Accounts' ? Wallet : Building2} label={item as Page} isActive={activePage === item} onClick={() => handleNavigation(item as Page)} />
              ))}
            </ul>

            <div className="px-4 mb-3"><small className="text-uppercase fw-800 text-muted" style={{fontSize: '0.65rem', letterSpacing: '0.1em'}}>System</small></div>
            <ul className="nav flex-column">
              {['Tax', 'FiscalYears', 'Users'].map((item) => (
                <NavItem key={item} icon={item === 'Tax' ? Landmark : item === 'FiscalYears' ? CalendarRange : Users} label={item as Page} isActive={activePage === item} onClick={() => handleNavigation(item as Page)} />
              ))}
            </ul>
        </div>

        <div className="p-4 mt-auto">
            <div className="bg-subtle p-3 rounded-4 border">
                <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="bg-black rounded-circle p-1" style={{cursor: 'pointer'}} onClick={() => handleNavigation('Profile')}><UserCircle className="text-white" size={24} /></div>
                    <div className="overflow-hidden">
                        <p className="fw-700 text-black mb-0 text-truncate small">{user?.email?.split('@')[0]}</p>
                        <p className="text-muted mb-0 small" style={{fontSize: '0.7rem'}}>Administrator</p>
                    </div>
                </div>
                <button onClick={() => signOut()} className="btn btn-sm btn-white w-100 border fw-bold text-danger d-flex align-items-center justify-content-center">
                    <LogOut size={14} className="me-2" /> Log Out
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
