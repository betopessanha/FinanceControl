
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

/**
 * Universal CSV Export Utility
 */
export const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    // Extract headers from the first object
    const headers = Object.keys(data[0]);
    
    // Build CSV string
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add Header Row

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + (val ?? '')).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
