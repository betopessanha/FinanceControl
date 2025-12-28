
import React from 'react';
import { LayoutDashboard, FileText, BarChart2, Truck, UserCircle, X, Tags, Landmark, CalendarRange, Wallet, LogOut, Settings as SettingsIcon, Building2, Zap, Users, Map, ChevronDown, User, Briefcase } from 'lucide-react';
import { Page } from '../App';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { EntityType } from '../types';

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
    FiscalYears: 'Fiscal Periods',
    Tax: 'Tax Center',
    Users: 'Team Members',
    Settings: 'Settings',
    Loads: 'Logistics',
    Categories: 'Chart of Accounts'
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
      </a>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, isOpen, setIsOpen }) => {
  const { signOut } = useAuth();
  const { businessEntities, activeEntityId, setActiveEntityId } = useData();
  
  const handleNavigation = (page: Page) => {
    setActivePage(page);
    setIsOpen(false); 
  };

  const activeEntity = businessEntities.find(e => e.id === activeEntityId) || businessEntities[0];

  // Helper to switch quickly between types
  const handleTypeSwitch = (type: EntityType) => {
    const target = businessEntities.find(e => e.type === type);
    if (target) setActiveEntityId(target.id);
  };

  return (
    <>
      {isOpen && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-40" style={{ zIndex: 1040, backdropFilter: 'blur(4px)' }} onClick={() => setIsOpen(false)}></div>
      )}

      <aside className={`sidebar shadow-lg d-flex flex-column h-100 d-print-none ${isOpen ? 'show' : ''}`} style={{ zIndex: 2050 }}>
        <div className="p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="bg-black text-white p-2 rounded-3 shadow-lg">
                <Zap size={20} fill="white" />
            </div>
            <h5 className="mb-0 fw-800 tracking-tight text-black">FLEET<span className="text-muted">LEDGER</span></h5>
          </div>

          {/* Quick Context Switcher Buttons */}
          <div className="d-flex gap-2 p-1 bg-light rounded-4 border mb-4 shadow-sm">
            <button 
              onClick={() => handleTypeSwitch(EntityType.BUSINESS)}
              className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 transition-all ${activeEntity?.type === EntityType.BUSINESS ? 'btn-black shadow text-white' : 'btn-link text-muted text-decoration-none fw-bold'}`}
            >
              <Briefcase size={14} /> <span style={{fontSize: '0.75rem'}}>BUSINESS</span>
            </button>
            <button 
              onClick={() => handleTypeSwitch(EntityType.PERSONAL)}
              className={`btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 transition-all ${activeEntity?.type === EntityType.PERSONAL ? 'btn-primary shadow text-white' : 'btn-link text-muted text-decoration-none fw-bold'}`}
            >
              <User size={14} /> <span style={{fontSize: '0.75rem'}}>PERSONAL</span>
            </button>
          </div>

          {/* Entity Selector Dropdown (Sub-selection if multiple companies) */}
          <div className="dropdown w-100 mb-2">
            <button className="btn btn-white border w-100 d-flex align-items-center justify-content-between p-2 rounded-3 shadow-sm border-0 bg-subtle" type="button" data-bs-toggle="dropdown">
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                <div className="text-start overflow-hidden">
                  <div className="fw-800 small text-truncate" style={{maxWidth: '150px'}}>{activeEntity?.name}</div>
                  <div className="text-muted" style={{fontSize: '0.6rem'}}>{activeEntity?.taxForm}</div>
                </div>
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>
            <ul className="dropdown-menu shadow-lg border-0 p-2 w-100">
              {businessEntities.map(ent => (
                <li key={ent.id}>
                  <button className={`dropdown-item rounded-2 d-flex align-items-center gap-2 py-2 ${ent.id === activeEntityId ? 'bg-light fw-bold' : ''}`} onClick={() => setActiveEntityId(ent.id)}>
                    {ent.type === EntityType.BUSINESS ? <Briefcase size={14} className="text-dark"/> : <User size={14} className="text-primary"/>}
                    <span className="small">{ent.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-grow-1 overflow-auto py-2">
            <div className="px-4 mb-2"><small className="text-uppercase fw-800 text-muted" style={{fontSize: '0.6rem', letterSpacing: '0.1em'}}>Core Reporting</small></div>
            <ul className="nav flex-column mb-4">
              {['Dashboard', 'Transactions', 'Reports', 'Tax', 'FiscalYears'].map((item) => (
                <NavItem 
                  key={item} 
                  icon={
                    item === 'Dashboard' ? LayoutDashboard : 
                    item === 'Transactions' ? FileText : 
                    item === 'Reports' ? BarChart2 : 
                    item === 'Tax' ? Landmark : 
                    CalendarRange
                  } 
                  label={item as Page} 
                  isActive={activePage === item} 
                  onClick={() => handleNavigation(item as Page)} 
                />
              ))}
            </ul>

            <div className="px-4 mb-2"><small className="text-uppercase fw-800 text-muted" style={{fontSize: '0.6rem', letterSpacing: '0.1em'}}>Operational Assets</small></div>
            <ul className="nav flex-column mb-4">
              {['Loads', 'Trucks', 'Accounts', 'Companies', 'Categories'].map((item) => (
                <NavItem 
                  key={item} 
                  icon={
                    item === 'Loads' ? Map : 
                    item === 'Trucks' ? Truck : 
                    item === 'Accounts' ? Wallet : 
                    item === 'Companies' ? Building2 : 
                    Tags
                  } 
                  label={item as Page} 
                  isActive={activePage === item} 
                  onClick={() => handleNavigation(item as Page)} 
                />
              ))}
            </ul>
        </div>

        <div className="p-4 mt-auto">
            <button onClick={() => signOut()} className="btn btn-sm btn-white w-100 border fw-bold text-danger py-2 rounded-3 d-flex align-items-center justify-content-center gap-2">
                <LogOut size={14} /> Log Out
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
