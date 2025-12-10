
import React from 'react';
import { LayoutDashboard, FileText, BarChart2, Truck, UserCircle, ChevronDown, X, Tags, Landmark, CalendarRange, Wallet } from 'lucide-react';
import { Page } from '../App';

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
  // Helper to format label for display (e.g., "Tax" -> "Tax Reports")
  const formatLabel = (l: string) => {
      if (l === 'Tax') return 'Tax Reports';
      if (l === 'FiscalYears') return 'Fiscal Years';
      if (l === 'Accounts') return 'Bank Accounts';
      return l;
  }
  const displayLabel = formatLabel(label);

  return (
    <li className="nav-item mb-1">
      <a
        href="#"
        className={`nav-link d-flex align-items-center px-3 py-2 rounded-3 ${
          isActive
            ? 'active bg-primary text-white shadow-sm'
            : 'text-secondary hover-bg-light'
        }`}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        style={{ transition: 'all 0.2s' }}
      >
        <Icon className={`me-3 ${isActive ? 'text-white' : 'text-secondary'}`} size={20} />
        <span className="fw-medium">{displayLabel}</span>
      </a>
    </li>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, isOpen, setIsOpen }) => {
  const navItems: Page[] = ['Dashboard', 'Transactions', 'Reports', 'Trucks', 'Categories', 'Accounts', 'Tax', 'FiscalYears'];

  const navIcons: { [key in Page]: React.ElementType } = {
    Dashboard: LayoutDashboard,
    Transactions: FileText,
    Reports: BarChart2,
    Trucks: Truck,
    Categories: Tags,
    Accounts: Wallet,
    Tax: Landmark,
    FiscalYears: CalendarRange,
  };
  
  const handleNavigation = (page: Page) => {
    setActivePage(page);
    setIsOpen(false); 
  };

  // Inline styles for mobile overlay and transition
  const sidebarStyle: React.CSSProperties = {
    width: '280px',
    zIndex: 1040,
    transition: 'transform 0.3s ease-in-out',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100%',
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
  };

  const desktopSidebarStyle: React.CSSProperties = {
     transform: 'none',
     position: 'relative',
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none d-print-none ${
          isOpen ? 'd-block' : 'd-none'
        }`}
        style={{ zIndex: 1030 }}
        onClick={() => setIsOpen(false)}
      ></div>

      <aside
        className="d-flex flex-column flex-shrink-0 bg-white border-end shadow-sm h-100 d-print-none"
        style={window.innerWidth >= 768 ? { ...sidebarStyle, ...desktopSidebarStyle } : sidebarStyle}
      >
        <div className="d-flex flex-column h-100">
          <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-gradient text-white rounded p-2 d-flex align-items-center justify-content-center shadow-sm">
                  <Truck size={24} />
              </div>
              <div className="ms-3 lh-1">
                <h5 className="mb-0 fw-bold text-dark">Trucking<span className="text-primary">.io</span></h5>
                <small className="text-muted" style={{fontSize: '0.75rem', letterSpacing: '1px'}}>FLEET MANAGER</small>
              </div>
            </div>
            <button className="btn btn-link text-secondary d-md-none p-0" onClick={() => setIsOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="flex-grow-1 overflow-auto p-3">
            <ul className="nav nav-pills flex-column">
              {navItems.map((item) => (
                <NavItem
                  key={item}
                  icon={navIcons[item]}
                  label={item}
                  isActive={activePage === item}
                  onClick={() => handleNavigation(item)}
                />
              ))}
            </ul>
          </div>

          <div className="p-3 border-top">
            <div className="d-flex align-items-center p-2 rounded hover-bg-light cursor-pointer">
                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{width: 40, height: 40}}>
                     <UserCircle className="text-secondary" size={24} />
                </div>
                <div className="ms-3 overflow-hidden">
                    <p className="mb-0 fw-bold text-dark text-truncate" style={{fontSize: '0.9rem'}}>Admin User</p>
                    <small className="text-muted text-truncate d-block">admin@trucking.io</small>
                </div>
                <ChevronDown className="ms-auto text-muted" size={16} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
