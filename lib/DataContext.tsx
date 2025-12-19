
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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [businessEntities, setBusinessEntities] = useState<BusinessEntity[]>([]);
    const [fiscalYearRecords, setFiscalYearRecords] = useState<FiscalYearRecord[]>([]);
    const [reportFilter, setReportFilter] = useState<ReportFilter | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        if (!isSupabaseConfigured || !supabase) {
            setBusinessEntities(mockEntities);
            setTransactions(mockTransactions);
            setCategories(allCategories);
            setTrucks(mockTrucks);
            setAccounts(mockAccounts);
            const years = Array.from(new Set(mockTransactions.map(t => new Date(t.date).getFullYear())));
            setFiscalYearRecords(years.map(y => ({ year: y, status: 'Open' })));
            setLoading(false);
            return;
        }

        try {
            const [catRes, truckRes, entRes, fiscalRes] = await Promise.all([
                supabase.from('categories').select('*'),
                supabase.from('trucks').select('*'),
                supabase.from('business_entities').select('*'),
                supabase.from('fiscal_year_records').select('*')
            ]);

            // --- ACCOUNTS FETCH WITH GRACEFUL FALLBACK ---
            // This is the core "restore" logic. If the schema is broken, we try the simplest query possible.
            let accRes = await supabase.from('accounts').select('id, name, type, initial_balance, business_entity_id');
            
            if (accRes.error && (accRes.error.message.includes("business_entity_id") || accRes.error.message.includes("bigint"))) {
                console.warn("Schema issue detected for accounts. Falling back to restore visibility...");
                accRes = await supabase.from('accounts').select('id, name, type, initial_balance');
            }

            if (entRes.data) {
                setBusinessEntities(entRes.data.map((e: any) => ({
                    id: e.id, name: e.name, structure: e.structure, taxForm: e.tax_form, ein: e.ein,
                    email: e.email, phone: e.phone, website: e.website, address: e.address, 
                    city: e.city, state: e.state, zip: e.zip, logoUrl: e.logo_url
                })));
            }

            if (accRes.data) {
                setAccounts(accRes.data.map((a: any) => ({ 
                    id: a.id, 
                    name: a.name, 
                    type: a.type, 
                    initialBalance: a.initial_balance, 
                    businessEntityId: a.business_entity_id ? String(a.business_entity_id) : undefined
                })));
            }

            if (catRes.data) setCategories(catRes.data.map((c: any) => ({ 
                id: c.id, name: c.name, type: c.type as TransactionType, isTaxDeductible: c.is_tax_deductible 
            })));
            
            if (truckRes.data) setTrucks(truckRes.data.map((t: any) => ({ 
                id: t.id, unitNumber: t.unit_number, make: t.make, model: t.model, year: t.year 
            })));
            
            if (fiscalRes.data) {
                setFiscalYearRecords(fiscalRes.data.map((r: any) => ({
                    year: r.year,
                    status: r.status as 'Open' | 'Closed',
                    manualBalance: r.manual_balance,
                    notes: r.notes
                })));
            }
            
            const { data: transData } = await supabase.from('transactions').select(`*, categories:category_id(*), trucks:truck_id(*)`).order('date', { ascending: false });
            if (transData) {
                setTransactions(transData.map((t: any) => ({
                    id: t.id, date: t.date, description: t.description, amount: t.amount, type: t.type as TransactionType,
                    accountId: t.account_id, toAccountId: t.to_account_id, receipts: t.receipts || [],
                    category: t.categories ? { id: t.categories.id, name: t.categories.name, type: t.categories.type as TransactionType, isTaxDeductible: t.categories.is_tax_deductible } : undefined,
                    truck: t.trucks ? { id: t.trucks.id, unitNumber: t.trucks.unit_number } : undefined
                })));
            }
        } catch (error) {
            console.error("Critical Fetch Error during restoration:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSupabaseError = (operation: string, error: any) => {
        console.error(`Supabase Error Details (${operation}):`, error);
        let displayMessage = "An unknown database error occurred.";
        
        if (error) {
            if (typeof error === 'string') {
                displayMessage = error;
            } else if (error.message) {
                displayMessage = error.message;
            } else {
                try {
                    const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
                    displayMessage = errorDetails === "{}" ? "[Unable to stringify error object]" : errorDetails;
                } catch (e) {
                    displayMessage = String(error);
                }
            }
        }

        alert(`Database Error (${operation}):\n\n${displayMessage}\n\nHint: To fix type errors (BigInt vs Text), go to Settings and run the Migration script.`);
    };

    const addLocalEntity = async (e: BusinessEntity) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('business_entities').insert([{
                id: e.id, name: e.name, structure: e.structure, tax_form: e.taxForm, ein: e.ein,
                email: e.email, phone: e.phone, website: e.website, address: e.address,
                city: e.city, state: e.state, zip: e.zip, logo_url: e.logoUrl
            }]);
            if (error) { handleSupabaseError("addEntity", error); return false; }
        }
        setBusinessEntities(prev => [...prev, e]);
        return true;
    };

    const updateLocalEntity = async (e: BusinessEntity) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('business_entities').update({
                name: e.name, structure: e.structure, tax_form: e.taxForm, ein: e.ein,
                email: e.email, phone: e.phone, website: e.website, address: e.address,
                city: e.city, state: e.state, zip: e.zip, logo_url: e.logoUrl
            }).eq('id', e.id);
            if (error) { handleSupabaseError("updateEntity", error); return false; }
        }
        setBusinessEntities(prev => prev.map(item => item.id === e.id ? e : item));
        return true;
    };

    const deleteLocalEntity = async (id: string) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('business_entities').delete().eq('id', id);
            if (error) { handleSupabaseError("deleteEntity", error); return; }
        }
        setBusinessEntities(prev => prev.filter(item => item.id !== id));
        setAccounts(prev => prev.map(a => a.businessEntityId === id ? { ...a, businessEntityId: undefined } : a));
    };

    const addLocalAccount = async (a: BankAccount) => {
        if (isSupabaseConfigured && supabase) {
            const payload: any = {
                id: a.id, 
                name: a.name, 
                type: a.type, 
                initial_balance: a.initialBalance, 
                business_entity_id: a.businessEntityId || null
            };
            
            let { error } = await supabase.from('accounts').insert([payload]);
            
            if (error && (error.message.includes("business_entity_id") || error.message.includes("bigint"))) {
                delete payload.business_entity_id;
                const retry = await supabase.from('accounts').insert([payload]);
                error = retry.error;
            }

            if (error) { handleSupabaseError("addAccount", error); return false; }
        }
        setAccounts(prev => [...prev, a]);
        return true;
    };

    const updateLocalAccount = async (a: BankAccount) => {
        if (isSupabaseConfigured && supabase) {
            const payload: any = {
                name: a.name, 
                type: a.type, 
                initial_balance: a.initialBalance, 
                business_entity_id: a.businessEntityId || null
            };
            
            let { error } = await supabase.from('accounts').update(payload).eq('id', a.id);
            
            if (error && (error.message.includes("business_entity_id") || error.message.includes("bigint"))) {
                delete payload.business_entity_id;
                const retry = await supabase.from('accounts').update(payload).eq('id', a.id);
                error = retry.error;
            }

            if (error) { handleSupabaseError("updateAccount", error); return false; }
        }
        setAccounts(prev => prev.map(item => item.id === a.id ? a : item));
        return true;
    };

    const deleteLocalAccount = async (id: string) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('accounts').delete().eq('id', id);
            if (error) { handleSupabaseError("deleteAccount", error); return; }
        }
        setAccounts(prev => prev.filter(item => item.id !== id));
    };

    const addLocalTruck = async (t: Truck) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('trucks').insert([{ id: t.id, unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }]);
            if (error) { handleSupabaseError("addTruck", error); return false; }
        }
        setTrucks(prev => [...prev, t]);
        return true;
    };
    const updateLocalTruck = async (t: Truck) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('trucks').update({ unit_number: t.unitNumber, make: t.make, model: t.model, year: t.year }).eq('id', t.id);
            if (error) { handleSupabaseError("updateTruck", error); return false; }
        }
        setTrucks(prev => prev.map(item => item.id === t.id ? t : item));
        return true;
    };
    const deleteLocalTruck = async (id: string) => {
        if (isSupabaseConfigured && supabase) await supabase.from('trucks').delete().eq('id', id);
        setTrucks(prev => prev.filter(item => item.id !== id));
    };
    const addLocalTransaction = async (t: Transaction) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('transactions').insert([{ id: t.id, date: t.date, description: t.description, amount: t.amount, type: t.type, account_id: t.accountId, to_account_id: t.toAccountId || null, category_id: t.category?.id || null, truck_id: t.truck?.id || null, receipts: t.receipts }]);
            if (error) { handleSupabaseError("addTransaction", error); return false; }
        }
        setTransactions(prev => [t, ...prev]);
        return true;
    };
    const updateLocalTransaction = async (t: Transaction) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('transactions').update({ date: t.date, description: t.description, amount: t.amount, type: t.type, account_id: t.accountId, to_account_id: t.toAccountId || null, category_id: t.category?.id || null, truck_id: t.truck?.id || null, receipts: t.receipts }).eq('id', t.id);
            if (error) { handleSupabaseError("updateTransaction", error); return false; }
        }
        setTransactions(prev => prev.map(item => item.id === t.id ? t : item));
        return true;
    };
    const deleteLocalTransaction = async (id: string) => {
        if (isSupabaseConfigured && supabase) await supabase.from('transactions').delete().eq('id', id);
        setTransactions(prev => prev.filter(item => item.id !== id));
    };
    const deleteLocalTransactions = async (ids: string[]) => {
        if (isSupabaseConfigured && supabase) await supabase.from('transactions').delete().in('id', ids);
        setTransactions(prev => prev.filter(item => !ids.includes(item.id)));
    };
    const addLocalCategory = async (c: Category) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('categories').insert([{ id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }]);
            if (error) { handleSupabaseError("addCategory", error); return false; }
        }
        setCategories(prev => [...prev, c]);
        return true;
    };
    const addLocalCategories = async (cList: Category[]) => {
        if (isSupabaseConfigured && supabase) {
            const payloads = cList.map(c => ({ id: c.id, name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }));
            const { error } = await supabase.from('categories').insert(payloads);
            if (error) handleSupabaseError("bulkAddCategories", error);
        }
        setCategories(prev => [...prev, ...cList]);
    };
    const updateLocalCategory = async (c: Category) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.from('categories').update({ name: c.name, type: c.type, is_tax_deductible: c.isTaxDeductible }).eq('id', c.id);
            if (error) { handleSupabaseError("updateCategory", error); return false; }
        }
        setCategories(prev => prev.map(item => item.id === c.id ? c : item));
        return true;
    };
    const deleteLocalCategory = async (id: string) => {
        if (isSupabaseConfigured && supabase) await supabase.from('categories').delete().eq('id', id);
        setCategories(prev => prev.filter(item => item.id !== id));
    };
    const updateLocalFiscalYear = async (record: FiscalYearRecord) => {
        setFiscalYearRecords(prev => {
            const exists = prev.find(r => r.year === record.year);
            if (exists) return prev.map(r => r.year === record.year ? record : r);
            return [...prev, record];
        });
        if (isSupabaseConfigured && supabase) {
            try {
                const { error } = await supabase.from('fiscal_year_records').upsert({ year: record.year, status: record.status, manual_balance: record.manualBalance, notes: record.notes });
                if (error) handleSupabaseError("updateFiscalYear", error);
            } catch (error) { console.error("Failed to sync fiscal year record", error); return false; }
        }
        return true;
    };

    const saveSystemSetting = async (key: string, value: string) => {
        localStorage.setItem(key, value);
        if (isSupabaseConfigured && supabase) await supabase.from('app_settings').upsert({ key, value });
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <DataContext.Provider value={{ 
            transactions, categories, trucks, accounts, businessEntities, 
            fiscalYearRecords, reportFilter, loading, refreshData: fetchData,
            setReportFilter,
            addLocalEntity, updateLocalEntity, deleteLocalEntity,
            addLocalAccount, updateLocalAccount, deleteLocalAccount,
            addLocalTransaction, updateLocalTransaction, deleteLocalTransaction, deleteLocalTransactions,
            addLocalTruck, updateLocalTruck, deleteLocalTruck,
            addLocalCategory, addLocalCategories, updateLocalCategory, deleteLocalCategory,
            updateLocalFiscalYear,
            saveSystemSetting
        }}>{children}</DataContext.Provider>
    );
};
