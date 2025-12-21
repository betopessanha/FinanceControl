
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
        
        // 1. Initial Load (Local)
        const localEntities = loadFromLocal(STORAGE_KEYS.ENTITIES, mockEntities);
        const localAccounts = loadFromLocal(STORAGE_KEYS.ACCOUNTS, mockAccounts);
        const localTransactions = loadFromLocal(STORAGE_KEYS.TRANSACTIONS, mockTransactions);
        const localTrucks = loadFromLocal(STORAGE_KEYS.TRUCKS, mockTrucks);
        const localCategories = loadFromLocal(STORAGE_KEYS.CATEGORIES, allCategories);
        const localLoads = loadFromLocal(STORAGE_KEYS.LOADS, []);

        // 2. Sync with Cloud (Overwrites Local if successful)
        if (isSupabaseConfigured && supabase) {
            try {
                const [loadsRes, transRes, truckRes, catRes, accRes, entityRes] = await Promise.all([
                    supabase.from('loads').select('*'),
                    supabase.from('transactions').select('*, categories(id, name, type, is_tax_deductible), trucks(id, unit_number, make, model, year)'),
                    supabase.from('trucks').select('*'),
                    supabase.from('categories').select('*'),
                    supabase.from('bank_accounts').select('*'),
                    supabase.from('business_entities').select('*')
                ]);

                if (entityRes.data) setBusinessEntities(entityRes.data);
                else setBusinessEntities(localEntities);

                if (accRes.data) setAccounts(accRes.data.map(a => ({
                    id: a.id, name: a.name, type: a.type, initialBalance: parseFloat(a.initial_balance) || 0, businessEntityId: a.business_entity_id
                })));
                else setAccounts(localAccounts);

                if (catRes.data) setCategories(catRes.data.map(c => ({
                    id: c.id, name: c.name, type: c.type as TransactionType, isTaxDeductible: c.is_tax_deductible
                })));
                else setCategories(localCategories);

                if (truckRes.data) setTrucks(truckRes.data.map(t => ({
                    id: t.id, unitNumber: t.unit_number, make: t.make, model: t.model, year: t.year
                })));
                else setTrucks(localTrucks);

                if (loadsRes.data) {
                    const mappedLoads = loadsRes.data.map(l => ({
                        id: l.id,
                        currentLocation: l.current_location,
                        milesToPickup: parseFloat(l.miles_to_pickup) || 0,
                        pickupLocation: l.pickup_location,
                        pickupDate: l.pickup_date,
                        milesToDelivery: parseFloat(l.miles_to_delivery) || 0,
                        deliveryLocation: l.delivery_location,
                        deliveryDate: l.delivery_date,
                        totalMiles: (parseFloat(l.miles_to_pickup) || 0) + (parseFloat(l.miles_to_delivery) || 0),
                        paymentType: l.payment_type,
                        rate: parseFloat(l.rate) || 0,
                        totalRevenue: parseFloat(l.total_revenue) || 0,
                        truckId: l.truck_id,
                        status: l.status
                    }));
                    setLoadRecords(mappedLoads);
                    saveToLocal(STORAGE_KEYS.LOADS, mappedLoads);
                } else setLoadRecords(localLoads);

                if (transRes.data) {
                    const mappedTrans = transRes.data.map(t => ({
                        id: t.id,
                        date: t.date,
                        description: t.description,
                        amount: parseFloat(t.amount) || 0,
                        type: t.type as TransactionType,
                        accountId: t.account_id,
                        toAccountId: t.to_account_id,
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
                    setTransactions(mappedTrans);
                    saveToLocal(STORAGE_KEYS.TRANSACTIONS, mappedTrans);
                } else setTransactions(localTransactions);

            } catch (error) {
                console.error("Critical Cloud Sync Error:", error);
                // Fallback to local if cloud fails during fetch
                setBusinessEntities(localEntities);
                setAccounts(localAccounts);
                setTransactions(localTransactions);
                setTrucks(localTrucks);
                setCategories(localCategories);
                setLoadRecords(localLoads);
            }
        } else {
            // No Supabase, use local
            setBusinessEntities(localEntities);
            setAccounts(localAccounts);
            setTransactions(localTransactions);
            setTrucks(localTrucks);
            setCategories(localCategories);
            setLoadRecords(localLoads);
        }
        setLoading(false);
    };

    // Helper para garantir que números sejam salvos como números
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

    // --- WRAPPERS ---
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
            delivery_date: l.delivery_date,
            payment_type: l.paymentType,
            rate: l.rate,
            total_revenue: l.totalRevenue,
            truck_id: l.truckId,
            status: l.status
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

    // Fix for shorthand property 'saveSystemSetting' error
    const saveSystemSetting = async (key: string, value: string) => {
        localStorage.setItem(key, value);
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, fiscalYearRecords, loadRecords,
            reportFilter, loading, isCloudConnected: !!isSupabaseConfigured,
            refreshData: fetchData, setReportFilter,
            addLocalEntity: async (e) => {
                setBusinessEntities([...businessEntities, e]);
                return syncToCloud('business_entities', e.id, e, 'insert');
            },
            updateLocalEntity: async (e) => {
                setBusinessEntities(businessEntities.map(x => x.id === e.id ? e : x));
                return syncToCloud('business_entities', e.id, e, 'update');
            },
            deleteLocalEntity: async (id) => {
                setBusinessEntities(businessEntities.filter(x => x.id !== id));
                await syncToCloud('business_entities', id, null, 'delete');
            },
            addLocalAccount: async (a) => {
                setAccounts([...accounts, a]);
                return syncToCloud('bank_accounts', a.id, {
                    id: a.id, name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId
                }, 'insert');
            },
            updateLocalAccount: async (a) => {
                setAccounts(accounts.map(x => x.id === a.id ? a : x));
                return syncToCloud('bank_accounts', a.id, {
                    name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId
                }, 'update');
            },
            deleteLocalAccount: async (id) => {
                setAccounts(accounts.filter(x => x.id !== id));
                await syncToCloud('bank_accounts', id, null, 'delete');
            },
            addLocalTransaction, updateLocalTransaction,
            deleteLocalTransaction: async (id) => {
                setTransactions(transactions.filter(x => x.id !== id));
                await syncToCloud('transactions', id, null, 'delete');
            },
            deleteLocalTransactions: async (ids) => {
                setTransactions(transactions.filter(x => !ids.includes(x.id)));
                if (isSupabaseConfigured && supabase) await supabase.from('transactions').delete().in('id', ids);
            },
            addLocalTruck: async (t) => {
                setTrucks([...trucks, t]);
                return syncToCloud('trucks', t.id, {
                    id: t.id, unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year
                }, 'insert');
            },
            updateLocalTruck: async (t) => {
                setTrucks(trucks.map(x => x.id === t.id ? t : x));
                return syncToCloud('trucks', t.id, {
                    unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year
                }, 'update');
            },
            deleteLocalTruck: async (id) => {
                setTrucks(trucks.filter(x => x.id !== id));
                await syncToCloud('trucks', id, null, 'delete');
            },
            addLocalCategory: async (c) => {
                setCategories([...categories, c]);
                return syncToCloud('categories', c.id, {
                    id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible
                }, 'insert');
            },
            addLocalCategories: async (list) => {
                setCategories([...categories, ...list]);
                if (isSupabaseConfigured && supabase) {
                    const payload = list.map(c => ({ id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }));
                    await supabase.from('categories').insert(payload);
                }
            },
            updateLocalCategory: async (c) => {
                setCategories(categories.map(x => x.id === c.id ? c : x));
                return syncToCloud('categories', c.id, {
                    name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible
                }, 'update');
            },
            deleteLocalCategory: async (id) => {
                setCategories(categories.filter(x => x.id !== id));
                await syncToCloud('categories', id, null, 'delete');
            },
            updateLocalFiscalYear: async (rec) => {
                const updated = [...fiscalYearRecords.filter(r => r.year !== rec.year), rec];
                setFiscalYearRecords(updated);
                return syncToCloud('fiscal_years', rec.year.toString(), {
                    year: rec.year, status: rec.status, manual_balance: rec.manualBalance, notes: rec.notes
                }, 'insert');
            },
            addLocalLoad,
            updateLocalLoad: async (l) => {
                setLoadRecords(loadRecords.map(x => x.id === l.id ? l : x));
                return syncToCloud('loads', l.id, {
                    current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, pickup_location: l.pickupLocation,
                    pickup_date: l.pickupDate, miles_to_delivery: l.milesToDelivery, delivery_location: l.deliveryLocation,
                    delivery_date: l.deliveryDate, payment_type: l.paymentType, rate: l.rate, total_revenue: l.totalRevenue,
                    truck_id: l.truckId, status: l.status
                }, 'update');
            },
            deleteLocalLoad: async (id) => {
                setLoadRecords(loadRecords.filter(x => x.id !== id));
                await syncToCloud('loads', id, null, 'delete');
            },
            saveSystemSetting
        }}>{children}</DataContext.Provider>
    );
};
