// Model Context Protocol (MCP) for Inventory Management System
import { ProductTypeDef } from "./schemas/product.ts";
import { CategoryTypeDef } from "./schemas/category.ts";
import { TransactionTypeDef } from "./schemas/transaction.ts";
import { ProductModel } from "./models/product.ts";
import { CategoryModel } from "./models/category.ts";
import { TransactionModel } from "./models/transaction.ts";

// Define the MCP Schema
export const MCP_SCHEMA = {
  name: "InventoryManagementSystem",
  version: "1.0.0",
  description: "Model Context Protocol for inventory management",
  types: {
    Product: ProductTypeDef,
    Category: CategoryTypeDef,
    InventoryTransaction: TransactionTypeDef
  }
};

// Helper to format responses following the Claude format
function formatResponse(success: boolean, data: unknown, message?: string) {
  return {
    success,
    data,
    message: message || (success ? "Operation successful" : "Operation failed")
  };
}

// Define the MCP API handlers
export const MCP_API = {
  // Product Operations
  async getProducts() {
    try {
      const products = await ProductModel.getAll();
      return formatResponse(true, products);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch products: ${error.message}`);
    }
  },

  async getProduct(id: number) {
    try {
      const product = await ProductModel.getById(id);
      if (!product) {
        return formatResponse(false, null, `Product with ID ${id} not found`);
      }
      return formatResponse(true, product);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch product: ${error.message}`);
    }
  },

  async createProduct(productData: any) {
    try {
      const product = await ProductModel.create(productData);
      return formatResponse(true, product, "Product created successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to create product: ${error.message}`);
    }
  },

  async updateProduct(id: number, changes: any) {
    try {
      const product = await ProductModel.update(id, changes);
      if (!product) {
        return formatResponse(false, null, `Product with ID ${id} not found`);
      }
      return formatResponse(true, product, "Product updated successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to update product: ${error.message}`);
    }
  },

  async deleteProduct(id: number) {
    try {
      const success = await ProductModel.delete(id);
      if (!success) {
        return formatResponse(false, null, `Product with ID ${id} not found`);
      }
      return formatResponse(true, null, "Product deleted successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to delete product: ${error.message}`);
    }
  },

  // Category Operations
  async getCategories() {
    try {
      const categories = await CategoryModel.getAll();
      return formatResponse(true, categories);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch categories: ${error.message}`);
    }
  },

  async getCategory(id: number) {
    try {
      const category = await CategoryModel.getById(id);
      if (!category) {
        return formatResponse(false, null, `Category with ID ${id} not found`);
      }
      return formatResponse(true, category);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch category: ${error.message}`);
    }
  },

  async createCategory(categoryData: any) {
    try {
      const category = await CategoryModel.create(categoryData);
      return formatResponse(true, category, "Category created successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to create category: ${error.message}`);
    }
  },

  async updateCategory(id: number, changes: any) {
    try {
      const category = await CategoryModel.update(id, changes);
      if (!category) {
        return formatResponse(false, null, `Category with ID ${id} not found`);
      }
      return formatResponse(true, category, "Category updated successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to update category: ${error.message}`);
    }
  },

  async deleteCategory(id: number) {
    try {
      const success = await CategoryModel.delete(id);
      if (!success) {
        return formatResponse(false, null, `Category with ID ${id} not found`);
      }
      return formatResponse(true, null, "Category deleted successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to delete category: ${error.message}`);
    }
  },

  async addProductToCategory(categoryId: number, productId: number) {
    try {
      const success = await CategoryModel.addProduct(categoryId, productId);
      if (!success) {
        return formatResponse(false, null, "Failed to add product to category");
      }
      return formatResponse(true, null, "Product added to category successfully");
    } catch (error) {
      return formatResponse(false, null, `Error adding product to category: ${error.message}`);
    }
  },

  async removeProductFromCategory(categoryId: number, productId: number) {
    try {
      const success = await CategoryModel.removeProduct(categoryId, productId);
      if (!success) {
        return formatResponse(false, null, "Product was not in the specified category");
      }
      return formatResponse(true, null, "Product removed from category successfully");
    } catch (error) {
      return formatResponse(false, null, `Error removing product from category: ${error.message}`);
    }
  },

  async getProductsByCategory(categoryId: number) {
    try {
      const products = await ProductModel.getByCategory(categoryId);
      return formatResponse(true, products);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch products by category: ${error.message}`);
    }
  },

  // Inventory Transaction Operations
  async getTransactions() {
    try {
      const transactions = await TransactionModel.getAll();
      return formatResponse(true, transactions);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch transactions: ${error.message}`);
    }
  },

  async getTransaction(id: number) {
    try {
      const transaction = await TransactionModel.getById(id);
      if (!transaction) {
        return formatResponse(false, null, `Transaction with ID ${id} not found`);
      }
      return formatResponse(true, transaction);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch transaction: ${error.message}`);
    }
  },

  async createTransaction(transactionData: any) {
    try {
      const transaction = await TransactionModel.create(transactionData);
      return formatResponse(true, transaction, "Inventory transaction created successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to create transaction: ${error.message}`);
    }
  },

  async updateTransaction(id: number, changes: any) {
    try {
      const transaction = await TransactionModel.update(id, changes);
      if (!transaction) {
        return formatResponse(false, null, `Transaction with ID ${id} not found`);
      }
      return formatResponse(true, transaction, "Transaction updated successfully");
    } catch (error) {
      return formatResponse(false, null, `Failed to update transaction: ${error.message}`);
    }
  },

  async getProductTransactions(productId: number) {
    try {
      const transactions = await TransactionModel.getByProduct(productId);
      return formatResponse(true, transactions);
    } catch (error) {
      return formatResponse(false, null, `Failed to fetch product transactions: ${error.message}`);
    }
  },
};

// MCP Request Handler Function
export async function handleMCPRequest(action: string, params: any = {}) {
  // Parse the action to determine which function to call
  const [entity, operation] = action.split('.');
  
  try {
    switch (entity) {
      case 'product':
        switch (operation) {
          case 'list': return await MCP_API.getProducts();
          case 'get': return await MCP_API.getProduct(params.id);
          case 'create': return await MCP_API.createProduct(params);
          case 'update': return await MCP_API.updateProduct(params.id, params.changes);
          case 'delete': return await MCP_API.deleteProduct(params.id);
          default: return formatResponse(false, null, `Unknown operation: ${operation}`);
        }
      
      case 'category':
        switch (operation) {
          case 'list': return await MCP_API.getCategories();
          case 'get': return await MCP_API.getCategory(params.id);
          case 'create': return await MCP_API.createCategory(params);
          case 'update': return await MCP_API.updateCategory(params.id, params.changes);
          case 'delete': return await MCP_API.deleteCategory(params.id);
          case 'addProduct': return await MCP_API.addProductToCategory(params.categoryId, params.productId);
          case 'removeProduct': return await MCP_API.removeProductFromCategory(params.categoryId, params.productId);
          case 'products': return await MCP_API.getProductsByCategory(params.id);
          default: return formatResponse(false, null, `Unknown operation: ${operation}`);
        }
      
      case 'transaction':
        switch (operation) {
          case 'list': return await MCP_API.getTransactions();
          case 'get': return await MCP_API.getTransaction(params.id);
          case 'create': return await MCP_API.createTransaction(params);
          case 'update': return await MCP_API.updateTransaction(params.id, params.changes);
          case 'byProduct': return await MCP_API.getProductTransactions(params.productId);
          default: return formatResponse(false, null, `Unknown operation: ${operation}`);
        }
      
      default:
        return formatResponse(false, null, `Unknown entity: ${entity}`);
    }
  } catch (error) {
    return formatResponse(false, null, `Error processing request: ${error.message}`);
  }
} 