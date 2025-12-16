
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Category, Truck, BankAccount, TransactionType, BusinessEntity } from '../types';
import { mockTransactions, allCategories, trucks as mockTrucks, accounts as mockAccounts, businessEntities as mockEntities } from './mockData';
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
    businessEntities: BusinessEntity[]; // New
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

    // Methods for Categories
    addLocalCategory: (c: Category) => void;
    addLocalCategories: (c: Category[]) => void; // NEW: Bulk add support
    updateLocalCategory: (c: Category) => void;
    deleteLocalCategory: (id: string) => void;

    // Methods for Trucks
    addLocalTruck: (t: Truck) => void;
    updateLocalTruck: (t: Truck) => void;
    deleteLocalTruck: (id: string) => void;

    // Methods for Business Entities
    addLocalEntity: (e: BusinessEntity) => void;
    updateLocalEntity: (e: BusinessEntity) => void;
    deleteLocalEntity: (id: string) => void;
}

const DataContext = createContext<DataContextType>({
    transactions: [],
    categories: [],
    trucks: [],
    accounts: [],
    businessEntities: [],
    loading: true,
    refreshData: async () => {},
    reportFilter: null,
    setReportFilter: () => {},
    addLocalTransaction: () => {},
    updateLocalTransaction: () => {},
    deleteLocalTransaction: () => {},
    deleteLocalTransactions: () => {},
    addLocalCategory: () => {},
    addLocalCategories: () => {}, 
    updateLocalCategory: () => {},
    deleteLocalCategory: () => {},
    addLocalTruck: () => {},
    updateLocalTruck: () => {},
    deleteLocalTruck: () => {},
    addLocalEntity: () => {},
    updateLocalEntity: () => {},
    deleteLocalEntity: () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);

    // --- Local Storage Helpers for Tax Settings (Hybrid Persistence) ---
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

    // --- Local Storage Helpers for Business Entities (Simulate DB) ---
    const getStoredEntities = (): BusinessEntity[] => {
        try {
            const stored = localStorage.getItem('business_entities_local');
            return stored ? JSON.parse(stored) : mockEntities;
        } catch { return mockEntities; }
    }

    const saveStoredEntities = (entities: BusinessEntity[]) => {
        localStorage.setItem('business_entities_local', JSON.stringify(entities));
    }
    // ------------------------------------------------------------------

    const fetchData = async () => {
        setLoading(true);
        
        // Load Entities Local First (Mock DB behavior for this feature)
        const entities = getStoredEntities();
        setBusinessEntities(entities);

        if (!isSupabaseConfigured || !supabase) {
            console.warn("Supabase not configured. Using Mock Data.");
            setTransactions(mockTransactions);
            if (categories.length === 0) setCategories(allCategories);
            if (trucks.length === 0) setTrucks(mockTrucks);
            // Link mock accounts to the first entity if available and not set
            const accountsWithEntity = mockAccounts.map(a => ({
                ...a,
                businessEntityId: a.businessEntityId || (entities.length > 0 ? entities[0].id : undefined)
            }));
            setAccounts(accountsWithEntity);
            setLoading(false);
            return;
        }

        try {
            // 1. Fetch Static Data
            const { data: catData, error: catError } = await supabase.from('categories').select('*');
            if (catError) throw catError;

            const { data: truckData, error: truckError } = await supabase.from('trucks').select('*');
            if (truckError) throw truckError;

            const { data: accData, error: accError } = await supabase.from('accounts').select('*');
            if (accError) throw accError;

            if (catData) setCategories(catData.map((c: any) => {
                const localVal = getLocalTaxOverride(c.id);
                const dbVal = c.is_tax_deductible;
                let finalVal = true;
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
            if (accData) setAccounts(accData.map((a: any) => ({ 
                ...a, 
                initialBalance: a.initial_balance,
                businessEntityId: a.business_entity_id // Map DB column to type
            })));

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

        } catch (error: any) {
            console.error("Error fetching data from Supabase:", error);
            
            // Fallback
            if (categories.length === 0) setCategories(allCategories);
            if (trucks.length === 0) setTrucks(mockTrucks);
            if (transactions.length === 0) setTransactions(mockTransactions);
            if (accounts.length === 0) setAccounts(mockAccounts);
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const addLocalTransaction = (t: Transaction) => {
        setTransactions(prev => [t, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const updateLocalTransaction = (t: Transaction) => {
        setTransactions(prev => prev.map(item => item.id === t.id ? t : item));
    };

    const deleteLocalTransaction = (id: string) => {
        setTransactions(prev => prev.filter(item => item.id !== id));
    };
    
    const deleteLocalTransactions = (ids: string[]) => {
        setTransactions(prev => prev.filter(item => !ids.includes(item.id)));
    };

    const addLocalCategory = (c: Category) => {
        if (c.isTaxDeductible !== undefined) setLocalTaxOverride(c.id, c.isTaxDeductible);
        setCategories(prev => [...prev, c]);
    };

    const addLocalCategories = (newCategories: Category[]) => {
        newCategories.forEach(c => {
            if (c.isTaxDeductible !== undefined) setLocalTaxOverride(c.id, c.isTaxDeductible);
        });
        setCategories(prev => [...prev, ...newCategories]);
    };

    const updateLocalCategory = (c: Category) => {
        if (c.isTaxDeductible !== undefined) setLocalTaxOverride(c.id, c.isTaxDeductible);
        setCategories(prev => prev.map(item => item.id === c.id ? c : item));
    };

    const deleteLocalCategory = (id: string) => {
        setCategories(prev => prev.filter(item => item.id !== id));
    };

    const addLocalTruck = (t: Truck) => {
        setTrucks(prev => [...prev, t]);
    };

    const updateLocalTruck = (t: Truck) => {
        setTrucks(prev => prev.map(item => item.id === t.id ? t : item));
    };

    const deleteLocalTruck = (id: string) => {
        setTrucks(prev => prev.filter(item => item.id !== id));
    };

    // --- Entity Helpers (Local Persistence only for now) ---
    const addLocalEntity = (e: BusinessEntity) => {
        const updated = [...businessEntities, e];
        setBusinessEntities(updated);
        saveStoredEntities(updated);
    };

    const updateLocalEntity = (e: BusinessEntity) => {
        const updated = businessEntities.map(item => item.id === e.id ? e : item);
        setBusinessEntities(updated);
        saveStoredEntities(updated);
    };

    const deleteLocalEntity = (id: string) => {
        const updated = businessEntities.filter(item => item.id !== id);
        setBusinessEntities(updated);
        saveStoredEntities(updated);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, loading, refreshData: fetchData, 
            reportFilter, setReportFilter,
            addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions,
            addLocalCategory, addLocalCategories, updateLocalCategory, deleteLocalCategory,
            addLocalTruck, updateLocalTruck, deleteLocalTruck,
            addLocalEntity, updateLocalEntity, deleteLocalEntity
        }}>
            {children}
        </DataContext.Provider>
    );
};
