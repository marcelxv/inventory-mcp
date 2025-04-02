// Category Schema Definition for MCP
export interface Category {
  id: number;
  name: string;
  created_at: Date;
}

export interface CategoryCreate {
  name: string;
}

export interface CategoryUpdate {
  name?: string;
}

// MCP Type Definition for Categories
export const CategoryTypeDef = {
  name: "Category",
  description: "Product category classification",
  fields: {
    id: { type: "number", description: "Unique identifier" },
    name: { type: "string", description: "Category name" },
    created_at: { type: "date", description: "Creation timestamp" }
  }
}; 