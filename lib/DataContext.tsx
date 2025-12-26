
import React, { createContext, useContext, useEffect, useState } from 'react';
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
    const [isActuallyConnected, setIsActuallyConnected] = useState(false);

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

    const fetchData = async () => {
        setLoading(true);
        const localLoads = loadFromLocal(STORAGE_KEYS.LOADS, []);
        const localTrans = loadFromLocal(STORAGE_KEYS.TRANSACTIONS, mockTransactions);
        const localTrucks = loadFromLocal(STORAGE_KEYS.TRUCKS, mockTrucks);
        const localAccs = loadFromLocal(STORAGE_KEYS.ACCOUNTS, mockAccounts);
        const localEntities = loadFromLocal(STORAGE_KEYS.ENTITIES, mockEntities);
        const localCats = loadFromLocal(STORAGE_KEYS.CATEGORIES, allCategories);
        const localFiscal = loadFromLocal(STORAGE_KEYS.FISCAL, []);

        setLoadRecords(localLoads);
        setTransactions(localTrans);
        setTrucks(localTrucks);
        setAccounts(localAccs);
        setBusinessEntities(localEntities);
        setCategories(localCats);
        setFiscalYearRecords(localFiscal);

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
                            id: e.id, name: e.name, structure: e.structure, taxForm: e.tax_form,
                            ein: e.ein, email: e.email, phone: e.phone, website: e.website,
                            address: e.address, city: e.city, state: e.state, zip: e.zip
                        }));
                        setBusinessEntities(mapped); saveToLocal(STORAGE_KEYS.ENTITIES, mapped); 
                    }
                    if (resAccs.data?.length) {
                        const mapped = resAccs.data.map(a => ({ id: a.id, name: a.name, type: a.type, initialBalance: parseFloat(a.initial_balance) || 0, businessEntityId: a.business_entity_id }));
                        setAccounts(mapped); saveToLocal(STORAGE_KEYS.ACCOUNTS, mapped);
                    }
                    if (resTrucks.data?.length) {
                        const mapped = resTrucks.data.map(t => ({ id: t.id, unitNumber: t.unit_number, make: t.make, model: t.model, year: t.year }));
                        setTrucks(mapped); saveToLocal(STORAGE_KEYS.TRUCKS, mapped);
                    }
                    if (resCats.data?.length) { 
                        const mapped = resCats.data.map(c => ({
                            id: c.id, name: c.name, type: c.type, isTaxDeductible: c.is_tax_deductible
                        }));
                        setCategories(mapped); saveToLocal(STORAGE_KEYS.CATEGORIES, mapped); 
                    }
                    if (resLoads.data?.length) {
                        const mapped = resLoads.data.map(l => ({
                            id: l.id, currentLocation: l.current_location, milesToPickup: parseFloat(l.miles_to_pickup) || 0,
                            pickupLocation: l.pickup_location, pickupDate: l.pickup_date, milesToDelivery: parseFloat(l.miles_to_delivery) || 0,
                            deliveryLocation: l.delivery_location, deliveryDate: l.delivery_date, totalMiles: parseFloat(l.total_miles) || 0,
                            paymentType: l.payment_type, rate: parseFloat(l.rate) || 0, totalRevenue: parseFloat(l.total_revenue) || 0,
                            truckId: l.truck_id, status: l.status
                        }));
                        setLoadRecords(mapped); saveToLocal(STORAGE_KEYS.LOADS, mapped);
                    }
                    if (resTrans.data?.length) {
                        const allCats = resCats.data || localCats;
                        const allTrucks = resTrucks.data || localTrucks;
                        const mapped = resTrans.data.map(t => ({
                            id: t.id, date: t.date, description: t.description, amount: parseFloat(t.amount) || 0,
                            type: t.type as TransactionType, accountId: t.account_id,
                            category: allCats.find((c: any) => c.id === t.category_id),
                            truck: allTrucks.find((tr: any) => tr.id === t.truck_id)
                        }));
                        setTransactions(mapped); saveToLocal(STORAGE_KEYS.TRANSACTIONS, mapped);
                    }
                }
            } catch (e) { console.warn("Cloud pull failed, using local cache."); }
        }
        setLoading(false);
    };

    const pushLocalDataToCloud = async () => {
        if (!isSupabaseConfigured || !supabase) return { success: false, message: "Cloud not configured." };
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { success: false, message: "Please sign in with a real account." };

            // 1. Entities (Map taxForm -> tax_form)
            if (businessEntities.length) {
                await supabase.from('business_entities').upsert(businessEntities.map(e => ({ 
                    id: e.id, name: e.name, structure: e.structure, tax_form: e.taxForm, 
                    ein: e.ein, email: e.email, phone: e.phone, website: e.website,
                    address: e.address, city: e.city, state: e.state, zip: e.zip,
                    user_id: session.user.id 
                })));
            }
            // 2. Categories
            if (categories.length) {
                await supabase.from('categories').upsert(categories.map(c => ({ id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible, user_id: session.user.id })));
            }
            // 3. Trucks
            if (trucks.length) {
                await supabase.from('trucks').upsert(trucks.map(t => ({ id: t.id, unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year, user_id: session.user.id })));
            }
            // 4. Accounts
            if (accounts.length) {
                await supabase.from('bank_accounts').upsert(accounts.map(a => ({ id: a.id, name: a.name, type: a.type, initial_balance: a.initialBalance, business_entity_id: a.businessEntityId, user_id: session.user.id })));
            }
            // 5. Transactions
            if (transactions.length) {
                await supabase.from('transactions').upsert(transactions.map(t => ({
                    id: t.id, date: t.date, description: t.description, amount: t.amount, type: t.type,
                    account_id: t.accountId, category_id: t.category?.id, truck_id: t.truck?.id, user_id: session.user.id
                })));
            }
            // 6. Loads
            if (loadRecords.length) {
                await supabase.from('loads').upsert(loadRecords.map(l => ({
                    id: l.id, current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, pickup_location: l.pickupLocation,
                    pickup_date: l.pickupDate, miles_to_delivery: l.milesToDelivery, delivery_location: l.deliveryLocation,
                    delivery_date: l.deliveryDate, total_miles: l.totalMiles, payment_type: l.paymentType, rate: l.rate,
                    total_revenue: l.totalRevenue, truck_id: l.truckId, status: l.status, user_id: session.user.id
                })));
            }
            await fetchData();
            return { success: true, message: "All data synchronized to cloud successfully." };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    };

    const syncToCloud = async (table: string, id: string, data: any, method: 'insert' | 'update' | 'delete') => {
        if (!isSupabaseConfigured || !supabase) return true;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return true;
            let res;
            if (method === 'delete') res = await supabase.from(table).delete().eq('id', id);
            else if (method === 'insert') res = await supabase.from(table).insert([{ ...data, user_id: session.user.id }]);
            else res = await supabase.from(table).update({ ...data, user_id: session.user.id }).eq('id', id);
            
            if (res.error) { 
                console.error(`Sync Fail [${table}]:`, res.error.message); 
                return false; 
            }
            return true;
        } catch (e) { return false; }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, fiscalYearRecords, loadRecords,
            reportFilter, loading, isCloudConnected: isActuallyConnected, refreshData: fetchData, pushLocalDataToCloud,
            setReportFilter,
            addLocalEntity: async (e) => {
                const updated = [...businessEntities, e];
                setBusinessEntities(updated); saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                return syncToCloud('business_entities', e.id, { 
                    id: e.id, name: e.name, structure: e.structure, tax_form: e.taxForm, 
                    ein: e.ein, email: e.email, phone: e.phone, website: e.website, 
                    address: e.address, city: e.city, state: e.state, zip: e.zip 
                }, 'insert');
            },
            updateLocalEntity: async (e) => {
                const updated = businessEntities.map(x => x.id === e.id ? e : x);
                setBusinessEntities(updated); saveToLocal(STORAGE_KEYS.ENTITIES, updated);
                return syncToCloud('business_entities', e.id, { 
                    name: e.name, structure: e.structure, tax_form: e.taxForm,
                    ein: e.ein, email: e.email, phone: e.phone, website: e.website, 
                    address: e.address, city: e.city, state: e.state, zip: e.zip 
                }, 'update');
            },
            deleteLocalEntity: async (id) => {
                const updated = businessEntities.filter(x => x.id !== id);
                setBusinessEntities(updated); saveToLocal(STORAGE_KEYS.ENTITIES, updated);
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
                return syncToCloud('transactions', t.id, { id: t.id, amount: t.amount, description: t.description, date: t.date, type: t.type, category_id: t.category?.id, truck_id: t.truck?.id, account_id: t.accountId }, 'insert');
            },
            updateLocalTransaction: async (t) => {
                const updated = transactions.map(x => x.id === t.id ? t : x);
                setTransactions(updated); saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                return syncToCloud('transactions', t.id, { amount: t.amount, description: t.description, date: t.date, type: t.type, category_id: t.category?.id, truck_id: t.truck?.id, account_id: t.accountId }, 'update');
            },
            deleteLocalTransaction: async (id) => {
                const updated = transactions.filter(x => x.id !== id);
                setTransactions(updated); saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                await syncToCloud('transactions', id, null, 'delete');
            },
            deleteLocalTransactions: async (ids) => {
                const updated = transactions.filter(x => !ids.includes(x.id));
                setTransactions(updated); saveToLocal(STORAGE_KEYS.TRANSACTIONS, updated);
                if (isActuallyConnected && supabase) {
                     const { data: { session } } = await supabase.auth.getSession();
                     if (session) await supabase.from('transactions').delete().in('id', ids).eq('user_id', session.user.id);
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
                // Ensure truck_id is only sent if it is a valid UUID to avoid foreign key errors
                const cloudTruckId = isValidUUID(l.truckId || '') ? l.truckId : null;
                return await syncToCloud('loads', l.id, {
                    id: l.id, current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, pickup_location: l.pickupLocation,
                    pickup_date: l.pickupDate, miles_to_delivery: l.milesToDelivery, delivery_location: l.deliveryLocation,
                    delivery_date: l.deliveryDate, total_miles: l.totalMiles, payment_type: l.paymentType, rate: l.rate,
                    total_revenue: l.totalRevenue, truck_id: cloudTruckId, status: l.status
                }, 'insert');
            },
            updateLocalLoad: async (l) => {
                const updated = loadRecords.map(x => x.id === l.id ? l : x);
                setLoadRecords(updated); saveToLocal(STORAGE_KEYS.LOADS, updated);
                const cloudTruckId = isValidUUID(l.truckId || '') ? l.truckId : null;
                return await syncToCloud('loads', l.id, {
                    current_location: l.currentLocation, miles_to_pickup: l.milesToPickup, pickup_location: l.pickupLocation,
                    pickup_date: l.pickupDate, miles_to_delivery: l.milesToDelivery, delivery_location: l.deliveryLocation,
                    delivery_date: l.deliveryDate, total_miles: l.totalMiles, payment_type: l.paymentType, rate: l.rate,
                    total_revenue: l.totalRevenue, truck_id: cloudTruckId, status: l.status
                }, 'update');
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
