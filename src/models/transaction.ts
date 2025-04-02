import pool from "../db/client.ts";
import { InventoryTransaction, TransactionCreate, TransactionUpdate } from "../schemas/transaction.ts";

export class TransactionModel {
  /**
   * Get all inventory transactions
   */
  static async getAll(): Promise<InventoryTransaction[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<InventoryTransaction>(`
        SELECT * FROM inventory_transactions ORDER BY created_at DESC
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get a transaction by ID
   */
  static async getById(id: number): Promise<InventoryTransaction | null> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<InventoryTransaction>(`
        SELECT * FROM inventory_transactions WHERE id = $1
      `, [id]);
      
      return result.rows.length ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get transactions for a specific product
   */
  static async getByProduct(productId: number): Promise<InventoryTransaction[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<InventoryTransaction>(`
        SELECT * FROM inventory_transactions 
        WHERE product_id = $1
        ORDER BY created_at DESC
      `, [productId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new inventory transaction and update product quantity
   */
  static async create(transaction: TransactionCreate): Promise<InventoryTransaction> {
    const client = await pool.connect();
    
    try {
      // Start a transaction to ensure data consistency
      await client.queryObject("BEGIN");
      
      // Insert the inventory transaction
      const result = await client.queryObject<InventoryTransaction>(`
        INSERT INTO inventory_transactions (product_id, quantity, transaction_type, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        transaction.product_id,
        transaction.quantity,
        transaction.transaction_type,
        transaction.notes || null
      ]);
      
      // Update the product quantity based on transaction type
      let quantityChange = 0;
      
      if (transaction.transaction_type === 'receiving') {
        quantityChange = transaction.quantity;
      } else if (transaction.transaction_type === 'shipping') {
        quantityChange = -Math.abs(transaction.quantity);
      } else if (transaction.transaction_type === 'adjustment') {
        quantityChange = transaction.quantity;
      }
      
      // Update product quantity
      const updateResult = await client.queryObject(`
        UPDATE products
        SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING quantity
      `, [quantityChange, transaction.product_id]);
      
      // Check if the result would cause negative inventory
      if (updateResult.rows.length && updateResult.rows[0].quantity < 0) {
        // Roll back the transaction if it would cause negative inventory
        await client.queryObject("ROLLBACK");
        throw new Error("Transaction would cause negative inventory");
      }
      
      // Commit the transaction
      await client.queryObject("COMMIT");
      
      return result.rows[0];
    } catch (error) {
      // Rollback on error
      await client.queryObject("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a transaction (limited to notes only, as changing quantities would affect inventory)
   */
  static async update(id: number, changes: TransactionUpdate): Promise<InventoryTransaction | null> {
    const client = await pool.connect();
    try {
      // Check if transaction exists
      const exists = await client.queryObject<{ exists: boolean }>(`
        SELECT EXISTS(SELECT 1 FROM inventory_transactions WHERE id = $1) as exists
      `, [id]);
      
      if (!exists.rows[0].exists) {
        return null;
      }

      // Only notes can be updated for a transaction
      if (changes.notes !== undefined) {
        const result = await client.queryObject<InventoryTransaction>(`
          UPDATE inventory_transactions
          SET notes = $1
          WHERE id = $2
          RETURNING *
        `, [changes.notes, id]);
        
        return result.rows[0];
      }
      
      // If no changes, return the current transaction
      return this.getById(id);
    } finally {
      client.release();
    }
  }
} 