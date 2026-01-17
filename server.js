
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ieat_pos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- API ENDPOINTS ---

// 1. Sync Orders (Push from Local to MySQL)
app.post('/api/sync/orders', async (req, res) => {
    const { orders } = req.body;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        for (const order of orders) {
            // Insert Order Header
            await connection.execute(
                `INSERT INTO orders (uuid, branch_id, server_id, customer_id, table_no, status, dining_option, payment_method, subtotal, tax, discount, total_amount, points_earned, points_redeemed, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE status=VALUES(status), updated_at=NOW()`,
                [order.uuid, order.branchId, order.serverId, order.customerId, order.tableNo, order.status, order.diningOption, order.paymentMethod, order.subtotal, order.tax, order.discount, order.totalAmount, order.pointsEarned, order.pointsRedeemed, new Date(order.createdAt)]
            );

            // Clear and Re-insert Line Items
            await connection.execute('DELETE FROM order_items WHERE order_uuid = ?', [order.uuid]);
            
            for (const item of order.items) {
                const [result] = await connection.execute(
                    `INSERT INTO order_items (order_uuid, product_id, item_name, qty, price_at_sale, notes, is_completed) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [order.uuid, item.id, item.name, item.qty, item.price, item.notes || '', item.completed || false]
                );
                
                const orderItemId = result.insertId;

                // Modifiers
                if (item.selectedModifiers) {
                    for (const mod of item.selectedModifiers) {
                        await connection.execute(
                            `INSERT INTO order_item_selected_modifiers (order_item_id, modifier_id, modifier_name, price_at_sale) 
                             VALUES (?, ?, ?, ?)`,
                            [orderItemId, mod.id, mod.name, mod.price]
                        );
                    }
                }
            }
        }

        await connection.commit();
        res.json({ success: true, message: `${orders.length} orders synced successfully` });
    } catch (error) {
        await connection.rollback();
        console.error('Sync Error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// 2. Fetch Master Products
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await pool.query('SELECT * FROM products');
        // Get branch overrides
        const [overrides] = await pool.query('SELECT * FROM product_branch_configs');
        
        const merged = products.map(p => ({
            ...p,
            branchConfig: overrides.filter(o => o.product_id === p.id).map(o => ({
                branchId: o.branch_id,
                isVisible: !!o.is_visible,
                price: o.override_price || p.base_price
            }))
        }));

        res.json(merged);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Attendance Logging
app.post('/api/attendance', async (req, res) => {
    const { employeeId, type, branchId } = req.body;
    try {
        await pool.execute(
            'INSERT INTO attendance_records (id, employee_id, branch_id, type, timestamp) VALUES (UUID(), ?, ?, ?, NOW())',
            [employeeId, branchId, type]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Sync Payments (Push from Local to MySQL)
app.post('/api/sync/payment', async (req, res) => {
    const { orderId, cashAmount, cardAmount, totalAmount, cardReference, timestamp } = req.body;
    const connection = await pool.getConnection();
    
    try {
        // Check if payment already exists for this order
        const [existing] = await connection.execute(
            'SELECT id FROM payment_transactions WHERE order_id = ? LIMIT 1',
            [orderId]
        );

        if (existing.length === 0) {
            // Insert new payment transaction
            const transactionType = cashAmount > 0 && cardAmount > 0 ? 'partial' : 
                                   cashAmount > 0 ? 'cash' : 'card';
            
            await connection.execute(
                `INSERT INTO payment_transactions (order_id, transaction_type, cash_amount, card_amount, total_amount, payment_reference, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
                [orderId, transactionType, cashAmount, cardAmount, totalAmount, cardReference || null, new Date(timestamp)]
            );

            // Update order payment status
            await connection.execute(
                `UPDATE orders SET payment_method = ?, payment_status = 'complete', updated_at = NOW() WHERE uuid = ?`,
                [transactionType === 'partial' ? 'split' : transactionType, orderId]
            );
        }

        res.json({ success: true, message: 'Payment synced successfully' });
    } catch (error) {
        console.error('Payment Sync Error:', error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`iEat Backend running on port ${PORT}`));
