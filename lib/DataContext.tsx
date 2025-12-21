
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, Category, Truck, BankAccount, TransactionType, BusinessEntity, FiscalYearRecord, LoadRecord } from '../types';
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
    loadRecords: LoadRecord[];
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
    LOADS: 'app_data_loads'
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
    const [fiscalYearRecords, setFiscalYearRecords] = useState<FiscalYearRecord[]>([]);
    const [loadRecords, setLoadRecords] = useState<LoadRecord[]>([]);
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
        
        // 1. Load Local State first (for offline/speed)
        setBusinessEntities(loadFromLocal(STORAGE_KEYS.ENTITIES, mockEntities));
        setAccounts(loadFromLocal(STORAGE_KEYS.ACCOUNTS, mockAccounts));
        setTransactions(loadFromLocal(STORAGE_KEYS.TRANSACTIONS, mockTransactions));
        setTrucks(loadFromLocal(STORAGE_KEYS.TRUCKS, mockTrucks));
        setCategories(loadFromLocal(STORAGE_KEYS.CATEGORIES, allCategories));
        setFiscalYearRecords(loadFromLocal(STORAGE_KEYS.FISCAL, []));
        setLoadRecords(loadFromLocal(STORAGE_KEYS.LOADS, []));

        // 2. Sync with Cloud if available
        if (isSupabaseConfigured && supabase) {
            try {
                const [loadsRes, transRes, truckRes, catRes, accRes, entityRes] = await Promise.all([
                    supabase.from('loads').select('*'),
                    supabase.from('transactions').select('*'),
                    supabase.from('trucks').select('*'),
                    supabase.from('categories').select('*'),
                    supabase.from('bank_accounts').select('*'),
                    supabase.from('business_entities').select('*')
                ]);

                if (loadsRes.data) {
                    const mapped = loadsRes.data.map(l => ({
                        id: l.id,
                        currentLocation: l.current_location,
                        milesToPickup: Number(l.miles_to_pickup),
                        pickupLocation: l.pickup_location,
                        pickupDate: l.pickup_date,
                        milesToDelivery: Number(l.miles_to_delivery),
                        deliveryLocation: l.delivery_location,
                        deliveryDate: l.delivery_date,
                        totalMiles: Number(l.total_miles),
                        paymentType: l.payment_type,
                        rate: Number(l.rate),
                        totalRevenue: Number(l.total_revenue),
                        truckId: l.truck_id,
                        status: l.status
                    }));
                    setLoadRecords(mapped);
                    saveToLocal(STORAGE_KEYS.LOADS, mapped);
                }

                if (truckRes.data) {
                    const mappedTrucks = truckRes.data.map(t => ({
                        id: t.id,
                        unitNumber: t.unit_number,
                        make: t.make,
                        model: t.model,
                        year: t.year
                    }));
                    setTrucks(mappedTrucks);
                    saveToLocal(STORAGE_KEYS.TRUCKS, mappedTrucks);
                }

                // Note: Categories and other tables follow similar pattern.
                // We'll prioritize Cloud data if it exists.
            } catch (error) {
                console.error("Cloud synchronization failed.", error);
            }
        }
        setLoading(false);
    };

    // --- GENERIC SYNC HELPER ---
    const syncToCloud = async (table: string, id: string, data: any, method: 'insert' | 'update' | 'delete') => {
        if (!isSupabaseConfigured || !supabase) return true;
        try {
            if (method === 'delete') {
                await supabase.from(table).delete().eq('id', id);
            } else if (method === 'insert') {
                await supabase.from(table).insert([data]);
            } else {
                await supabase.from(table).update(data).eq('id', id);
            }
            return true;
        } catch (e) {
            console.error(`Sync error on ${table}:`, e);
            return false;
        }
    };

    // --- LOADS SYNC ---
    const addLocalLoad = async (l: LoadRecord) => {
        const updated = [l, ...loadRecords];
        setLoadRecords(updated);
        saveToLocal(STORAGE_KEYS.LOADS, updated);

        return await syncToCloud('loads', l.id, {
            id: l.id,
            current_location: l.currentLocation,
            miles_to_pickup: l.milesToPickup,
            pickup_location: l.pickupLocation,
            pickup_date: l.pickupDate,
            miles_to_delivery: l.milesToDelivery,
            delivery_location: l.deliveryLocation,
            delivery_date: l.deliveryDate,
            payment_type: l.paymentType,
            rate: l.rate,
            total_revenue: l.totalRevenue,
            truck_id: l.truckId,
            status: l.status
        }, 'insert');
    };

    const updateLocalLoad = async (l: LoadRecord) => {
        const updated = loadRecords.map(item => item.id === l.id ? l : item);
        setLoadRecords(updated);
        saveToLocal(STORAGE_KEYS.LOADS, updated);

        return await syncToCloud('loads', l.id, {
            current_location: l.currentLocation,
            miles_to_pickup: l.milesToPickup,
            pickup_location: l.pickupLocation,
            pickup_date: l.pickupDate,
            miles_to_delivery: l.milesToDelivery,
            delivery_location: l.deliveryLocation,
            delivery_date: l.deliveryDate,
            payment_type: l.paymentType,
            rate: l.rate,
            total_revenue: l.totalRevenue,
            truck_id: l.truckId,
            status: l.status
        }, 'update');
    };

    const deleteLocalLoad = async (id: string) => {
        const updated = loadRecords.filter(item => item.id !== id);
        setLoadRecords(updated);
        saveToLocal(STORAGE_KEYS.LOADS, updated);
        await syncToCloud('loads', id, null, 'delete');
    };

    // --- TRUCKS SYNC ---
    const addLocalTruck = async (t: Truck) => {
        const updated = [...trucks, t];
        setTrucks(updated);
        saveToLocal(STORAGE_KEYS.TRUCKS, updated);
        return await syncToCloud('trucks', t.id, {
            id: t.id,
            unit_number: t.unitNumber,
            make: t.make,
            model: t.model,
            year: t.year
        }, 'insert');
    };

    const updateLocalTruck = async (t: Truck) => {
        const updated = trucks.map(item => item.id === t.id ? t : item);
        setTrucks(updated);
        saveToLocal(STORAGE_KEYS.TRUCKS, updated);
        return await syncToCloud('trucks', t.id, {
            unit_number: t.unitNumber,
            make: t.make,
            model: t.model,
            year: t.year
        }, 'update');
    };

    const deleteLocalTruck = async (id: string) => {
        const updated = trucks.filter(item => item.id !== id);
        setTrucks(updated);
        saveToLocal(STORAGE_KEYS.TRUCKS, updated);
        await syncToCloud('trucks', id, null, 'delete');
    };

    // --- CATEGORIES SYNC ---
    const addLocalCategory = async (c: Category) => {
        const updated = [...categories, c];
        setCategories(updated);
        saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
        return await syncToCloud('categories', c.id, {
            id: c.id,
            name: c.name,
            type: c.type,
            is_tax_deductible: c.isTaxDeductible
        }, 'insert');
    };

    const updateLocalCategory = async (c: Category) => {
        const updated = categories.map(item => item.id === c.id ? c : item);
        setCategories(updated);
        saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
        return await syncToCloud('categories', c.id, {
            name: c.name,
            type: c.type,
            is_tax_deductible: c.isTaxDeductible
        }, 'update');
    };

    const deleteLocalCategory = async (id: string) => {
        const updated = categories.filter(item => item.id !== id);
        setCategories(updated);
        saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
        await syncToCloud('categories', id, null, 'delete');
    };

    const addLocalEntity = async (e: BusinessEntity) => {
        const updated = [...businessEntities, e];
        setBusinessEntities(updated);
        saveToLocal(STORAGE_KEYS.ENTITIES, updated);
        return await syncToCloud('business_entities', e.id, {
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
            zip: e.zip
        }, 'insert');
    };

    const addLocalAccount = async (a: BankAccount) => {
        const updated = [...accounts, a];
        setAccounts(updated);
        saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
        return await syncToCloud('bank_accounts', a.id, {
            id: a.id,
            name: a.name,
            type: a.type,
            initial_balance: a.initialBalance,
            business_entity_id: a.businessEntityId
        }, 'insert');
    };

    const updateLocalAccount = async (a: BankAccount) => {
        const updated = accounts.map(item => item.id === a.id ? a : item);
        setAccounts(updated);
        saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
        return await syncToCloud('bank_accounts', a.id, {
            name: a.name,
            type: a.type,
            initial_balance: a.initialBalance,
            business_entity_id: a.businessEntityId
        }, 'update');
    };

    const addLocalTransaction = async (t: Transaction) => {
        const updated = [t, ...transactions];
        setTransactions(updated);
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
        return await syncToCloud('transactions', t.id, {
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category_id: t.category?.id,
            truck_id: t.truck?.id,
            account_id: t.accountId,
            to_account_id: t.toAccountId
        }, 'insert');
    };

    const updateLocalTransaction = async (t: Transaction) => {
        const updated = transactions.map(item => item.id === t.id ? t : item);
        setTransactions(updated);
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
        return await syncToCloud('transactions', t.id, {
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            category_id: t.category?.id,
            truck_id: t.truck?.id,
            account_id: t.accountId,
            to_account_id: t.toAccountId
        }, 'update');
    };

    const saveSystemSetting = async (key: string, value: string) => {
        localStorage.setItem(key, value);
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, fiscalYearRecords, loadRecords,
            reportFilter, loading, isCloudConnected: !!isSupabaseConfigured,
            refreshData: fetchData, setReportFilter,
            addLocalEntity, updateLocalEntity: async (e) => addLocalEntity(e), 
            deleteLocalEntity: async (id) => {
                const updated = businessEntities.filter(item => item.id !== id);
                setBusinessEntities(updated);
                saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                await syncToCloud('business_entities', id, null, 'delete');
            },
            addLocalAccount, updateLocalAccount, 
            deleteLocalAccount: async (id) => {
                const updated = accounts.filter(item => item.id !== id);
                setAccounts(updated);
                saveToLocal(STORAGE_KEYS.ACCOUNTS, updated);
                await syncToCloud('bank_accounts', id, null, 'delete');
            },
            addLocalTransaction, updateLocalTransaction, 
            deleteLocalTransaction: async (id) => {
                const updated = transactions.filter(item => item.id !== id);
                setTransactions(updated);
                saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                await syncToCloud('transactions', id, null, 'delete');
            }, 
            deleteLocalTransactions: async (ids) => {
                const updated = transactions.filter(item => !ids.includes(item.id));
                setTransactions(updated);
                saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                if (isSupabaseConfigured && supabase) {
                    await supabase.from('transactions').delete().in('id', ids);
                }
            },
            addLocalTruck, updateLocalTruck, deleteLocalTruck,
            addLocalCategory, addLocalCategories: async (list) => {
                const updated = [...categories, ...list];
                setCategories(updated);
                saveToLocal(STORAGE_KEYS.CATEGORIES, updated);
                if (isSupabaseConfigured && supabase) {
                    const payload = list.map(c => ({ id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }));
                    await supabase.from('categories').insert(payload);
                }
            }, updateLocalCategory, deleteLocalCategory,
            updateLocalFiscalYear: async (rec) => {
                const updated = [...fiscalYearRecords.filter(r => r.year !== rec.year), rec];
                setFiscalYearRecords(updated);
                saveToLocal(STORAGE_KEYS.FISCAL, updated);
                return await syncToCloud('fiscal_years', rec.year.toString(), {
                    year: rec.year,
                    status: rec.status,
                    manual_balance: rec.manualBalance,
                    notes: rec.notes
                }, 'insert'); // Simplified, in SQL you might want to UPSERT
            },
            addLocalLoad, updateLocalLoad, deleteLocalLoad,
            saveSystemSetting
        }}>{children}</DataContext.Provider>
    );
};
