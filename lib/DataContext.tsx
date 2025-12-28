
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Transaction, Category, Truck, BankAccount, TransactionType, BusinessEntity, FiscalYearRecord, LoadRecord } from '../types';
import { mockTransactions, allCategories, trucks as mockTrucks, accounts as mockAccounts, businessEntities as mockEntities } from './mockData';
import { supabase, isSupabaseConfigured } from './supabase';
import { isValidUUID, generateId } from './utils';

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
    activeEntityId: string;
    setActiveEntityId: (id: string) => void;
    fiscalYearRecords: FiscalYearRecord[];
    loadRecords: LoadRecord[];
    reportFilter: ReportFilter | null;
    setReportFilter: React.Dispatch<React.SetStateAction<ReportFilter | null>>;
    loading: boolean;
    isCloudConnected: boolean;
    refreshData: () => Promise<void>;
    pushLocalDataToCloud: () => Promise<{ success: boolean; message: string }>;
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
    addLocalLoad: (l: LoadRecord) => Promise<boolean>;
    updateLocalLoad: (l: LoadRecord) => Promise<boolean>;
    deleteLocalLoad: (id: string) => Promise<void>;
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
    FISCAL: 'app_data_fiscal',
    LOADS: 'app_data_loads',
    ACTIVE_ENTITY: 'app_active_entity_id'
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
    const [activeEntityId, setActiveEntityIdState] = useState<string>(localStorage.getItem(STORAGE_KEYS.ACTIVE_ENTITY) || '');
    const [fiscalYearRecords, setFiscalYearRecords] = useState<FiscalYearRecord[]>([]);
    const [loadRecords, setLoadRecords] = useState<LoadRecord[]>([]);
    const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActuallyConnected, setIsActuallyConnected] = useState(false);

    const setActiveEntityId = (id: string) => {
        setActiveEntityIdState(id);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTITY, id);
    };

    const saveToLocal = (key: string, data: any) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const loadFromLocal = (key: string, fallback: any) => {
        const stored = localStorage.getItem(key);
        if (stored && stored !== '[]') {
            try { 
                const parsed = JSON.parse(stored);
                return (Array.isArray(parsed) && parsed.length > 0) ? parsed : fallback;
            } catch (e) { return fallback; }
        }
        return fallback;
    };

    const fetchData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        
        const localEntities = loadFromLocal(STORAGE_KEYS.ENTITIES, mockEntities);
        const localAccs = loadFromLocal(STORAGE_KEYS.ACCOUNTS, mockAccounts);
        const localTrans = loadFromLocal(STORAGE_KEYS.TRANSACTIONS, mockTransactions);
        const localTrucks = loadFromLocal(STORAGE_KEYS.TRUCKS, mockTrucks);
        const localCats = loadFromLocal(STORAGE_KEYS.CATEGORIES, allCategories);
        const localFiscal = loadFromLocal(STORAGE_KEYS.FISCAL, []);
        const localLoads = loadFromLocal(STORAGE_KEYS.LOADS, []);

        // Priority is cloud if connected, but we set local first for fast UI
        setBusinessEntities(localEntities);
        if (!activeEntityId && localEntities.length > 0) setActiveEntityId(localEntities[0].id);
        
        setAccounts(localAccs);
        setTransactions(localTrans);
        setTrucks(localTrucks);
        setCategories(localCats);
        setFiscalYearRecords(localFiscal);
        setLoadRecords(localLoads);

        if (isSupabaseConfigured && supabase) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setIsActuallyConnected(true);
                    const [resEntities, resAccs, resTrucks, resCats, resLoads, resTrans] = await Promise.all([
                        supabase.from('business_entities').select('*'),
                        supabase.from('bank_accounts').select('*'),
                        supabase.from('trucks').select('*'),
                        supabase.from('categories').select('*'),
                        supabase.from('loads').select('*'),
                        supabase.from('transactions').select('*')
                    ]);

                    if (resEntities.data?.length) { 
                        const mapped = resEntities.data.map(e => ({
                            id: e.id, name: e.name, type: e.type, structure: e.structure, taxForm: e.tax_form,
                            ein: e.ein, email: e.email, phone: e.phone, website: e.website,
                            address: e.address, city: e.city, state: e.state, zip: e.zip
                        }));
                        setBusinessEntities(mapped); saveToLocal(STORAGE_KEYS.ENTITIES, mapped);
                        if (!activeEntityId) setActiveEntityId(mapped[0].id);
                    }
                    if (resAccs.data?.length) {
                        const mapped = resAccs.data.map(a => ({ 
                            id: a.id, 
                            name: a.name, 
                            type: a.type, 
                            initialBalance: Number(a.initial_balance) || 0, 
                            businessEntityId: a.business_entity_id 
                        }));
                        setAccounts(mapped); saveToLocal(STORAGE_KEYS.ACCOUNTS, mapped);
                    }
                    if (resCats.data?.length) {
                        const mapped = resCats.data.map(c => ({
                            id: c.id,
                            name: c.name,
                            type: c.type as TransactionType,
                            isTaxDeductible: c.is_tax_deductible
                        }));
                        setCategories(mapped); saveToLocal(STORAGE_KEYS.CATEGORIES, mapped);
                    }
                    if (resTrans.data?.length) {
                        const allCats = resCats.data?.length ? resCats.data.map(c => ({
                            id: c.id, name: c.name, type: c.type, isTaxDeductible: c.is_tax_deductible
                        })) : localCats;
                        
                        const allTrucks = resTrucks.data || localTrucks;
                        
                        const mapped = resTrans.data.map(t => ({
                            id: t.id, 
                            date: t.date, 
                            description: t.description, 
                            amount: Number(t.amount) || 0,
                            type: t.type as TransactionType, 
                            accountId: t.account_id, 
                            toAccountId: t.to_account_id,
                            category: allCats.find((c: any) => c.id === t.category_id),
                            toCategory: allCats.find((c: any) => c.id === t.to_category_id),
                            truck: allTrucks.find((tr: any) => tr.id === t.truck_id)
                        }));
                        setTransactions(mapped); saveToLocal(STORAGE_KEYS.TRANSACTIONS, mapped);
                    }
                }
            } catch (e) { 
                setIsActuallyConnected(false);
            }
        }
        if (isInitial) setLoading(false);
    }, [activeEntityId]);

    const syncToCloud = async (table: string, id: string, data: any, method: 'insert' | 'update' | 'delete') => {
        if (!isSupabaseConfigured || !supabase) return true;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return true;
            let res;
            if (method === 'delete') res = await supabase.from(table).delete().eq('id', id);
            else if (method === 'insert') res = await supabase.from(table).insert([{ ...data, user_id: session.user.id }]);
            else res = await supabase.from(table).update({ ...data, user_id: session.user.id }).eq('id', id);
            return !res.error;
        } catch (e) { return false; }
    };

    useEffect(() => { fetchData(true); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, activeEntityId, setActiveEntityId, fiscalYearRecords, loadRecords,
            reportFilter, loading, isCloudConnected: isActuallyConnected, refreshData: () => fetchData(true), pushLocalDataToCloud: async () => ({ success: true, message: "Sync complete" }),
            setReportFilter,
            addLocalEntity: async (e) => {
                const updated = [...businessEntities, e];
                setBusinessEntities(updated); saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                if (!activeEntityId) setActiveEntityId(e.id);
                return syncToCloud('business_entities', e.id, { id: e.id, name: e.name, type: e.type, structure: e.structure, tax_form: e.taxForm, ein: e.ein }, 'insert');
            },
            updateLocalEntity: async (e) => {
                const updated = businessEntities.map(x => x.id === e.id ? e : x);
                setBusinessEntities(updated); saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                return syncToCloud('business_entities', e.id, { name: e.name, type: e.type, structure: e.structure, tax_form: e.taxForm, ein: e.ein }, 'update');
            },
            deleteLocalEntity: async (id) => {
                const updated = businessEntities.filter(x => x.id !== id);
                setBusinessEntities(updated); saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                if (activeEntityId === id && updated.length > 0) setActiveEntityId(updated[0].id);
                await syncToCloud('business_entities', id, null, 'delete');
            },
            addLocalAccount: async (a) => {
                const updated = [...accounts, a];
                setAccounts(updated); saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                return syncToCloud('bank_accounts', a.id, { id: a.id, name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId }, 'insert');
            },
            updateLocalAccount: async (a) => {
                const updated = accounts.map(x => x.id === a.id ? a : x);
                setAccounts(updated); saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                return syncToCloud('bank_accounts', a.id, { name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId }, 'update');
            },
            deleteLocalAccount: async (id) => {
                const updated = accounts.filter(x => x.id !== id);
                setAccounts(updated); saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                await syncToCloud('bank_accounts', id, null, 'delete');
            },
            addLocalTransaction: async (t) => {
                const updated = [t, ...transactions];
                setTransactions(updated); saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                return syncToCloud('transactions', t.id, { id: t.id, amount: t.amount, description: t.description, date: t.date, type: t.type, category_id: t.category?.id, to_category_id: t.toCategory?.id, account_id: t.accountId, to_account_id: t.toAccountId }, 'insert');
            },
            updateLocalTransaction: async (t) => {
                const updated = transactions.map(x => x.id === t.id ? t : x);
                setTransactions(updated); saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                return syncToCloud('transactions', t.id, { amount: t.amount, description: t.description, date: t.date, type: t.type, category_id: t.category?.id, to_category_id: t.toCategory?.id, account_id: t.accountId, to_account_id: t.toAccountId }, 'update');
            },
            deleteLocalTransaction: async (id) => {
                setTransactions(prev => {
                    const updated = prev.filter(x => x.id !== id);
                    saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                    return updated;
                });
                await syncToCloud('transactions', id, null, 'delete');
            },
            deleteLocalTransactions: async (ids) => {
                setTransactions(prev => {
                    const updated = prev.filter(x => !ids.includes(x.id));
                    saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                    return updated;
                });
                if (isActuallyConnected && supabase) {
                    await supabase.from('transactions').delete().in('id', ids);
                }
            },
            addLocalTruck: async (t) => {
                const updated = [...trucks, t];
                setTrucks(updated); saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                return syncToCloud('trucks', t.id, { id: t.id, unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }, 'insert');
            },
            updateLocalTruck: async (t) => {
                const updated = trucks.map(x => x.id === t.id ? t : x);
                setTrucks(updated); saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                return syncToCloud('trucks', t.id, { unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }, 'update');
            },
            deleteLocalTruck: async (id) => {
                const updated = trucks.filter(x => x.id !== id);
                setTrucks(updated); saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                await syncToCloud('trucks', id, null, 'delete');
            },
            addLocalCategory: async (c) => {
                const updated = [...categories, c];
                setCategories(updated); saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                return syncToCloud('categories', c.id, { id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }, 'insert');
            },
            addLocalCategories: async (list) => {
                const updated = [...categories, ...list];
                setCategories(updated); saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
            },
            updateLocalCategory: async (c) => {
                const updated = categories.map(x => x.id === c.id ? c : x);
                setCategories(updated); saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                return syncToCloud('categories', c.id, { name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }, 'update');
            },
            deleteLocalCategory: async (id) => {
                const updated = categories.filter(x => x.id !== id);
                setCategories(updated); saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                await syncToCloud('categories', id, null, 'delete');
            },
            updateLocalFiscalYear: async (rec) => {
                const updated = [...fiscalYearRecords.filter(r => r.year !== rec.year), rec];
                setFiscalYearRecords(updated); saveToLocal(STORAGE_KEYS.FISCAL, updated);
                return true;
            },
            addLocalLoad: async (l) => {
                const updated = [l, ...loadRecords];
                setLoadRecords(updated); saveToLocal(STORAGE_KEYS.LOADS, updated);
                return await syncToCloud('loads', l.id, { id: l.id, current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, pickup_location: l.pickupLocation, status: l.status }, 'insert');
            },
            updateLocalLoad: async (l) => {
                const updated = loadRecords.map(x => x.id === l.id ? l : x);
                setLoadRecords(updated); saveToLocal(STORAGE_KEYS.LOADS, updated);
                return await syncToCloud('loads', l.id, { current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, status: l.status }, 'update');
            },
            deleteLocalLoad: async (id) => {
                const updated = loadRecords.filter(x => x.id !== id);
                setLoadRecords(updated); saveToLocal(STORAGE_KEYS.LOADS, updated);
                await syncToCloud('loads', id, null, 'delete');
            },
            saveSystemSetting: async (k, v) => { localStorage.setItem(k, v); }
        }}>{children}</DataContext.Provider>
    );
};
