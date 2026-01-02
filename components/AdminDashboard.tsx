import React from 'react';
import { Trash2, Edit3, ShieldAlert } from 'lucide-react';
import { db } from '../services/db';
import { Employee, TableConfig, Role } from '../types';
import { InventoryPanel } from './InventoryPanel';
import { AdminReports } from './AdminReports';
import { SettingsPanel } from './SettingsPanel';
import { BranchesPanel } from './BranchesPanel';

export const AdminDashboard = ({ 
    adminTab, 
    settings, 
    setSettings, 
    refreshData, 
    products, 
    onEditProduct, 
    onAddProduct,
    employees,
    setEditingStaff,
    setShowStaffModal,
    tables,
    setShowTableModal,
    branches,
    orders,
    currentUser
}: any) => {
    if (currentUser?.role !== Role.Admin) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
                <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border-2 dark:border-slate-800 shadow-2xl space-y-6 max-w-md">
                    <div className="w-24 h-24 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                        <ShieldAlert size={48}/>
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter dark:text-white">Restricted Access</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed">
                        This control panel is reserved for administrators only. Please switch your persona to **Admin** to manage team, tables, and settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {adminTab === 'dashboard' && <AdminReports currency={settings.currencySymbol} orders={orders} products={products} />}
            {adminTab === 'inventory' && (
                <InventoryPanel 
                    products={products} 
                    refresh={refreshData} 
                    onEdit={onEditProduct}
                    onAdd={onAddProduct}
                    settings={settings}
                    currentUser={currentUser}
                />
            )}
            {adminTab === 'branches' && <BranchesPanel branches={branches} refresh={refreshData} />}
            {adminTab === 'settings' && <SettingsPanel settings={settings} onUpdate={setSettings} refresh={refreshData} />}
            {adminTab === 'team' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black italic dark:text-white">Team Management</h2>
                        <button onClick={() => { setEditingStaff({}); setShowStaffModal(true); }} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">Add Staff Member</button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{employees.map((e: Employee) => (
                        <div key={e.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 flex justify-between items-center shadow-sm group">
                            <div>
                                <p className="font-black text-lg dark:text-white tracking-tighter">{e.name}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-block mt-2">{e.role}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingStaff({...e, pin: ''}); setShowStaffModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Edit3 size={18}/></button>
                                <button onClick={() => { if(confirm('Remove this employee?')) { db.deleteEmployee(e.id); refreshData(); } }} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 size={18}/></button>
                            </div>
                        </div>
                     ))}</div>
                </div>
            )}
            {adminTab === 'tables' && (
                <div>
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black italic dark:text-white">Table Configuration</h2>
                        <button onClick={()=>setShowTableModal(true)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">New Table</button>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">{tables.map((t: TableConfig) => (
                        <div key={t.id} className="bg-white dark:bg-slate-900 aspect-square rounded-3xl border-2 dark:border-slate-800 flex flex-col items-center justify-center font-black text-3xl dark:text-white relative group shadow-sm hover:border-brand-500 transition-all cursor-default">
                            {t.name}
                            <p className="text-[10px] uppercase text-slate-400 absolute bottom-4">Table</p>
                            <button onClick={()=>{ if(confirm('Delete table?')) { db.deleteTable(t.id); refreshData(); } }} className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                     ))}</div>
                </div>
            )}
        </main>
    )
}