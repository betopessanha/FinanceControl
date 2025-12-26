
import { LegalStructure } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
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
 * Validates if a string is a valid UUID v4
 */
export const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

/**
 * Generates a valid UUID v4 for database compatibility
 */
export const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Universal CSV Export Utility
 */
export const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(',')); 

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

/**
 * Download a CSV Template for Import
 */
export const downloadImportTemplate = () => {
    const templateData = [
        { date: '2024-01-25', description: 'Fuel Purchase Pilot', amount: '450.00', type: 'Expense', category: 'Fuel & DEF' },
        { date: '2024-01-26', description: 'Load Payment #1234', amount: '2500.00', type: 'Income', category: 'Freight Revenue' }
    ];
    downloadCSV(templateData, 'trucking_import_template');
};
