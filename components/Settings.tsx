
import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import { Clock, Save, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

const Settings: React.FC = () => {
    const { signOut } = useAuth();
    
    // Config State
    const [timeoutMinutes, setTimeoutMinutes] = useState('15');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load current settings from Local Storage
        const storedTimeout = localStorage.getItem('custom_session_timeout');
        if (storedTimeout) setTimeoutMinutes(storedTimeout);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Save Timeout
        if (timeoutMinutes) {
            localStorage.setItem('custom_session_timeout', timeoutMinutes);
        }

        // Show success
        setSaved(true);
        
        // Perform logout sequence
        setTimeout(async () => {
            // 1. Clear local mock persistence immediately
            localStorage.removeItem('active_mock_user');

            // 2. Attempt explicit sign out via context
            await signOut();

            // 3. Force hard reload to ensure app re-initializes with new settings (like timeout)
            // and ensures we are back at login screen cleanly.
            window.location.reload();
        }, 500);
    };

    return (
        <div className="mb-5" style={{ maxWidth: '800px' }}>
            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                  <h2 className="fw-bold text-dark mb-1">Settings</h2>
                  <p className="text-muted mb-0">System configuration and preferences.</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                {/* Application Settings */}
                <Card className="mb-4">
                    <CardHeader>
                        <div className="d-flex align-items-center">
                            <Clock className="me-2 text-primary" size={20} />
                            <CardTitle>Application Settings</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3">
                            <label className="form-label fw-bold small text-muted">Session Timeout (Minutes)</label>
                            <div className="input-group" style={{ maxWidth: '300px' }}>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    value={timeoutMinutes}
                                    onChange={(e) => setTimeoutMinutes(e.target.value)}
                                    min="1"
                                    max="1440" // 24 hours
                                    required
                                />
                                <span className="input-group-text bg-light text-muted">minutes</span>
                            </div>
                            <div className="form-text text-muted">
                                Users will be automatically logged out after this period of inactivity.
                                <br />
                                <span className="text-warning d-flex align-items-center mt-1">
                                    <LogOut size={12} className="me-1" />
                                    <strong>Note:</strong> Saving this setting will sign you out.
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="d-flex align-items-center gap-3">
                    <button type="submit" className="btn btn-primary d-flex align-items-center px-4">
                        <Save size={18} className="me-2" />
                        Save & Sign Out
                    </button>
                    {saved && (
                        <span className="text-success d-flex align-items-center small fw-bold">
                            <CheckCircle2 size={18} className="me-1" /> Saved! Signing out...
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Settings;
