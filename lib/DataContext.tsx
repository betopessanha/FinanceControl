
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
    loading: boolean;
    refreshData: () => Promise<void>;
    reportFilter: ReportFilter | null;
    setReportFilter: (filter: ReportFilter | null) => void;
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
    addLocalEntity: (e: BusinessEntity) => Promise<void>;
    updateLocalEntity: (e: BusinessEntity) => Promise<void>;
    deleteLocalEntity: (id: string) => Promise<void>;
    updateLocalFiscalYear: (record: FiscalYearRecord) => void;
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

    const fetchData = async () => {
        setLoading(true);
        const localFiscalYears = loadLocal(KEYS.FISCAL_YEARS, []);
        setFiscalYearRecords(localFiscalYears);

        if (!isSupabaseConfigured || !supabase) {
            const localEntities = loadLocal(KEYS.ENTITIES, mockEntities);
            setBusinessEntities(localEntities);
            setTransactions(loadLocal(KEYS.TRANSACTIONS, mockTransactions));
            setCategories(loadLocal(KEYS.CATEGORIES, allCategories));
            setTrucks(loadLocal(KEYS.TRUCKS, mockTrucks));
            setAccounts(loadLocal(KEYS.ACCOUNTS, mockAccounts));
            setLoading(false);
            return;
        }

        try {
            const [catRes, truckRes, accRes, entRes, settingRes] = await Promise.all([
                supabase.from('categories').select('*'),
                supabase.from('trucks').select('*'),
                supabase.from('accounts').select('*'),
                supabase.from('business_entities').select('*'),
                supabase.from('app_settings').select('*')
            ]);

            if (entRes.data) {
                const mappedEntities = entRes.data.map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    structure: e.structure,
                    taxForm: e.tax_form,
                    ein: e.ein,
                    email: e.email,
                    phone: e.phone,
                    website: e.website,
                    address: e.address,
                    city: e.city,
                    state: e.state,
                    zip: e.zip,
                    logoUrl: e.logo_url
                }));
                setBusinessEntities(mappedEntities);
            }

            if (catRes.data) {
                setCategories(catRes.data.map((c: any) => ({
                    ...c,
                    type: c.type as TransactionType,
                    isTaxDeductible: c.is_tax_deductible
                })));
            }

            if (truckRes.data) {
                setTrucks(truckRes.data.map((t: any) => ({ ...t, unitNumber: t.unit_number })));
            }

            if (accRes.data) {
                setAccounts(accRes.data.map((a: any) => ({ 
                    ...a, 
                    initialBalance: a.initial_balance,
                    businessEntityId: a.business_entity_id 
                })));
            }

            const { data: transData } = await supabase.from('transactions').select(`*, categories:category_id(*), trucks:truck_id(*)`).order('date', { ascending: false });
            if (transData) {
                setTransactions(transData.map((t: any) => ({
                    id: t.id,
                    date: t.date,
                    description: t.description,
                    amount: t.amount,
                    type: t.type as TransactionType,
                    accountId: t.account_id,
                    toAccountId: t.to_account_id,
                    receipts: t.receipts || [],
                    category: t.categories ? { id: t.categories.id, name: t.categories.name, type: t.categories.type as TransactionType, isTaxDeductible: t.categories.is_tax_deductible } : undefined,
                    truck: t.trucks ? { id: t.trucks.id, unitNumber: t.trucks.unit_number, make: t.trucks.make, model: t.trucks.model, year: t.trucks.year } : undefined
                })));
            }
        } catch (error) {
            console.error("Supabase Load Error", error);
        } finally {
            setLoading(false);
        }
    };

    const addLocalEntity = async (e: BusinessEntity) => {
        setBusinessEntities(prev => {
            const next = [...prev, e];
            saveLocal(KEYS.ENTITIES, next);
            return next;
        });

        if (isSupabaseConfigured && supabase) {
            try {
                await supabase.from('business_entities').insert([{
                    id: e.id,
                    name: e.name,
                    structure: e.structure,
                    tax_form: e.taxForm,
                    ein: e.ein,
                    email: e.email,
                    phone: e.phone,
                    website: e.website,
                    address: e.address,
                    city: e.city,
                    state: e.state,
                    zip: e.zip,
                    logo_url: e.logoUrl
                }]);
            } catch (err) { console.error(err); }
        }
    };

    const updateLocalEntity = async (e: BusinessEntity) => {
        setBusinessEntities(prev => {
            const next = prev.map(item => item.id === e.id ? e : item);
            saveLocal(KEYS.ENTITIES, next);
            return next;
        });

        if (isSupabaseConfigured && supabase) {
            try {
                await supabase.from('business_entities').update({
                    name: e.name,
                    structure: e.structure,
                    tax_form: e.taxForm,
                    ein: e.ein,
                    email: e.email,
                    phone: e.phone,
                    website: e.website,
                    address: e.address,
                    city: e.city,
                    state: e.state,
                    zip: e.zip,
                    logo_url: e.logoUrl
                }).eq('id', e.id);
            } catch (err) { console.error(err); }
        }
    };

    const deleteLocalEntity = async (id: string) => {
        setBusinessEntities(prev => {
            const next = prev.filter(item => item.id !== id);
            saveLocal(KEYS.ENTITIES, next);
            return next;
        });
        if (isSupabaseConfigured && supabase) {
            try { await supabase.from('business_entities').delete().eq('id', id); } catch (err) { console.error(err); }
        }
    };

    // Keep other local CRUD methods as functional updates...
    const addLocalTransaction = (t: Transaction) => setTransactions(prev => { const next = [t, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); saveLocal(KEYS.TRANSACTIONS, next); return next; });
    const updateLocalTransaction = (t: Transaction) => setTransactions(prev => { const next = prev.map(item => item.id === t.id ? t : item); saveLocal(KEYS.TRANSACTIONS, next); return next; });
    const deleteLocalTransaction = (id: string) => setTransactions(prev => { const next = prev.filter(item => item.id !== id); saveLocal(KEYS.TRANSACTIONS, next); return next; });
    const deleteLocalTransactions = (ids: string[]) => setTransactions(prev => { const next = prev.filter(item => !ids.includes(item.id)); saveLocal(KEYS.TRANSACTIONS, next); return next; });
    const addLocalCategory = (c: Category) => setCategories(prev => { const next = [...prev, c]; saveLocal(KEYS.CATEGORIES, next); return next; });
    const addLocalCategories = (cList: Category[]) => setCategories(prev => { const next = [...prev, ...cList]; saveLocal(KEYS.CATEGORIES, next); return next; });
    const updateLocalCategory = (c: Category) => setCategories(prev => { const next = prev.map(item => item.id === c.id ? c : item); saveLocal(KEYS.CATEGORIES, next); return next; });
    const deleteLocalCategory = (id: string) => setCategories(prev => { const next = prev.filter(item => item.id !== id); saveLocal(KEYS.CATEGORIES, next); return next; });
    const addLocalTruck = (t: Truck) => setTrucks(prev => { const next = [...prev, t]; saveLocal(KEYS.TRUCKS, next); return next; });
    const updateLocalTruck = (t: Truck) => setTrucks(prev => { const next = prev.map(item => item.id === t.id ? t : item); saveLocal(KEYS.TRUCKS, next); return next; });
    const deleteLocalTruck = (id: string) => setTrucks(prev => { const next = prev.filter(item => item.id !== id); saveLocal(KEYS.TRUCKS, next); return next; });
    const addLocalAccount = (a: BankAccount) => setAccounts(prev => { const next = [...prev, a]; saveLocal(KEYS.ACCOUNTS, next); return next; });
    const updateLocalAccount = (a: BankAccount) => setAccounts(prev => { const next = prev.map(item => item.id === a.id ? a : item); saveLocal(KEYS.ACCOUNTS, next); return next; });
    const deleteLocalAccount = (id: string) => setAccounts(prev => { const next = prev.filter(item => item.id !== id); saveLocal(KEYS.ACCOUNTS, next); return next; });
    const updateLocalFiscalYear = (record: FiscalYearRecord) => setFiscalYearRecords(prev => { const others = prev.filter(r => r.year !== record.year); const next = [...others, record]; saveLocal(KEYS.FISCAL_YEARS, next); return next; });
    const saveSystemSetting = async (key: string, value: string) => { localStorage.setItem(key, value); if (isSupabaseConfigured && supabase) { try { await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' }); } catch (e) { console.error(e); } } };

    useEffect(() => { fetchData(); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, fiscalYearRecords, loading, refreshData: fetchData, reportFilter, setReportFilter,
            addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions, addLocalCategory, addLocalCategories, updateLocalCategory, deleteLocalCategory,
            addLocalTruck, updateLocalTruck, deleteLocalTruck, addLocalAccount, updateLocalAccount, deleteLocalAccount, addLocalEntity, updateLocalEntity, deleteLocalEntity, updateLocalFiscalYear, saveSystemSetting
        }}>{children}</DataContext.Provider>
    );
};
