
import { Transaction, Category, Truck, TransactionType, BankAccount, BusinessEntity } from '../types';

// Categorias Alinhadas com Schedule C (IRS)
export const incomeCategories: Category[] = [
  { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Freight Revenue', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Detention / Layover', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: 'a7b8c9d0-e1f2-4a3b-8c9d-0e1f2a3b4c5d', name: 'Fuel Surcharge', type: TransactionType.INCOME, isTaxDeductible: false },
];

export const expenseCategories: Category[] = [
  { id: '2b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Fuel & DEF', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '3b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Repairs & Maintenance', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '4b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Tires', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '5b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Insurance Premiums', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '6b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Licenses & Permits', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '7b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Tolls & Scales', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: '8b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', name: 'Factoring Fees', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'c1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p5q6', name: 'Dispatch Fees', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'd1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p5q7', name: 'Driver Wages', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'e1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p5q8', name: 'Meals & Per Diem', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'f1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p5q9', name: 'Professional Services', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'g1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p6q0', name: 'Loan Interest', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'h1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p6q1', name: 'Equipment Lease', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'i1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p6q2', name: 'HVUT 2290 Tax', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'j1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p6q3', name: 'Owner Draw / Distributions', type: TransactionType.EXPENSE, isTaxDeductible: false },
  { id: 'k1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p6q4', name: 'Loan Principal Payment', type: TransactionType.EXPENSE, isTaxDeductible: false },
  { id: 'l1b2d3e4-f5g6-7h8i-9j0k-l1m2n3o4p6q5', name: 'Personal Expenses', type: TransactionType.EXPENSE, isTaxDeductible: false },
];

export const allCategories: Category[] = [...incomeCategories, ...expenseCategories];

export const trucks: Truck[] = [
  { id: '550e8400-e29b-41d4-a716-446655440000', unitNumber: 'T-101', make: 'Freightliner', model: 'Cascadia', year: 2022 },
  { id: '660e8400-e29b-41d4-a716-446655440001', unitNumber: 'T-102', make: 'Kenworth', model: 'T680', year: 2021 },
];

export const businessEntities: BusinessEntity[] = [
    { 
        id: '770e8400-e29b-41d4-a716-446655440002', 
        name: 'My Trucking Company', 
        structure: 'LLC (Single Member)', 
        taxForm: 'Schedule C (Form 1040)',
        ein: '00-0000000'
    }
];

export const accounts: BankAccount[] = [
    { id: '880e8400-e29b-41d4-a716-446655440003', name: 'Operating Account', type: 'Checking', initialBalance: 10000, businessEntityId: '770e8400-e29b-41d4-a716-446655440002' },
];

export const mockTransactions: Transaction[] = [];
