
import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';

interface HeaderProps {
  title: string;
  icon: React.ElementType;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, icon: Icon, onMenuClick }) => {
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
          <div className="d-none d-sm-flex align-items-center text-dark">
              <h1 className="h4 mb-0 fw-bold">{title}</h1>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          {/* Search Bar - visible on larger screens */}
          <div className="d-none d-md-block position-relative">
              <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
                  <Search size={16} />
              </span>
              <input 
                  type="text" 
                  placeholder="Search..." 
                  className="form-control rounded-pill ps-5 bg-light border-0"
                  style={{ width: '250px' }}
              />
          </div>

          <div className="vr d-none d-sm-block text-secondary opacity-25 mx-2"></div>

          <button className="btn btn-light rounded-circle position-relative p-2 text-secondary">
            <Bell size={20} />
            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
              <span className="visually-hidden">New alerts</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
