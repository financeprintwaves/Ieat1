import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Role } from '../types';
import { InventoryPanel } from './InventoryPanel';
import { AdminReports } from './AdminReports';
import { SettingsPanel } from './SettingsPanel';
import { BranchesPanel } from './BranchesPanel';
import { AdminForms } from './AdminForms';
import { ReportsPanel } from './ReportsPanel';

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
        <main className="flex-1 overflow-hidden">
            {adminTab === 'dashboard' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                    <ReportsPanel
                        orders={orders}
                        products={products}
                        employees={employees}
                        settings={settings}
                    />
                </div>
            )}
            {adminTab === 'inventory' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                    <AdminForms
                        formType="items"
                        items={products}
                        onRefresh={refreshData}
                    />
                </div>
            )}
            {adminTab === 'team' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                    <AdminForms
                        formType="staff"
                        staff={employees}
                        onRefresh={refreshData}
                    />
                </div>
            )}
            {adminTab === 'tables' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                    <AdminForms
                        formType="tables"
                        tables={tables}
                        onRefresh={refreshData}
                    />
                </div>
            )}
            {adminTab === 'branches' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                    <BranchesPanel branches={branches} refresh={refreshData} />
                </div>
            )}
            {adminTab === 'settings' && (
                <div className="h-full overflow-y-auto p-4 md:p-8">
                    <SettingsPanel settings={settings} onUpdate={setSettings} refresh={refreshData} />
                </div>
            )}
        </main>
    )
}