
import React from 'react';
import { Menu, Search, CloudOff, Bell, Settings as SettingsIcon, Brain, UserCircle, AlertCircle } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { useAuth } from '../lib/AuthContext';
import { Page } from '../App';

interface HeaderProps {
  title: string;
  icon: React.ElementType;
  onMenuClick: () => void;
  setActivePage: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ title, icon: Icon, onMenuClick, setActivePage }) => {
  const { isCloudConnected } = useData();
  const { user } = useAuth();
  
  // Check if Gemini API Key is present in the environment
  const isAIConfigured = !!(process.env.API_KEY || (window as any).process?.env?.API_KEY);

  return (
    <header className="navbar sticky-top glass-header py-2 py-md-3 px-3 px-md-4 d-print-none shadow-sm">
      <div className="d-flex align-items-center w-100 justify-content-between">
        <div className="d-flex align-items-center gap-2 gap-md-4">
          <button className="btn btn-white border-0 d-md-none p-1" onClick={onMenuClick}><Menu size={22} /></button>
          
          <div className="d-none d-lg-flex align-items-center position-relative">
              <Search size={16} className="position-absolute ms-3 text-muted" />
              <input type="text" className="form-control border-0 bg-subtle ps-5 rounded-pill" placeholder="Jump to data..." style={{ width: '280px', fontSize: '0.85rem' }} />
          </div>

          <div className="vr d-none d-lg-block mx-2 text-muted opacity-25" style={{ height: 24 }}></div>
          
          <div className="d-flex align-items-center gap-2">
             <Icon size={18} className="text-black d-none d-sm-block" />
             <h2 className="h6 fw-800 text-black mb-0 tracking-tight">{title}</h2>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 gap-md-3">
          <div className="d-none d-md-flex align-items-center gap-2 me-2">
            {/* AI Status Indicator */}
            <div 
              className={`badge rounded-pill border-0 px-3 py-2 d-flex align-items-center gap-2 ${isAIConfigured ? 'bg-primary bg-opacity-10 text-primary' : 'bg-danger bg-opacity-10 text-danger'}`}
              title={isAIConfigured ? "AI Engine: Ready" : "AI Engine: Key Missing"}
            >
              <Brain size={14} className={isAIConfigured ? "animate-pulse" : ""} />
              <span className="fw-800" style={{fontSize: '0.65rem', letterSpacing: '0.05em'}}>
                {isAIConfigured ? 'AI ACTIVE' : 'AI OFFLINE'}
              </span>
            </div>

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
          <button 
            className={`btn btn-white border-0 p-2 ${title === 'Settings' ? 'text-primary bg-subtle' : ''}`}
            onClick={() => setActivePage('Settings')}
            title="System Settings"
          >
            <SettingsIcon size={20} />
          </button>
          
          <button 
            className={`btn p-1 ms-1 ms-md-2 shadow-sm d-flex align-items-center justify-content-center rounded-circle border-0 ${title === 'Profile' ? 'bg-primary' : 'bg-black'}`} 
            style={{ width: 34, height: 34, transition: 'all 0.2s ease' }}
            onClick={() => setActivePage('Profile')}
            title="My Profile"
          >
              <UserCircle size={24} className="text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
