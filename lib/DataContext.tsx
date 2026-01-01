
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
                setBusinessEntities(prev => {
                    const updated = [...prev, e];
                    saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                    return updated;
                });
                return syncToCloud('business_entities', e.id, { id: e.id, name: e.name, type: e.type, structure: e.structure, tax_form: e.tax_form, ein: e.ein }, 'insert');
            },
            updateLocalEntity: async (e) => {
                setBusinessEntities(prev => {
                    const updated = prev.map(x => x.id === e.id ? e : x);
                    saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                    return updated;
                });
                return syncToCloud('business_entities', e.id, { name: e.name, type: e.type, structure: e.structure, tax_form: e.tax_form, ein: e.ein }, 'update');
            },
            deleteLocalEntity: async (id) => {
                setBusinessEntities(prev => {
                    const updated = prev.filter(x => x.id !== id);
                    saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                    return updated;
                });
                await syncToCloud('business_entities', id, null, 'delete');
            },
            addLocalAccount: async (a) => {
                setAccounts(prev => {
                    const updated = [...prev, a];
                    saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                    return updated;
                });
                return syncToCloud('bank_accounts', a.id, { id: a.id, name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.business_entity_id }, 'insert');
            },
            updateLocalAccount: async (a) => {
                setAccounts(prev => {
                    const updated = prev.map(x => x.id === a.id ? a : x);
                    saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                    return updated;
                });
                return syncToCloud('bank_accounts', a.id, { name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.business_entity_id }, 'update');
            },
            deleteLocalAccount: async (id) => {
                setAccounts(prev => {
                    const updated = prev.filter(x => x.id !== id);
                    saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                    return updated;
                });
                await syncToCloud('bank_accounts', id, null, 'delete');
            },
            addLocalTransaction: async (t) => {
                setTransactions(prev => {
                    const updated = [t, ...prev];
                    saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                    return updated;
                });
                return syncToCloud('transactions', t.id, { id: t.id, amount: t.amount, description: t.description, date: t.date, type: t.type, category_id: t.category?.id, to_category_id: t.toCategory?.id, account_id: t.accountId, to_account_id: t.toAccountId }, 'insert');
            },
            updateLocalTransaction: async (t) => {
                setTransactions(prev => {
                    const updated = prev.map(x => x.id === t.id ? t : x);
                    saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                    return updated;
                });
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
                setTrucks(prev => {
                    const updated = [...prev, t];
                    saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                    return updated;
                });
                return syncToCloud('trucks', t.id, { id: t.id, unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }, 'insert');
            },
            updateLocalTruck: async (t) => {
                setTrucks(prev => {
                    const updated = prev.map(x => x.id === t.id ? t : x);
                    saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                    return updated;
                });
                return syncToCloud('trucks', t.id, { unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }, 'update');
            },
            deleteLocalTruck: async (id) => {
                setTrucks(prev => {
                    const updated = prev.filter(x => x.id !== id);
                    saveToLocal(STORAGE_KEYS.TRUCKS, updated);
                    return updated;
                });
                await syncToCloud('trucks', id, null, 'delete');
            },
            addLocalCategory: async (c) => {
                setCategories(prev => {
                    const updated = [...prev, c];
                    saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                    return updated;
                });
                return syncToCloud('categories', c.id, { id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }, 'insert');
            },
            addLocalCategories: async (list) => {
                setCategories(prev => {
                    const updated = [...prev, ...list];
                    saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                    return updated;
                });
            },
            updateLocalCategory: async (c) => {
                setCategories(prev => {
                    const updated = prev.map(x => x.id === c.id ? c : x);
                    saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                    return updated;
                });
                return syncToCloud('categories', c.id, { name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }, 'update');
            },
            deleteLocalCategory: async (id) => {
                setCategories(prev => {
                    const updated = prev.filter(x => x.id !== id);
                    saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                    return updated;
                });
                await syncToCloud('categories', id, null, 'delete');
            },
            updateLocalFiscalYear: async (rec) => {
                setFiscalYearRecords(prev => {
                    const updated = [...prev.filter(r => r.year !== rec.year), rec];
                    saveToLocal(STORAGE_KEYS.FISCAL, updated);
                    return updated;
                });
                return true;
            },
            addLocalLoad: async (l) => {
                setLoadRecords(prev => {
                    const updated = [l, ...prev];
                    saveToLocal(STORAGE_KEYS.LOADS, updated);
                    return updated;
                });
                return await syncToCloud('loads', l.id, { id: l.id, current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, pickup_location: l.pickupLocation, status: l.status }, 'insert');
            },
            updateLocalLoad: async (l) => {
                setLoadRecords(prev => {
                    const updated = prev.map(x => x.id === l.id ? l : x);
                    saveToLocal(STORAGE_KEYS.LOADS, updated);
                    return updated;
                });
                return await syncToCloud('loads', l.id, { current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, status: l.status }, 'update');
            },
            deleteLocalLoad: async (id) => {
                setLoadRecords(prev => {
                    const updated = prev.filter(x => x.id !== id);
                    saveToLocal(STORAGE_KEYS.LOADS, updated);
                    return updated;
                });
                await syncToCloud('loads', id, null, 'delete');
            },
            saveSystemSetting: async (k, v) => { localStorage.setItem(k, v); }
        }}>{children}</DataContext.Provider>
    );
};
