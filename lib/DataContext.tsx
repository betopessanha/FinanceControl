
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Category, Truck, BankAccount, TransactionType } from '../types';
import { mockTransactions, allCategories, trucks as mockTrucks, accounts as mockAccounts } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ReportFilter {
    year: string;
    categoryNames: string[];
    sourceReport: string; // e.g. "Car and truck expenses (Line 9)"
}

interface DataContextType {
    transactions: Transaction[];
    categories: Category[];
    trucks: Truck[];
    accounts: BankAccount[];
    loading: boolean;
    refreshData: () => Promise<void>;
    
    // New filter state for navigation between reports and transactions
    reportFilter: ReportFilter | null;
    setReportFilter: (filter: ReportFilter | null) => void;

    // Methods for Optimistic/Local Updates
    addLocalTransaction: (t: Transaction) => void;
    updateLocalTransaction: (t: Transaction) => void;
    deleteLocalTransaction: (id: string) => void;
    deleteLocalTransactions: (ids: string[]) => void; // Bulk delete support

    // Methods for Categories (Fixing "Not Saving" issue)
    addLocalCategory: (c: Category) => void;
    updateLocalCategory: (c: Category) => void;
    deleteLocalCategory: (id: string) => void;
}

const DataContext = createContext<DataContextType>({
    transactions: [],
    categories: [],
    trucks: [],
    accounts: [],
    loading: true,
    refreshData: async () => {},
    reportFilter: null,
    setReportFilter: () => {},
    addLocalTransaction: () => {},
    updateLocalTransaction: () => {},
    deleteLocalTransaction: () => {},
    deleteLocalTransactions: () => {},
    addLocalCategory: () => {},
    updateLocalCategory: () => {},
    deleteLocalCategory: () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);

    // --- Local Storage Helpers for Tax Settings (Hybrid Persistence) ---
    // This ensures user settings persist locally even if the DB column is missing
    const getLocalTaxOverride = (catId: string): boolean | undefined => {
        try {
            const stored = localStorage.getItem('tax_deductible_overrides');
            if (!stored) return undefined;
            const map = JSON.parse(stored);
            return map[catId];
        } catch { return undefined; }
    }

    const setLocalTaxOverride = (catId: string, val: boolean) => {
        try {
            const stored = localStorage.getItem('tax_deductible_overrides');
            const map = stored ? JSON.parse(stored) : {};
            map[catId] = val;
            localStorage.setItem('tax_deductible_overrides', JSON.stringify(map));
        } catch { }
    }
    // ------------------------------------------------------------------

    const fetchData = async () => {
        setLoading(true);
        
        if (!isSupabaseConfigured || !supabase) {
            console.warn("Supabase not configured. Using Mock Data.");
            setTransactions(mockTransactions);
            // Only set categories if we haven't modified them locally yet (simple check)
            if (categories.length === 0) setCategories(allCategories);
            setTrucks(mockTrucks);
            setAccounts(mockAccounts);
            setLoading(false);
            return;
        }

        try {
            // 1. Fetch Static Data
            const { data: catData } = await supabase.from('categories').select('*');
            const { data: truckData } = await supabase.from('trucks').select('*');
            const { data: accData } = await supabase.from('accounts').select('*');

            if (catData) setCategories(catData.map((c: any) => {
                // Determine Tax Deductibility:
                // 1. Check Local Storage Override (Highest Priority - handles missing DB column case)
                const localVal = getLocalTaxOverride(c.id);
                
                // 2. Check DB Value
                const dbVal = c.is_tax_deductible;

                // 3. Default Logic
                let finalVal = true; // Default
                if (localVal !== undefined) finalVal = localVal;
                else if (dbVal !== undefined) finalVal = dbVal;
                else finalVal = (c.type === 'Expense');

                return { 
                    ...c, 
                    type: c.type as TransactionType,
                    isTaxDeductible: finalVal
                };
            }));
            
            if (truckData) setTrucks(truckData.map((t: any) => ({ ...t, unitNumber: t.unit_number })));
            if (accData) setAccounts(accData.map((a: any) => ({ ...a, initialBalance: a.initial_balance })));

            // 2. Fetch Transactions with Joins
            const { data: transData, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    categories:category_id(*),
                    trucks:truck_id(*)
                `)
                .order('date', { ascending: false });

            if (error) throw error;

            if (transData) {
                const formattedTransactions: Transaction[] = transData.map((t: any) => {
                    // Resolve Category Tax Status for Transaction
                    let catIsTaxDeductible = true;
                    if (t.categories) {
                        const localVal = getLocalTaxOverride(t.categories.id);
                        if (localVal !== undefined) catIsTaxDeductible = localVal;
                        else if (t.categories.is_tax_deductible !== undefined) catIsTaxDeductible = t.categories.is_tax_deductible;
                        else catIsTaxDeductible = (t.categories.type === 'Expense');
                    }

                    return {
                        id: t.id,
                        date: t.date,
                        description: t.description,
                        amount: t.amount,
                        type: t.type as TransactionType,
                        accountId: t.account_id,
                        toAccountId: t.to_account_id,
                        receipts: t.receipts || [],
                        // Map joined relations to objects matching our interfaces
                        category: t.categories ? { 
                            id: t.categories.id, 
                            name: t.categories.name, 
                            type: t.categories.type as TransactionType,
                            isTaxDeductible: catIsTaxDeductible
                        } : undefined,
                        truck: t.trucks ? {
                            id: t.trucks.id,
                            unitNumber: t.trucks.unit_number,
                            make: t.trucks.make,
                            model: t.trucks.model,
                            year: t.trucks.year
                        } : undefined
                    };
                });
                setTransactions(formattedTransactions);
            }

        } catch (error) {
            console.error("Error fetching data from Supabase:", error);
            // Fallback just in case of query error
            if (categories.length === 0) setCategories(allCategories);
            setTransactions(mockTransactions);
        } finally {
            setLoading(false);
        }
    };

    // Helper functions to update state immediately without waiting for re-fetch
    const addLocalTransaction = (t: Transaction) => {
        setTransactions(prev => [t, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const updateLocalTransaction = (t: Transaction) => {
        setTransactions(prev => prev.map(item => item.id === t.id ? t : item));
    };

    const deleteLocalTransaction = (id: string) => {
        setTransactions(prev => prev.filter(item => item.id !== id));
    };
    
    // NEW: Bulk delete function
    const deleteLocalTransactions = (ids: string[]) => {
        setTransactions(prev => prev.filter(item => !ids.includes(item.id)));
    };

    // Category Local Helpers
    const addLocalCategory = (c: Category) => {
        if (c.isTaxDeductible !== undefined) setLocalTaxOverride(c.id, c.isTaxDeductible);
        setCategories(prev => [...prev, c]);
    };

    const updateLocalCategory = (c: Category) => {
        if (c.isTaxDeductible !== undefined) setLocalTaxOverride(c.id, c.isTaxDeductible);
        setCategories(prev => prev.map(item => item.id === c.id ? c : item));
    };

    const deleteLocalCategory = (id: string) => {
        setCategories(prev => prev.filter(item => item.id !== id));
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, loading, refreshData: fetchData, 
            reportFilter, setReportFilter,
            addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions,
            addLocalCategory, updateLocalCategory, deleteLocalCategory
        }}>
            {children}
        </DataContext.Provider>
    );
};
