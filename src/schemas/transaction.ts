// Transaction Schema Definition for MCP
export type TransactionType = 'receiving' | 'shipping' | 'adjustment';

export interface InventoryTransaction {
  id: number;
  product_id: number;
  quantity: number;
  transaction_type: TransactionType;
  notes: string | null;
  created_at: Date;
}

export interface TransactionCreate {
  product_id: number;
  quantity: number;
  transaction_type: TransactionType;
  notes?: string;
}

export interface TransactionUpdate {
  quantity?: number;
  notes?: string | null;
}

// MCP Type Definition for Inventory Transactions
export const TransactionTypeDef = {
  name: "InventoryTransaction",
  description: "Record of inventory movement",
  fields: {
    id: { type: "number", description: "Unique identifier" },
    product_id: { type: "number", description: "Reference to product" },
    quantity: { type: "number", description: "Quantity of items changed" },
    transaction_type: { 
      type: "string", 
      description: "Type of transaction",
      enum: ["receiving", "shipping", "adjustment"]
    },
    notes: { type: "string", description: "Additional information", nullable: true },
    created_at: { type: "date", description: "Transaction timestamp" }
  }
}; 