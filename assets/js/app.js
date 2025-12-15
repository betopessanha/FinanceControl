import { createClient } from "@supabase/supabase-js";

// Initialize Supabase from global config injected by PHP
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// State Management Simple Object
export const store = {
    categories: [],
    accounts: [],
    transactions: []
};

// Utils
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export const formatDate = (isoString) => {
    if(!isoString) return '';
    const date = new Date(isoString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Global Init
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    // --- PWA Registration ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.log('SW Error:', err));
    }

    // --- Mobile Menu Logic ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('sidebar-close-btn'); // You need to add this ID to the X button in sidebar.php if it exists, or just rely on overlay
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('show');
            overlay.classList.add('show');
        });
    }

    if(overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }
    
    // Close sidebar on link click (mobile)
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', () => {
             if(window.innerWidth < 768) {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
             }
        });
    });


    // Check Auth for protected pages
    if (CURRENT_PAGE !== 'login') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Check for mock session
            if(!localStorage.getItem('active_mock_user')) {
                window.location.href = 'index.php?page=login';
                return;
            }
        }
        
        // Show App
        document.getElementById('global-loader').style.display = 'none';
        
        // Setup Logout
        const btnLogout = document.getElementById('btn-logout');
        if(btnLogout) {
            btnLogout.addEventListener('click', async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('active_mock_user');
                window.location.reload();
            });
        }
    } else {
        document.getElementById('global-loader').style.display = 'none';
        
        // Login Logic
        const form = document.getElementById('loginForm');
        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const btn = document.getElementById('btn-login');
                const errBox = document.getElementById('login-error');
                
                btn.disabled = true;
                btn.innerText = 'Signing in...';
                errBox.classList.add('d-none');

                // Mock check
                if(email === 'admin@trucking.io' && password === 'admin') {
                    localStorage.setItem('active_mock_user', JSON.stringify({email}));
                    window.location.href = 'index.php';
                    return;
                }

                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                
                if (error) {
                    errBox.innerText = error.message;
                    errBox.classList.remove('d-none');
                    btn.disabled = false;
                    btn.innerText = 'Sign In';
                } else {
                    window.location.href = 'index.php';
                }
            });
        }
    }
});