// 1. SESSION & UI INITIALIZATION
const currentUserId = localStorage.getItem('userId');
const currentUserName = localStorage.getItem('userName');
let lineChart = null; 
let doughnutChart = null; 

if (!currentUserId) {
    window.location.href = 'login.html'; 
}

document.addEventListener('DOMContentLoaded', () => {
    const welcomeDisplay = document.getElementById('user-welcome');
    if (welcomeDisplay) welcomeDisplay.textContent = `Welcome back, ${currentUserName}!`;
    
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.valueAsDate = new Date();
    
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);

    getTransactions();
});

const transactionForm = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');
const balanceDisplay = document.getElementById('balance');
const API_URL = 'http://localhost:5000/api/transactions';

// 2. GET TRANSACTIONS
async function getTransactions() {
    try {
        const response = await fetch(`${API_URL}?userId=${currentUserId}`);
        const data = await response.json();
        updateUI(data);
        updateLineChart(data); 
        updateDoughnutChart(data); 
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// 3. UPDATE UI (List, Totals, Empty State & Budget Alarm)
function updateUI(transactions) {
    if (!transactionList) return;
    transactionList.innerHTML = ''; 

    // --- EMPTY STATE LOGIC ---
    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state" style="text-align:center; padding: 30px; color: #64748b;">
                <p style="font-size: 2.5rem; margin:0;">📝</p>
                <p>No transactions yet. Start by adding one!</p>
            </div>`;
        
        balanceDisplay.textContent = "$0.00";
        balanceDisplay.classList.remove('negative-balance');
        document.getElementById('total-income').textContent = "+$0.00";
        document.getElementById('total-expense').textContent = "-$0.00";
        return;
    }

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        const type = (t.type || 'expense').toLowerCase();
        if (type === 'income') income += amt;
        else expense += amt;

        const li = document.createElement('li');
        li.className = `log-item ${type}`; 
        li.innerHTML = `
            <div class="log-info">
                <strong>${t.description}</strong>
                <small>${t.category} • ${new Date(t.date).toLocaleDateString()}</small>
            </div>
            <div class="log-actions">
                <span class="amt">${type === 'income' ? '+' : '-'}$${amt.toFixed(2)}</span>
                <button class="delete-btn" onclick="deleteEntry(${t.id})">🗑️</button>
            </div>
        `;
        transactionList.appendChild(li);
    });

    const netBalance = income - expense;
    
    // --- BUDGET ALARM LOGIC ---
    if (balanceDisplay) {
        balanceDisplay.textContent = `$${netBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        
        if (netBalance < 0) {
            balanceDisplay.classList.add('negative-balance');
        } else {
            balanceDisplay.classList.remove('negative-balance');
        }
    }

    document.getElementById('total-income').textContent = `+$${income.toFixed(2)}`;
    document.getElementById('total-expense').textContent = `-$${expense.toFixed(2)}`;
}

// 4. LINE CHART LOGIC (Trend)
function updateLineChart(transactions) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (transactions.length === 0) {
        if (lineChart) lineChart.destroy();
        return;
    }

    const sortedData = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let currentBal = 0;
    const labels = [];
    const balances = [];

    sortedData.forEach(t => {
        const amt = parseFloat(t.amount);
        t.type === 'income' ? currentBal += amt : currentBal -= amt;
        labels.push(new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        balances.push(currentBal);
    });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Running Balance',
                data: balances,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 5. DOUGHNUT CHART LOGIC (Spending Breakdown)
function updateDoughnutChart(transactions) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
        if (doughnutChart) doughnutChart.destroy();
        return;
    }

    const categoryTotals = {};
    expenses.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
    });

    if (doughnutChart) doughnutChart.destroy();
    doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: ['#4361ee', '#10b981', '#ef4444', '#f59e0b', '#7209b7', '#64748b'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
            }
        }
    });
}

// 6. FORM SUBMISSION (With Validation)
if (transactionForm) {
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amountInput = document.getElementById('amount');
        const amountVal = parseFloat(amountInput.value);

        // --- FORM VALIDATION ---
        if (amountVal <= 0) {
            alert("Please enter an amount greater than zero.");
            return;
        }

        const payload = {
            userId: currentUserId,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            amount: amountVal,
            type: document.getElementById('type').value,
            date: document.getElementById('date').value
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            transactionForm.reset();
            document.getElementById('date').valueAsDate = new Date();
            getTransactions(); 
        }
    });
}

// 7. HELPERS (Delete, Export, Logout)
async function deleteEntry(id) {
    if (confirm("Delete this record?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        getTransactions();
    }
}

async function exportToExcel() {
    const response = await fetch(`${API_URL}?userId=${currentUserId}`);
    const transactions = await response.json();
    if (transactions.length === 0) return alert("No data to export");
    
    const cleanData = transactions.map(({ id, userId, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "Finance_Report.xlsx");
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});