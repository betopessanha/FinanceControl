
import { Transaction, Category, Truck, TransactionType, BankAccount } from '../types';

export const incomeCategories: Category[] = [
  { id: 'cat-inc-1', name: 'Freight Revenue', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: 'cat-inc-2', name: 'Detention Pay', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: 'cat-inc-3', name: 'Layover Pay', type: TransactionType.INCOME, isTaxDeductible: false },
  { id: 'cat-inc-4', name: 'Fuel Surcharge', type: TransactionType.INCOME, isTaxDeductible: false },
];

export const expenseCategories: Category[] = [
  { id: 'cat-exp-1', name: 'Fuel', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-2', name: 'Repairs & Maintenance', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-3', name: 'Tires', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-4', name: 'Insurance Premiums', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-5', name: 'Licenses, Permits & Fees', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-6', name: 'Loan Interest / Lease Payments', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-7', name: 'Driver Wages & Salaries', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-8', name: 'Dispatch & Factoring Fees', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-9', name: 'Tolls & Parking', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-10', name: 'Office & Communication Expenses', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-11', name: 'Professional Services (Legal, Accounting)', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-12', name: 'Supplies (Logbooks, tools, etc.)', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-13', name: 'Travel & Per Diem', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-14', name: 'Depreciation', type: TransactionType.EXPENSE, isTaxDeductible: true },
  { id: 'cat-exp-15', name: 'Taxes (HVUT, IFTA)', type: TransactionType.EXPENSE, isTaxDeductible: true },
];

export const allCategories: Category[] = [...incomeCategories, ...expenseCategories];

export const trucks: Truck[] = [
  { id: 'truck-1', unitNumber: 'T-101', make: 'Freightliner', model: 'Cascadia', year: 2022 },
  { id: 'truck-2', unitNumber: 'T-102', make: 'Kenworth', model: 'T680', year: 2021 },
  { id: 'truck-3', unitNumber: 'T-103', make: 'Peterbilt', model: '579', year: 2023 },
  { id: 'truck-4', unitNumber: 'T-104', make: 'Volvo', model: 'VNL 860', year: 2022 },
];

export const accounts: BankAccount[] = [
    { id: 'acc-1', name: 'Chase Business Checking', type: 'Checking', initialBalance: 25000 },
    { id: 'acc-2', name: 'Amex Business Gold', type: 'Credit Card', initialBalance: 0 },
    { id: 'acc-3', name: 'Business Savings', type: 'Savings', initialBalance: 50000 },
];

const generateRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export const mockTransactions: Transaction[] = [];

const startDate = new Date(2023, 0, 1);
const endDate = new Date();

// Helper to pick random account
const getRandomAccount = (type: TransactionType) => {
    if (type === TransactionType.EXPENSE) {
        // Expenses can be paid from Checking or Credit Card
        return Math.random() > 0.5 ? accounts[0].id : accounts[1].id;
    } else {
        // Income usually goes to Checking
        return accounts[0].id;
    }
}

for (let i = 0; i < 150; i++) {
  const isIncome = Math.random() > 0.7;
  const type = isIncome ? TransactionType.INCOME : TransactionType.EXPENSE;
  const category = isIncome
    ? incomeCategories[Math.floor(Math.random() * incomeCategories.length)]
    : expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
  
  // Make truck optional (80% chance of having a truck)
  const hasTruck = Math.random() > 0.2;
  const truck = hasTruck ? trucks[Math.floor(Math.random() * trucks.length)] : undefined;
  
  const amount = isIncome ? Math.random() * 3000 + 1500 : Math.random() * 1000 + 50;

  const descriptions = {
    'Freight Revenue': ['Load from CA to TX', 'Cross-country haul', 'Regional delivery'],
    'Detention Pay': ['Warehouse holdover', 'Delay at receiver'],
    'Fuel Surcharge': ['Fuel surcharge adjustment'],
    'Layover Pay': ['24hr layover in Chicago'],
    'Fuel': ['Pilot J Fuel Stop', 'Loves Travel Center', 'TA Petro'],
    'Repairs & Maintenance': ['Oil Change', 'Brake Adjustment', 'Engine Check'],
    'Tires': ['New steer tires', 'Tire rotation'],
    'Insurance Premiums': ['Quarterly Liability Premium', 'Cargo Insurance Payment'],
    'Licenses, Permits & Fees': ['IFTA Filing Fee', 'Annual Registration Renewal', 'HVUT Payment'],
    'Loan Interest / Lease Payments': ['Monthly truck payment', 'Trailer lease payment'],
    'Driver Wages & Salaries': ['Weekly paystub - John Doe', 'Driver advance'],
    'Dispatch & Factoring Fees': ['Dispatch service fee', 'Invoice factoring fee'],
    'Tolls & Parking': ['PA Turnpike Toll', 'Overnight Parking Fee', 'George Washington Bridge'],
    'Office & Communication Expenses': ['Verizon Wireless Bill', 'QuickBooks Subscription', 'Office Supplies'],
    'Professional Services (Legal, Accounting)': ['CPA Tax Prep Fee', 'Legal Consultation'],
    'Supplies (Logbooks, tools, etc.)': ['Load straps and chains', 'Cleaning supplies', 'Logbooks'],
    'Travel & Per Diem': ['Driver Meal Per Diem', 'Hotel Stay'],
    'Depreciation': ['Annual Vehicle Depreciation'],
    'Taxes (HVUT, IFTA)': ['Quarterly IFTA Payment', 'Annual HVUT 2290'],
  };

  const descList = descriptions[category.name as keyof typeof descriptions] || ['Miscellaneous Transaction'];

  mockTransactions.push({
    id: `trans-${i + 1}`,
    date: generateRandomDate(startDate, endDate).toISOString(),
    description: descList[Math.floor(Math.random() * descList.length)],
    category,
    amount,
    truck,
    type,
    accountId: getRandomAccount(type),
    receipts: [] 
  });
}

// Add a few transfers
mockTransactions.push({
    id: 'trans-transfer-1',
    date: new Date().toISOString(),
    description: 'Transfer to Savings',
    amount: 5000,
    type: TransactionType.TRANSFER,
    accountId: 'acc-1', // From Checking
    toAccountId: 'acc-3', // To Savings
    receipts: []
});

mockTransactions.push({
    id: 'trans-transfer-2',
    date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    description: 'Pay Credit Card',
    amount: 2500,
    type: TransactionType.TRANSFER,
    accountId: 'acc-1', // From Checking
    toAccountId: 'acc-2', // To Credit Card
    receipts: []
});

mockTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
