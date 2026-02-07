const express = require('express');
const cors = require('cors');
const db = require('./database'); 

const app = express();
const PORT = 5000;

app.use(cors()); 
app.use(express.json());

// ================= 1. USER AUTH ROUTES =================

app.post('/api/register', (req, res) => {
    const { name, email, contact, password } = req.body;
    const sql = 'INSERT INTO users (name, email, contact, password) VALUES (?, ?, ?, ?)';
    
    db.run(sql, [name, email, contact, password], function(err) {
        if (err) return res.status(400).json({ error: "Email already exists or Database error" });
        res.status(201).json({ id: this.lastID, message: "User Registered" });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    
    db.get(sql, [email, password], (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Invalid email or password" });
        res.json({ id: user.id, name: user.name });
    });
});


// ================= 2. TRANSACTION ROUTES (UPDATED WITH DATE) =================

// GET Transactions - Filtered by userId
app.get('/api/transactions', (req, res) => {
    const { userId } = req.query; 
    
    if (!userId) return res.status(400).json({ error: "User ID required" });

    // Ordering by date and then ID to keep the most recent entries at top
    const sql = "SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, id DESC";
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST Transaction - Modified to accept 'date' from the frontend
app.post('/api/transactions', (req, res) => {
    // Extract 'date' from req.body
    const { userId, description, category, amount, type, date } = req.body;

    // Updated validation to include date
    if (!userId || !description || !amount || !type || !date) {
        return res.status(400).json({ error: "Missing required fields (including date)" });
    }

    // Added 'date' to the SQL columns and values
    const sql = 'INSERT INTO transactions (userId, description, category, amount, type, date) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.run(sql, [userId, description, category, amount, type, date], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, ...req.body });
    });
});

app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM transactions WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Deleted successfully" });
    });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));