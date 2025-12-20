
import React from 'react';
import { Menu, Search, Cloud, CloudOff, UserCircle, Bell, Settings } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { useAuth } from '../lib/AuthContext';

interface HeaderProps {
  title: string;
  icon: React.ElementType;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, icon: Icon, onMenuClick }) => {
  const { isCloudConnected } = useData();
  const { user } = useAuth();

  return (
    <header className="navbar sticky-top glass-header py-3 px-4 d-print-none shadow-sm">
      <div className="d-flex align-items-center w-100 justify-content-between">
        <div className="d-flex align-items-center gap-4">
          <button className="btn btn-white border-0 d-md-none" onClick={onMenuClick}><Menu size={20} /></button>
          
          <div className="d-none d-lg-flex align-items-center position-relative">
              <Search size={16} className="position-absolute ms-3 text-muted" />
              <input type="text" className="form-control border-0 bg-subtle ps-5 rounded-pill" placeholder="Jump to data..." style={{ width: '280px', fontSize: '0.85rem' }} />
          </div>

          <div className="vr d-none d-lg-block mx-2 text-muted opacity-25" style={{ height: 24 }}></div>
          
          <div className="d-flex align-items-center gap-2">
             <Icon size={18} className="text-black" />
             <h2 className="h6 fw-800 text-black mb-0 tracking-tight">{title}</h2>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-none d-md-flex align-items-center gap-3 me-3">
            {isCloudConnected ? (
                <div className="badge rounded-pill bg-success bg-opacity-10 text-success border-0 px-3 py-2 d-flex align-items-center gap-2">
                    <div className="bg-success rounded-circle" style={{width: 6, height: 6}}></div>
                    <span className="fw-800" style={{fontSize: '0.65rem', letterSpacing: '0.05em'}}>SYNCHRONIZED</span>
                </div>
            ) : (
                <div className="badge rounded-pill bg-warning bg-opacity-10 text-warning border-0 px-3 py-2 d-flex align-items-center gap-2">
                    <CloudOff size={12} />
                    <span className="fw-800" style={{fontSize: '0.65rem', letterSpacing: '0.05em'}}>LOCAL ENGINE</span>
                </div>
            )}
          </div>

          <button className="btn btn-white border-0 position-relative p-2"><Bell size={20} /><span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-white rounded-circle"></span></button>
          <button className="btn btn-white border-0 p-2"><Settings size={20} /></button>
          
          <div className="bg-black rounded-circle p-1 ms-2 shadow-sm d-flex align-items-center justify-content-center" style={{ width: 34, height: 34 }}>
              <UserCircle size={24} className="text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
