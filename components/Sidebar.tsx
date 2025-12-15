import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, BarChart2, Truck, UserCircle, ChevronDown, X, Tags, Landmark, CalendarRange, Wallet, LogOut, Settings } from 'lucide-react';
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
  const { user, signOut } = useAuth();
  
  const navItems: Page[] = ['Dashboard', 'Transactions', 'Reports', 'Trucks', 'Categories', 'Accounts', 'Tax', 'FiscalYears', 'Settings'];

  const navIcons: { [key in Page]: React.ElementType } = {
    Dashboard: LayoutDashboard,
    Transactions: FileText,
    Reports: BarChart2,
    Trucks: Truck,
    Categories: Tags,
    Accounts: Wallet,
    Tax: Landmark,
    FiscalYears: CalendarRange,
    Settings: Settings,
  };
  
  const handleNavigation = (page: Page) => {
    setActivePage(page);
    setIsOpen(false); 
  };

  // State to track if we are in mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // If switching to desktop, ensure sidebar is 'open' conceptually (visible)
      // but managed by CSS flow, so we don't need to force isOpen true, 
      // just ensure the mobile toggle state doesn't interfere weirdly.
      if (!mobile && isOpen) {
          setIsOpen(false); // Reset mobile toggle when going to desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, setIsOpen]);

  // Determine styles based on state
  const sidebarStyle: React.CSSProperties = isMobile 
    ? {
        width: '280px',
        zIndex: 1040,
        transition: 'transform 0.3s ease-in-out',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }
    : {
        width: '280px',
        position: 'relative',
        transform: 'none',
        height: '100%',
    };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
          <div
            className={`position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-print-none`}
            style={{ 
                zIndex: 1030,
                opacity: isOpen ? 1 : 0,
                visibility: isOpen ? 'visible' : 'hidden',
                transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out'
            }}
            onClick={() => setIsOpen(false)}
          ></div>
      )}

      <aside
        className="d-flex flex-column flex-shrink-0 bg-white border-end shadow-sm h-100 d-print-none"
        style={sidebarStyle}
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
            {/* Close button only visible on mobile */}
            {isMobile && (
                <button className="btn btn-link text-secondary p-0" onClick={() => setIsOpen(false)}>
                <X size={24} />
                </button>
            )}
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
            <div className="d-flex align-items-center justify-content-between p-2 rounded bg-light">
                <div className="d-flex align-items-center overflow-hidden">
                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center border" style={{width: 32, height: 32}}>
                        <UserCircle className="text-secondary" size={20} />
                    </div>
                    <div className="ms-2 overflow-hidden">
                        <small className="text-muted text-truncate d-block" style={{fontSize: '0.75rem', maxWidth: '140px'}}>
                            {user?.email || 'User'}
                        </small>
                    </div>
                </div>
                <button 
                    onClick={() => signOut()} 
                    className="btn btn-sm btn-link text-danger p-0"
                    title="Sign Out"
                >
                    <LogOut size={18} />
                </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;