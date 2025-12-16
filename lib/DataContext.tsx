
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Category, Truck, BankAccount, TransactionType, BusinessEntity, FiscalYearRecord } from '../types';
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
    businessEntities: BusinessEntity[];
    fiscalYearRecords: FiscalYearRecord[];
    
    loading: boolean;
    refreshData: () => Promise<void>;
    
    reportFilter: ReportFilter | null;
    setReportFilter: (filter: ReportFilter | null) => void;

    // CRUD Methods
    addLocalTransaction: (t: Transaction) => void;
    updateLocalTransaction: (t: Transaction) => void;
    deleteLocalTransaction: (id: string) => void;
    deleteLocalTransactions: (ids: string[]) => void;

    addLocalCategory: (c: Category) => void;
    addLocalCategories: (c: Category[]) => void;
    updateLocalCategory: (c: Category) => void;
    deleteLocalCategory: (id: string) => void;

    addLocalTruck: (t: Truck) => void;
    updateLocalTruck: (t: Truck) => void;
    deleteLocalTruck: (id: string) => void;

    addLocalAccount: (a: BankAccount) => void;
    updateLocalAccount: (a: BankAccount) => void;
    deleteLocalAccount: (id: string) => void;

    // Entities (Now Syncs with Supabase)
    addLocalEntity: (e: BusinessEntity) => Promise<void>;
    updateLocalEntity: (e: BusinessEntity) => Promise<void>;
    deleteLocalEntity: (id: string) => Promise<void>;

    updateLocalFiscalYear: (record: FiscalYearRecord) => void;
    
    // System Settings
    saveSystemSetting: (key: string, value: string) => Promise<void>;
}

const DataContext = createContext<DataContextType>({
    transactions: [],
    categories: [],
    trucks: [],
    accounts: [],
    businessEntities: [],
    fiscalYearRecords: [],
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
    addLocalAccount: () => {},
    updateLocalAccount: () => {},
    deleteLocalAccount: () => {},
    addLocalEntity: async () => {},
    updateLocalEntity: async () => {},
    deleteLocalEntity: async () => {},
    updateLocalFiscalYear: () => {},
    saveSystemSetting: async () => {},
});

export const useData = () => useContext(DataContext);

// --- Local Storage Keys ---
const KEYS = {
    TRANSACTIONS: 'local_transactions',
    CATEGORIES: 'local_categories',
    TRUCKS: 'local_trucks',
    ACCOUNTS: 'local_accounts',
    ENTITIES: 'business_entities_local',
    FISCAL_YEARS: 'local_fiscal_years'
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
    const [fiscalYearRecords, setFiscalYearRecords] = useState<FiscalYearRecord[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);

    // --- Persistence Helpers ---
    const loadLocal = <T,>(key: string, defaultData: T): T => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultData;
        } catch { return defaultData; }
    };

    const saveLocal = (key: string, data: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { console.error("Save failed", e); }
    };

    // --- Fetch Data ---
    const fetchData = async () => {
        setLoading(true);

        // Always load Fiscal Years locally for now (Mock DB features)
        const localFiscalYears = loadLocal(KEYS.FISCAL_YEARS, []);
        setFiscalYearRecords(localFiscalYears);

        if (!isSupabaseConfigured || !supabase) {
            console.log("Using Local/Mock Data (Demo Mode)");
            
            // Load Entities from LocalStorage
            const localEntities = loadLocal(KEYS.ENTITIES, mockEntities);
            setBusinessEntities(localEntities);

            const localTrans = loadLocal(KEYS.TRANSACTIONS, mockTransactions);
            setTransactions(localTrans);

            const localCats = loadLocal(KEYS.CATEGORIES, allCategories);
            setCategories(localCats);

            const localTrucks = loadLocal(KEYS.TRUCKS, mockTrucks);
            setTrucks(localTrucks);

            const localAccounts = loadLocal(KEYS.ACCOUNTS, mockAccounts);
            // Ensure accounts are linked to at least the first entity if link is missing
            const safeAccounts = localAccounts.map((a: BankAccount) => ({
                ...a,
                businessEntityId: a.businessEntityId || (localEntities.length > 0 ? localEntities[0].id : undefined)
            }));
            setAccounts(safeAccounts);

            setLoading(false);
            return;
        }

        // --- Supabase Loading ---
        try {
            // Parallel Fetch
            const [catRes, truckRes, accRes, entRes, settingRes] = await Promise.all([
                supabase.from('categories').select('*'),
                supabase.from('trucks').select('*'),
                supabase.from('accounts').select('*'),
                supabase.from('business_entities').select('*'),
                supabase.from('app_settings').select('*')
            ]);

            // Sync Settings to LocalStorage (for AuthContext usage)
            if (settingRes.data) {
                settingRes.data.forEach((setting: any) => {
                    localStorage.setItem(setting.key, setting.value);
                });
            }

            // Entities
            if (entRes.data && entRes.data.length > 0) {
                const mappedEntities = entRes.data.map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    structure: e.structure,
                    taxForm: e.tax_form,
                    ein: e.ein
                }));
                setBusinessEntities(mappedEntities);
                // Fallback for accounts needing an entity ID
                const defaultEntityId = mappedEntities[0].id;
            } else {
                setBusinessEntities(mockEntities); // Fallback if DB empty
            }

            // Categories
            if (catRes.data) {
                const mappedCats = catRes.data.map((c: any) => ({
                    ...c,
                    type: c.type as TransactionType,
                    isTaxDeductible: c.is_tax_deductible !== undefined ? c.is_tax_deductible : (c.type === 'Expense')
                }));
                setCategories(mappedCats);
            }

            // Trucks
            if (truckRes.data) {
                setTrucks(truckRes.data.map((t: any) => ({ ...t, unitNumber: t.unit_number })));
            }

            // Accounts
            if (accRes.data) {
                setAccounts(accRes.data.map((a: any) => ({ 
                    ...a, 
                    initialBalance: a.initial_balance,
                    businessEntityId: a.business_entity_id 
                })));
            }

            // Transactions
            const { data: transData, error } = await supabase
                .from('transactions')
                .select(`*, categories:category_id(*), trucks:truck_id(*)`)
                .order('date', { ascending: false });

            if (error) throw error;

            if (transData) {
                const formatted: Transaction[] = transData.map((t: any) => ({
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
                        isTaxDeductible: t.categories.is_tax_deductible
                    } : undefined,
                    truck: t.trucks ? {
                        id: t.trucks.id,
                        unitNumber: t.trucks.unit_number,
                        make: t.trucks.make,
                        model: t.trucks.model,
                        year: t.trucks.year
                    } : undefined
                }));
                setTransactions(formatted);
            }

        } catch (error) {
            console.error("Supabase Load Error", error);
            // Fallback to local
            setTransactions(mockTransactions);
            setCategories(allCategories);
        } finally {
            setLoading(false);
        }
    };

    // --- Updaters with Persistence ---

    const saveSystemSetting = async (key: string, value: string) => {
        // 1. Local
        localStorage.setItem(key, value);
        
        // 2. Supabase
        if (isSupabaseConfigured && supabase) {
            try {
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ key, value }, { onConflict: 'key' });
                
                if (error) throw error;
            } catch (e) {
                console.error("Failed to save setting to Supabase:", e);
                // Don't alert user, soft fail to local storage is fine for settings
            }
        }
    };

    // Transactions
    const addLocalTransaction = (t: Transaction) => {
        const newData = [t, ...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(newData);
        saveLocal(KEYS.TRANSACTIONS, newData);
    };
    const updateLocalTransaction = (t: Transaction) => {
        const newData = transactions.map(item => item.id === t.id ? t : item);
        setTransactions(newData);
        saveLocal(KEYS.TRANSACTIONS, newData);
    };
    const deleteLocalTransaction = (id: string) => {
        const newData = transactions.filter(item => item.id !== id);
        setTransactions(newData);
        saveLocal(KEYS.TRANSACTIONS, newData);
    };
    const deleteLocalTransactions = (ids: string[]) => {
        const newData = transactions.filter(item => !ids.includes(item.id));
        setTransactions(newData);
        saveLocal(KEYS.TRANSACTIONS, newData);
    };

    // Categories
    const addLocalCategory = (c: Category) => {
        const newData = [...categories, c];
        setCategories(newData);
        saveLocal(KEYS.CATEGORIES, newData);
    };
    const addLocalCategories = (cList: Category[]) => {
        const newData = [...categories, ...cList];
        setCategories(newData);
        saveLocal(KEYS.CATEGORIES, newData);
    };
    const updateLocalCategory = (c: Category) => {
        const newData = categories.map(item => item.id === c.id ? c : item);
        setCategories(newData);
        saveLocal(KEYS.CATEGORIES, newData);
    };
    const deleteLocalCategory = (id: string) => {
        const newData = categories.filter(item => item.id !== id);
        setCategories(newData);
        saveLocal(KEYS.CATEGORIES, newData);
    };

    // Trucks
    const addLocalTruck = (t: Truck) => {
        const newData = [...trucks, t];
        setTrucks(newData);
        saveLocal(KEYS.TRUCKS, newData);
    };
    const updateLocalTruck = (t: Truck) => {
        const newData = trucks.map(item => item.id === t.id ? t : item);
        setTrucks(newData);
        saveLocal(KEYS.TRUCKS, newData);
    };
    const deleteLocalTruck = (id: string) => {
        const newData = trucks.filter(item => item.id !== id);
        setTrucks(newData);
        saveLocal(KEYS.TRUCKS, newData);
    };

    // Accounts
    const addLocalAccount = (a: BankAccount) => {
        const newData = [...accounts, a];
        setAccounts(newData);
        saveLocal(KEYS.ACCOUNTS, newData);
    };
    const updateLocalAccount = (a: BankAccount) => {
        const newData = accounts.map(item => item.id === a.id ? a : item);
        setAccounts(newData);
        saveLocal(KEYS.ACCOUNTS, newData);
    };
    const deleteLocalAccount = (id: string) => {
        const newData = accounts.filter(item => item.id !== id);
        setAccounts(newData);
        saveLocal(KEYS.ACCOUNTS, newData);
    };

    // Entities (Updated to use Supabase)
    const addLocalEntity = async (e: BusinessEntity) => {
        // Optimistic Update
        const newData = [...businessEntities, e];
        setBusinessEntities(newData);
        saveLocal(KEYS.ENTITIES, newData);

        if (isSupabaseConfigured && supabase) {
            try {
                await supabase.from('business_entities').insert({
                    id: e.id,
                    name: e.name,
                    structure: e.structure,
                    tax_form: e.taxForm,
                    ein: e.ein
                });
            } catch (err) { console.error("DB Save Entity Error", err); }
        }
    };

    const updateLocalEntity = async (e: BusinessEntity) => {
        const newData = businessEntities.map(item => item.id === e.id ? e : item);
        setBusinessEntities(newData);
        saveLocal(KEYS.ENTITIES, newData);

        if (isSupabaseConfigured && supabase) {
            try {
                await supabase.from('business_entities').update({
                    name: e.name,
                    structure: e.structure,
                    tax_form: e.taxForm,
                    ein: e.ein
                }).eq('id', e.id);
            } catch (err) { console.error("DB Update Entity Error", err); }
        }
    };

    const deleteLocalEntity = async (id: string) => {
        const newData = businessEntities.filter(item => item.id !== id);
        setBusinessEntities(newData);
        saveLocal(KEYS.ENTITIES, newData);

        if (isSupabaseConfigured && supabase) {
            try {
                await supabase.from('business_entities').delete().eq('id', id);
            } catch (err) { console.error("DB Delete Entity Error", err); }
        }
    };

    // Fiscal Years
    const updateLocalFiscalYear = (record: FiscalYearRecord) => {
        // Remove existing for this year if any, then add new
        const others = fiscalYearRecords.filter(r => r.year !== record.year);
        const newData = [...others, record];
        setFiscalYearRecords(newData);
        saveLocal(KEYS.FISCAL_YEARS, newData);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, fiscalYearRecords, loading, 
            refreshData: fetchData, reportFilter, setReportFilter,
            
            addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions,
            addLocalCategory, addLocalCategories, updateLocalCategory, deleteLocalCategory,
            addLocalTruck, updateLocalTruck, deleteLocalTruck,
            addLocalAccount, updateLocalAccount, deleteLocalAccount,
            addLocalEntity, updateLocalEntity, deleteLocalEntity,
            updateLocalFiscalYear,
            saveSystemSetting
        }}>
            {children}
        </DataContext.Provider>
    );
};
