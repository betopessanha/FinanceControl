
import React from 'react';
import { Bell, Menu, Search, Cloud, CloudOff, UserCircle, ShieldCheck } from 'lucide-react';
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
    <header className="navbar sticky-top bg-white border-bottom py-3 px-3 px-md-4 shadow-sm d-print-none">
      <div className="d-flex align-items-center w-100 justify-content-between">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-light d-md-none me-3" 
            onClick={onMenuClick}
            aria-label="Toggle navigation"
          >
              <Menu size={24} />
          </button>
          <div className="d-flex align-items-center text-dark">
              <div className="bg-light p-2 rounded-circle me-3 d-none d-sm-flex">
                 <Icon size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="h5 mb-0 fw-bold">{title}</h1>
                <div className="d-lg-none mt-1">
                     {isCloudConnected ? (
                        <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-10 py-1 px-2 d-flex align-items-center" style={{fontSize: '0.6rem'}}>
                            <Cloud size={10} className="me-1" /> LIVE
                        </span>
                    ) : (
                        <span className="badge rounded-pill bg-warning bg-opacity-10 text-warning border border-warning border-opacity-10 py-1 px-2 d-flex align-items-center" style={{fontSize: '0.6rem'}}>
                            <CloudOff size={10} className="me-1" /> LOCAL
                        </span>
                    )}
                </div>
              </div>
              <div className="ms-4 d-none d-lg-block">
                {isCloudConnected ? (
                    <div className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-2 px-3 d-flex align-items-center">
                        <Cloud size={14} className="me-2" />
                        <span className="fw-bold" style={{fontSize: '0.7rem'}}>LIVE (DB CONNECTED)</span>
                    </div>
                ) : (
                    <div className="badge rounded-pill bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 py-2 px-3 d-flex align-items-center">
                        <CloudOff size={14} className="me-2" />
                        <span className="fw-bold" style={{fontSize: '0.7rem'}}>LOCAL STORAGE (OFFLINE)</span>
                    </div>
                )}
              </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-none d-lg-flex align-items-center me-2 pe-3 border-end">
              <div className="text-end me-3">
                  <div className="fw-bold small text-dark">{user?.email?.split('@')[0]}</div>
                  <div className="text-muted small d-flex align-items-center justify-content-end" style={{fontSize: '0.65rem'}}>
                      <ShieldCheck size={10} className="me-1 text-success" /> Secure Session
                  </div>
              </div>
              <div className="bg-light rounded-circle p-1 border shadow-sm">
                  <UserCircle size={28} className="text-primary" />
              </div>
          </div>
          
          <button className="btn btn-light rounded-circle p-2 position-relative shadow-sm border d-none d-sm-block">
            <Bell size={20} className="text-secondary" />
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{fontSize: '0.5rem', padding: '0.35em 0.5em'}}>
              3
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
