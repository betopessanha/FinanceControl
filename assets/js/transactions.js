
import { supabase, formatCurrency, formatDate, store } from './app.js';
import { GoogleGenAI, Type } from "@google/genai";

let transactionModal;
let importModal;
let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
    importModal = new bootstrap.Modal(document.getElementById('importModal'));
    
    fetchData();
    setupEventListeners();
});

async function fetchData() {
    // Fetch Categories, Accounts, Transactions in parallel
    const [catRes, accRes, transRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('transactions').select('*, categories:category_id(name), accounts:account_id(name)').order('date', { ascending: false })
    ]);

    store.categories = catRes.data || [];
    store.accounts = accRes.data || [];
    allTransactions = transRes.data || [];

    populateSelects();
    renderTable(allTransactions);
}

function populateSelects() {
    const catSelect = document.getElementById('transCategory');
    const accSelect = document.getElementById('transAccount');
    const impAccSelect = document.getElementById('importAccount');

    catSelect.innerHTML = '<option value="">Select Category...</option>';
    store.categories.forEach(c => {
        catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    const accOptions = store.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    accSelect.innerHTML += accOptions;
    impAccSelect.innerHTML = accOptions;
}

function renderTable(data) {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No transactions found.</td></tr>`;
        return;
    }

    data.forEach(t => {
        const catName = t.categories ? t.categories.name : 'Uncategorized';
        const accName = t.accounts ? t.accounts.name : 'Unknown';
        const isIncome = t.type === 'Income';
        const amountClass = isIncome ? 'text-success' : 'text-danger';
        const icon = isIncome ? 'arrow-up-circle' : 'arrow-down-circle';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="ps-4 text-muted small">${formatDate(t.date)}</td>
            <td class="fw-medium text-dark">${t.description}</td>
            <td><span class="badge bg-light text-dark border fw-normal"><i data-lucide="${icon}" size="12" class="me-1"></i>${catName}</span></td>
            <td class="small text-muted">${accName}</td>
            <td class="text-end fw-bold ${amountClass}">${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-light text-primary btn-edit" data-id="${t.id}"><i data-lucide="edit-2" size="16"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    lucide.createIcons();

    // Attach Edit Listeners
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
}

// --- CRUD Operations ---

function openEditModal(id) {
    const t = allTransactions.find(x => x.id === id);
    if (!t) return;

    document.getElementById('transId').value = t.id;
    document.getElementById('transDate').value = t.date.split('T')[0];
    document.getElementById('transAmount').value = t.amount;
    document.getElementById('transDesc').value = t.description;
    document.getElementById('transCategory').value = t.category_id || '';
    document.getElementById('transAccount').value = t.account_id || '';
    
    if (t.type === 'Income') document.getElementById('type-income').checked = true;
    else document.getElementById('type-expense').checked = true;

    document.getElementById('modalTitle').innerText = 'Edit Transaction';
    document.getElementById('btn-delete').classList.remove('d-none');
    
    transactionModal.show();
}

document.getElementById('btn-add-new').addEventListener('click', () => {
    document.getElementById('transactionForm').reset();
    document.getElementById('transId').value = '';
    document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalTitle').innerText = 'New Transaction';
    document.getElementById('btn-delete').classList.add('d-none');
    transactionModal.show();
});

document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('transId').value;
    const payload = {
        date: document.getElementById('transDate').value,
        amount: parseFloat(document.getElementById('transAmount').value),
        description: document.getElementById('transDesc').value,
        category_id: document.getElementById('transCategory').value || null,
        account_id: document.getElementById('transAccount').value,
        type: document.querySelector('input[name="type"]:checked').value
    };

    if (id) {
        await supabase.from('transactions').update(payload).eq('id', id);
    } else {
        await supabase.from('transactions').insert([payload]);
    }
    
    transactionModal.hide();
    fetchData();
});

document.getElementById('btn-delete').addEventListener('click', async () => {
    const id = document.getElementById('transId').value;
    if (id && confirm('Delete this transaction?')) {
        await supabase.from('transactions').delete().eq('id', id);
        transactionModal.hide();
        fetchData();
    }
});

// --- Search ---
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allTransactions.filter(t => 
        t.description.toLowerCase().includes(term) ||
        (t.categories && t.categories.name.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

// --- Import Logic ---
let importedData = [];

document.getElementById('btn-analyze').addEventListener('click', async () => {
    const text = document.getElementById('importText').value;
    const btn = document.getElementById('btn-analyze');
    if(!text) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';

    try {
        // Fix: Use process.env.API_KEY as per guidelines
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Extract transactions from text. JSON Array with keys: date(YYYY-MM-DD), description, amount(positive number), type(Income/Expense), categoryName. Text: ${text.substring(0, 5000)}`;
        
        const result = await ai.models.generateContent({
            // Fix: Use gemini-3-flash-preview as per guidelines
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const json = JSON.parse(result.text);
        
        // Map category names to IDs
        importedData = json.map(item => {
            const cat = store.categories.find(c => c.name.toLowerCase() === (item.categoryName || '').toLowerCase());
            return {
                ...item,
                category_id: cat ? cat.id : null,
                account_id: document.getElementById('importAccount').value
            };
        });

        renderImportPreview();
        document.getElementById('import-step-input').classList.add('d-none');
        document.getElementById('import-step-preview').classList.remove('d-none');

    } catch (e) {
        alert('AI Error: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles" size="16" class="me-2"></i> Analyze with AI';
        lucide.createIcons();
    }
});

function renderImportPreview() {
    const tbody = document.getElementById('import-preview-body');
    tbody.innerHTML = '';
    importedData.forEach(t => {
        tbody.innerHTML += `
            <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>${t.amount}</td>
                <td>${t.type}</td>
                <td>${t.categoryName || '-'}</td>
            </tr>
        `;
    });
}

document.getElementById('btn-finalize-import').addEventListener('click', async () => {
    const btn = document.getElementById('btn-finalize-import');
    btn.disabled = true;
    btn.innerText = 'Saving...';

    const dbPayload = importedData.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: t.category_id,
        account_id: t.account_id
    }));

    await supabase.from('transactions').insert(dbPayload);
    
    importModal.hide();
    document.getElementById('import-step-input').classList.remove('d-none');
    document.getElementById('import-step-preview').classList.add('d-none');
    document.getElementById('importText').value = '';
    btn.disabled = false;
    btn.innerText = 'Finalize & Import';
    
    fetchData();
});

document.getElementById('btn-back-import').addEventListener('click', () => {
    document.getElementById('import-step-input').classList.remove('d-none');
    document.getElementById('import-step-preview').classList.add('d-none');
});
