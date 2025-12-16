
export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
  TRANSFER = 'Transfer',
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isTaxDeductible?: boolean; // New field to track tax status explicitly
}

export interface Truck {
  id: string;
  unitNumber: string;
  make: string;
  model: string;
  year: number;
}

export type LegalStructure = 
    | 'Sole Proprietorship' 
    | 'LLC (Single Member)' 
    | 'LLC (Multi-Member)' 
    | 'S-Corp' 
    | 'C-Corp' 
    | 'Partnership';

export interface BusinessEntity {
    id: string;
    name: string;
    structure: LegalStructure;
    taxForm: string; // Calculated based on structure (e.g., "Form 1065", "Schedule C")
    ein?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'Checking' | 'Savings' | 'Credit Card';
  initialBalance: number;
  businessEntityId?: string; // Link to the legal entity owning this account
}

export interface Transaction {
  id: string;
  date: string; // ISO string format
  description: string;
  category?: Category; // Optional for Transfers
  amount: number;
  truck?: Truck; // Optional for Transfers
  type: TransactionType;
  accountId: string; // The account money comes from (Expense/Transfer) or goes to (Income)
  toAccountId?: string; // Only for Transfers (Destination)
  receipts?: string[]; 
}
