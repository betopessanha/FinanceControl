
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Category, Truck, BankAccount, TransactionType, BusinessEntity, FiscalYearRecord } from '../types';
import { mockTransactions, allCategories, trucks as mockTrucks, accounts as mockAccounts, businessEntities as mockEntities } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ReportFilter {
    year: string;
    categoryNames: string[];
    sourceReport: string;
}

interface DataContextType {
    transactions: Transaction[];
    categories: Category[];
    trucks: Truck[];
    accounts: BankAccount[];
    businessEntities: BusinessEntity[];
    fiscalYearRecords: FiscalYearRecord[];
    reportFilter: ReportFilter | null;
    loading: boolean;
    isCloudConnected: boolean;
    setReportFilter: (filter: ReportFilter | null) => void;
    refreshData: () => Promise<void>;
    addLocalEntity: (e: BusinessEntity) => Promise<boolean>;
    updateLocalEntity: (e: BusinessEntity) => Promise<boolean>;
    deleteLocalEntity: (id: string) => Promise<void>;
    addLocalAccount: (a: BankAccount) => Promise<boolean>;
    updateLocalAccount: (a: BankAccount) => Promise<boolean>;
    deleteLocalAccount: (id: string) => Promise<void>;
    addLocalTransaction: (t: Transaction) => Promise<boolean>;
    updateLocalTransaction: (t: Transaction) => Promise<boolean>;
    deleteLocalTransaction: (id: string) => Promise<void>;
    deleteLocalTransactions: (ids: string[]) => Promise<void>;
    addLocalTruck: (t: Truck) => Promise<boolean>;
    updateLocalTruck: (t: Truck) => Promise<boolean>;
    deleteLocalTruck: (id: string) => Promise<void>;
    addLocalCategory: (c: Category) => Promise<boolean>;
    addLocalCategories: (cList: Category[]) => Promise<void>;
    updateLocalCategory: (c: Category) => Promise<boolean>;
    deleteLocalCategory: (id: string) => Promise<void>;
    updateLocalFiscalYear: (record: FiscalYearRecord) => Promise<boolean>;
    saveSystemSetting: (key: string, value: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

const STORAGE_KEYS = {
    ENTITIES: 'app_data_entities',
    ACCOUNTS: 'app_data_accounts',
    TRANSACTIONS: 'app_data_transactions',
    TRUCKS: 'app_data_trucks',
    CATEGORIES: 'app_data_categories',
    FISCAL: 'app_data_fiscal'
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
    const [fiscalYearRecords, setFiscalYearRecords] = useState<FiscalYearRecord[]>([]);
    const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);
    const [loading, setLoading] = useState(true);

    const saveToLocal = (key: string, data: any) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const loadFromLocal = (key: string, fallback: any) => {
        const stored = localStorage.getItem(key);
        if (stored && stored !== '[]') {
            try { return JSON.parse(stored); } catch (e) { return fallback; }
        }
        return fallback;
    };

    const fetchData = async () => {
        setLoading(true);
        
        // Load initial local data
        const localEntities = loadFromLocal(STORAGE_KEYS.ENTITIES, mockEntities);
        const localAccounts = loadFromLocal(STORAGE_KEYS.ACCOUNTS, mockAccounts);
        const localTrans = loadFromLocal(STORAGE_KEYS.TRANSACTIONS, mockTransactions);
        const localTrucks = loadFromLocal(STORAGE_KEYS.TRUCKS, mockTrucks);
        const localCats = loadFromLocal(STORAGE_KEYS.CATEGORIES, allCategories);
        const localFiscal = loadFromLocal(STORAGE_KEYS.FISCAL, []);

        setBusinessEntities(localEntities);
        setAccounts(localAccounts);
        setTransactions(localTrans);
        setTrucks(localTrucks);
        setCategories(localCats);
        setFiscalYearRecords(localFiscal);

        if (isSupabaseConfigured && supabase) {
            try {
                const [entRes, accRes, catRes, truckRes, transRes] = await Promise.all([
                    supabase.from('business_entities').select('*'),
                    supabase.from('accounts').select('*'),
                    supabase.from('categories').select('*'),
                    supabase.from('trucks').select('*'),
                    supabase.from('transactions').select('*').order('date', { ascending: false })
                ]);

                // Update state with cloud data if successful
                let finalCats = localCats;
                if (catRes.data && catRes.data.length > 0) {
                    finalCats = catRes.data.map((c: any) => ({
                        id: String(c.id), name: c.name, type: c.type, isTaxDeductible: c.is_tax_deductible
                    }));
                    setCategories(finalCats);
                    saveToLocal(STORAGE_KEYS.CATEGORIES, finalCats);
                }

                let finalTrucks = localTrucks;
                if (truckRes.data && truckRes.data.length > 0) {
                    finalTrucks = truckRes.data.map((v: any) => ({
                        id: String(v.id), unitNumber: v.unit_number, make: v.make, model: v.model, year: v.year
                    }));
                    setTrucks(finalTrucks);
                    saveToLocal(STORAGE_KEYS.TRUCKS, finalTrucks);
                }

                if (entRes.data && entRes.data.length > 0) {
                    const mapped = entRes.data.map((e: any) => ({
                        id: String(e.id), name: e.name, structure: e.structure, taxForm: e.tax_form, ein: e.ein
                    }));
                    setBusinessEntities(mapped);
                    saveToLocal(STORAGE_KEYS.ENTITIES, mapped);
                }

                if (accRes.data && accRes.data.length > 0) {
                    const mapped = accRes.data.map((a: any) => ({ 
                        id: String(a.id), name: a.name, type: a.type, initialBalance: a.initial_balance, businessEntityId: a.business_entity_id ? String(a.business_entity_id) : undefined
                    }));
                    setAccounts(mapped);
                    saveToLocal(STORAGE_KEYS.ACCOUNTS, mapped);
                }

                if (transRes.data && transRes.data.length > 0) {
                     const mapped = transRes.data.map((t: any) => ({
                        id: String(t.id), date: t.date, description: t.description, amount: t.amount, type: t.type,
                        accountId: String(t.account_id), toAccountId: t.to_account_id ? String(t.to_account_id) : undefined,
                        category: finalCats.find((c: any) => String(c.id) === String(t.category_id)),
                        truck: finalTrucks.find((v: any) => String(v.id) === String(t.truck_id)),
                        receipts: t.receipts || []
                    }));
                    setTransactions(mapped);
                    saveToLocal(STORAGE_KEYS.TRANSACTIONS, mapped);
                }
            } catch (error) {
                console.error("Cloud connection failed. Using offline data.", error);
            }
        }
        setLoading(false);
    };

    const addLocalEntity = async (e: BusinessEntity) => {
        const updated = [...businessEntities, e];
        setBusinessEntities(updated);
        saveToLocal(STORAGE_KEYS.ENTITIES, updated);
        if (isSupabaseConfigured && supabase) {
            await supabase.from('business_entities').upsert([{
                id: e.id, name: e.name, structure: e.structure, tax_form: e.taxForm, ein: e.ein
            }]);
        }
        return true;
    };

    const addLocalAccount = async (a: BankAccount) => {
        const updated = [...accounts, a];
        setAccounts(updated);
        saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
        if (isSupabaseConfigured && supabase) {
            await supabase.from('accounts').upsert([{
                id: a.id, name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId || null
            }]);
        }
        return true;
    };

    const updateLocalAccount = async (a: BankAccount) => {
        const updated = accounts.map(item => item.id === a.id ? a : item);
        setAccounts(updated);
        saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
        if (isSupabaseConfigured && supabase) {
            await supabase.from('accounts').update({
                name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId || null
            }).eq('id', a.id);
        }
        return true;
    };

    const addLocalTransaction = async (t: Transaction) => {
        const updated = [t, ...transactions];
        setTransactions(updated);
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
        if (isSupabaseConfigured && supabase) {
            await supabase.from('transactions').insert([{ 
                id: t.id, date: t.date, description: t.description, amount: t.amount, 
                type: t.type, account_id: t.accountId, category_id: t.category?.id || null, receipts: t.receipts 
            }]);
        }
        return true;
    };

    const saveSystemSetting = async (key: string, value: string) => {
        localStorage.setItem(key, value);
        if (isSupabaseConfigured && supabase) {
            await supabase.from('app_settings').upsert({ key, value });
        }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, fiscalYearRecords, 
            reportFilter, loading, isCloudConnected: !!isSupabaseConfigured,
            refreshData: fetchData, setReportFilter,
            addLocalEntity, updateLocalEntity: async (e) => addLocalEntity(e), deleteLocalEntity: async (id) => {
                const updated = businessEntities.filter(item => item.id !== id);
                setBusinessEntities(updated);
                saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                if (isSupabaseConfigured && supabase) await supabase.from('business_entities').delete().eq('id', id);
            },
            addLocalAccount, updateLocalAccount, deleteLocalAccount: async (id) => {
                const updated = accounts.filter(item => item.id !== id);
                setAccounts(updated);
                saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                if (isSupabaseConfigured && supabase) await supabase.from('accounts').delete().eq('id', id);
            },
            addLocalTransaction, updateLocalTransaction: async (t) => {
                const updated = transactions.map(item => item.id === t.id ? t : item);
                setTransactions(updated);
                saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                return true;
            }, deleteLocalTransaction: async (id) => {
                const updated = transactions.filter(item => item.id !== id);
                setTransactions(updated);
                saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
            }, deleteLocalTransactions: async (ids) => {
                const updated = transactions.filter(item => !ids.includes(item.id));
                setTransactions(updated);
                saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
            },
            addLocalTruck: async (t) => {
                const updated = [...trucks, t];
                setTrucks(updated);
                saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                if (isSupabaseConfigured && supabase) await supabase.from('trucks').upsert([{ id: t.id, unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }]);
                return true;
            }, updateLocalTruck: async (t) => {
                const updated = trucks.map(item => item.id === t.id ? t : item);
                setTrucks(updated);
                saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                if (isSupabaseConfigured && supabase) await supabase.from('trucks').update({ unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }).eq('id', t.id);
                return true;
            }, deleteLocalTruck: async (id) => {
                const updated = trucks.filter(item => item.id !== id);
                setTrucks(updated);
                saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                if (isSupabaseConfigured && supabase) await supabase.from('trucks').delete().eq('id', id);
            },
            addLocalCategory: async (c) => {
                const updated = [...categories, c];
                setCategories(updated);
                saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                return true;
            }, addLocalCategories: async (list) => {
                const updated = [...categories, ...list];
                setCategories(updated);
                saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
            }, updateLocalCategory: async (c) => {
                const updated = categories.map(item => item.id === c.id ? c : item);
                setCategories(updated);
                saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                return true;
            }, deleteLocalCategory: async (id) => {
                const updated = categories.filter(item => item.id !== id);
                setCategories(updated);
                saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
            },
            updateLocalFiscalYear: async (rec) => {
                const updated = [...fiscalYearRecords.filter(r => r.year !== rec.year), rec];
                setFiscalYearRecords(updated);
                saveToLocal(STORAGE_KEYS.FISCAL, updated);
                return true;
            }, saveSystemSetting
        }}>{children}</DataContext.Provider>
    );
};
