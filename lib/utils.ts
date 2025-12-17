
import { LegalStructure } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getTaxFormForStructure = (structure: LegalStructure): string => {
    switch (structure) {
        case 'Sole Proprietorship': return 'Schedule C (Form 1040)';
        case 'LLC (Single Member)': return 'Schedule C (Form 1040)';
        case 'LLC (Multi-Member)': return 'Form 1065 (Partnership)';
        case 'Partnership': return 'Form 1065';
        case 'S-Corp': return 'Form 1120-S';
        case 'C-Corp': return 'Form 1120';
        default: return 'Schedule C';
    }
};
