
import { Transaction, Category, Truck, TransactionType, BankAccount, BusinessEntity } from '../types';

// Using real UUIDs for categories to prevent Postgres 22P02 errors
export const incomeCategories: Category[] = [
  { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Freight Revenue', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Detention Pay', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', name: 'Layover Pay', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: 'a7b8c9d0-e1f2-4a3b-8c9d-0e1f2a3b4c5d', name: 'Fuel Surcharge', type: TransactionType.INCOME, isTaxDeductible: false },
];

export const expenseCategories: Category[] = [
  { id: '2b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Fuel', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '3b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Repairs & Maintenance', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '4b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Tires', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '5b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Insurance Premiums', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '6b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Licenses, Permits & Fees', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '7b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Loan Interest / Lease Payments', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '8b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Driver Wages & Salaries', type: TransactionType.EXPENSE, isTaxDeductible: true },
];

export const allCategories: Category[] = [...incomeCategories, ...expenseCategories];

export const trucks: Truck[] = [
  { id: '550e8400-e29b-41d4-a716-446655440000', unitNumber: 'T-101', make: 'Freightliner', model: 'Cascadia', year: 2022 },
  { id: '660e8400-e29b-41d4-a716-446655440001', unitNumber: 'T-102', make: 'Kenworth', model: 'T680', year: 2021 },
];

export const businessEntities: BusinessEntity[] = [
    { 
        id: '770e8400-e29b-41d4-a716-446655440002', 
        name: 'Speedy Haulers LLC', 
        structure: 'LLC (Single Member)', 
        taxForm: 'Schedule C (Form 1040)',
        ein: '12-3456789'
    }
];

export const accounts: BankAccount[] = [
    { id: '880e8400-e29b-41d4-a716-446655440003', name: 'Chase Business Checking', type: 'Checking', initialBalance: 25000, businessEntityId: '770e8400-e29b-41d4-a716-446655440002' },
    { id: '990e8400-e29b-41d4-a716-446655440004', name: 'Amex Business Gold', type: 'Credit Card', initialBalance: 0, businessEntityId: '770e8400-e29b-41d4-a716-446655440002' },
];

export const mockTransactions: Transaction[] = [];
// Transactions will be generated in a real session or dynamically.
