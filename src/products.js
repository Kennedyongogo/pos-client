const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = function(db) {
  
  // GET all products
  router.get('/', (req, res) => {
    try {
      const products = db.prepare('SELECT * FROM products ORDER BY name').all();
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET product by barcode
  router.get('/barcode/:barcode', (req, res) => {
    try {
      const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST create product
  router.post('/', (req, res) => {
    try {
      const { barcode, name, price, cost, stock, category } = req.body;
      const id = uuidv4();
      
      db.prepare(`
        INSERT INTO products (id, barcode, name, price, cost, stock, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, barcode, name, price, cost || 0, stock || 0, category);
      
      db.prepare(`
        INSERT INTO sync_queue (table_name, record_id, action, data)
        VALUES (?, ?, ?, ?)
      `).run('products', id, 'create', JSON.stringify({ id, barcode, name, price }));
      
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT update product
  router.put('/:id', (req, res) => {
    try {
      const { barcode, name, price, cost, stock, category } = req.body;
      
      db.prepare(`
        UPDATE products 
        SET barcode = ?, name = ?, price = ?, cost = ?, stock = ?, category = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(barcode, name, price, cost || 0, stock || 0, category, req.params.id);
      
      db.prepare(`
        INSERT INTO sync_queue (table_name, record_id, action, data)
        VALUES (?, ?, ?, ?)
      `).run('products', req.params.id, 'update', JSON.stringify({ id: req.params.id, name, price }));
      
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE product
  router.delete('/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
      
      db.prepare(`
        INSERT INTO sync_queue (table_name, record_id, action, data)
        VALUES (?, ?, ?, ?)
      `).run('products', req.params.id, 'delete', JSON.stringify({ id: req.params.id }));
      
      res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};