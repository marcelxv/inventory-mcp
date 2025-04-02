import pool from "../db/client.ts";
import { Product, ProductCreate, ProductUpdate } from "../schemas/product.ts";

export class ProductModel {
  /**
   * Get all products from the database
   */
  static async getAll(): Promise<Product[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Product>(`
        SELECT * FROM products ORDER BY name
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get a single product by ID
   */
  static async getById(id: number): Promise<Product | null> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Product>(`
        SELECT * FROM products WHERE id = $1
      `, [id]);
      
      return result.rows.length ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new product
   */
  static async create(product: ProductCreate): Promise<Product> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Product>(`
        INSERT INTO products (name, description, sku, price, quantity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        product.name,
        product.description || null,
        product.sku,
        product.price,
        product.quantity
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing product
   */
  static async update(id: number, changes: ProductUpdate): Promise<Product | null> {
    const client = await pool.connect();
    try {
      // First check if the product exists
      const exists = await client.queryObject<{ exists: boolean }>(`
        SELECT EXISTS(SELECT 1 FROM products WHERE id = $1) as exists
      `, [id]);
      
      if (!exists.rows[0].exists) {
        return null;
      }

      // Build the SET part of the query dynamically based on which fields are provided
      const updates: string[] = [];
      const values: (string | number | null)[] = [];
      let paramCount = 1;

      if (changes.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(changes.name);
      }
      
      if (changes.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(changes.description);
      }
      
      if (changes.sku !== undefined) {
        updates.push(`sku = $${paramCount++}`);
        values.push(changes.sku);
      }
      
      if (changes.price !== undefined) {
        updates.push(`price = $${paramCount++}`);
        values.push(changes.price);
      }
      
      if (changes.quantity !== undefined) {
        updates.push(`quantity = $${paramCount++}`);
        values.push(changes.quantity);
      }

      // Always update the updated_at timestamp
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      // If there's nothing to update, return the current product
      if (updates.length === 1) {
        return this.getById(id);
      }

      // Add the ID as the last parameter
      values.push(id);

      const result = await client.queryObject<Product>(`
        UPDATE products
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Delete a product by ID
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject(`
        DELETE FROM products WHERE id = $1 RETURNING id
      `, [id]);
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get products by category ID
   */
  static async getByCategory(categoryId: number): Promise<Product[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Product>(`
        SELECT p.* FROM products p
        JOIN product_categories pc ON p.id = pc.product_id
        WHERE pc.category_id = $1
        ORDER BY p.name
      `, [categoryId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
} 