// Product Schema Definition for MCP
export interface Product {
  id: number;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductCreate {
  name: string;
  description?: string;
  sku: string;
  price: number;
  quantity: number;
}

export interface ProductUpdate {
  name?: string;
  description?: string | null;
  sku?: string;
  price?: number;
  quantity?: number;
}

// MCP Type Definition for Products
export const ProductTypeDef = {
  name: "Product",
  description: "Inventory product item",
  fields: {
    id: { type: "number", description: "Unique identifier" },
    name: { type: "string", description: "Product name" },
    description: { type: "string", description: "Product description", nullable: true },
    sku: { type: "string", description: "Stock keeping unit - unique product code" },
    price: { type: "number", description: "Product price" },
    quantity: { type: "number", description: "Available quantity in inventory" },
    created_at: { type: "date", description: "Creation timestamp" },
    updated_at: { type: "date", description: "Last update timestamp" }
  }
}; 