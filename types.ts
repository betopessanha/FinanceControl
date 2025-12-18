
export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
  TRANSFER = 'Transfer',
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isTaxDeductible?: boolean;
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
    taxForm: string;
    ein?: string;
    // New Detailed Fields
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    logoUrl?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'Checking' | 'Savings' | 'Credit Card';
  initialBalance: number;
  businessEntityId?: string;
}

export interface FiscalYearRecord {
    year: number;
    status: 'Open' | 'Closed';
    manualBalance?: number;
    notes?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category?: Category;
  amount: number;
  truck?: Truck;
  type: TransactionType;
  accountId: string;
  toAccountId?: string;
  receipts?: string[]; 
}
