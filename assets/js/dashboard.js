import { supabase, formatCurrency } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: transactions } = await supabase.from('transactions').select('*');
    
    if(!transactions) return;

    // Calculate Totals
    const revenue = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const net = revenue - expense;

    document.getElementById('dash-revenue').innerText = formatCurrency(revenue);
    document.getElementById('dash-expense').innerText = formatCurrency(expense);
    document.getElementById('dash-net').innerText = formatCurrency(net);

    // Recent Activity
    const recentList = document.getElementById('recent-transactions-list');
    recentList.innerHTML = '';
    transactions.slice(0, 5).forEach(t => {
        const isInc = t.type === 'Income';
        recentList.innerHTML += `
            <li class="list-group-item d-flex align-items-center justify-content-between p-3">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle p-2 me-3 ${isInc ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}">
                        <i data-lucide="${isInc ? 'trending-up' : 'trending-down'}" size="16"></i>
                    </div>
                    <div>
                        <p class="mb-0 fw-bold small">${t.description}</p>
                        <small class="text-muted">${t.date.split('T')[0]}</small>
                    </div>
                </div>
                <span class="fw-bold ${isInc ? 'text-success' : 'text-danger'}">${isInc ? '+' : '-'} ${formatCurrency(t.amount)}</span>
            </li>
        `;
    });
    lucide.createIcons();

    // Chart.js
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    // Process data for chart (Last 6 months)
    const months = {};
    transactions.forEach(t => {
        const m = t.date.substring(0, 7); // YYYY-MM
        if (!months[m]) months[m] = { inc: 0, exp: 0 };
        if (t.type === 'Income') months[m].inc += t.amount;
        else months[m].exp += t.amount;
    });

    const labels = Object.keys(months).sort().slice(-6);
    const incData = labels.map(m => months[m].inc);
    const expData = labels.map(m => months[m].exp);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Revenue', data: incData, backgroundColor: '#198754', borderRadius: 4 },
                { label: 'Expenses', data: expData, backgroundColor: '#dc3545', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
});
