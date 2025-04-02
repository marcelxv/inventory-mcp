import pool from "../db/client.ts";
import { Category, CategoryCreate, CategoryUpdate } from "../schemas/category.ts";

export class CategoryModel {
  /**
   * Get all categories
   */
  static async getAll(): Promise<Category[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Category>(`
        SELECT * FROM categories ORDER BY name
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get a category by ID
   */
  static async getById(id: number): Promise<Category | null> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Category>(`
        SELECT * FROM categories WHERE id = $1
      `, [id]);
      
      return result.rows.length ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new category
   */
  static async create(category: CategoryCreate): Promise<Category> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject<Category>(`
        INSERT INTO categories (name)
        VALUES ($1)
        RETURNING *
      `, [category.name]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Update a category
   */
  static async update(id: number, changes: CategoryUpdate): Promise<Category | null> {
    const client = await pool.connect();
    try {
      // Check if category exists
      const exists = await client.queryObject<{ exists: boolean }>(`
        SELECT EXISTS(SELECT 1 FROM categories WHERE id = $1) as exists
      `, [id]);
      
      if (!exists.rows[0].exists) {
        return null;
      }

      // If name is provided, update it
      if (changes.name !== undefined) {
        const result = await client.queryObject<Category>(`
          UPDATE categories
          SET name = $1
          WHERE id = $2
          RETURNING *
        `, [changes.name, id]);
        
        return result.rows[0];
      }
      
      // If no changes, return the current category
      return this.getById(id);
    } finally {
      client.release();
    }
  }

  /**
   * Delete a category
   */
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject(`
        DELETE FROM categories WHERE id = $1 RETURNING id
      `, [id]);
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Add a product to a category
   */
  static async addProduct(categoryId: number, productId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.queryObject(`
        INSERT INTO product_categories (category_id, product_id)
        VALUES ($1, $2)
        ON CONFLICT (category_id, product_id) DO NOTHING
      `, [categoryId, productId]);
      
      return true;
    } catch (error) {
      console.error("Failed to add product to category:", error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a product from a category
   */
  static async removeProduct(categoryId: number, productId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject(`
        DELETE FROM product_categories 
        WHERE category_id = $1 AND product_id = $2
        RETURNING category_id
      `, [categoryId, productId]);
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
} 