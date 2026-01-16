import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChefHat, Users as UsersIcon, Table as TableIcon } from 'lucide-react';
import { MenuItem, Employee, TableConfig, Role } from '../types';
import { Modal } from './Shared';
import { db, generateUUID } from '../services/db';

interface AdminFormsProps {
    formType: 'items' | 'staff' | 'tables';
    items?: MenuItem[];
    staff?: Employee[];
    tables?: TableConfig[];
    onRefresh: () => void;
}

export const AdminForms = ({ formType, items = [], staff = [], tables = [], onRefresh }: AdminFormsProps) => {
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [editingStaff, setEditingStaff] = useState<Partial<Employee> | null>(null);
    const [editingTable, setEditingTable] = useState<Partial<TableConfig> | null>(null);

    const handleAddNew = () => {
        if (formType === 'items') {
            setEditingItem({
                category: 'food',
                price: 0,
                cost: 0,
                stock: 0,
                lowStockThreshold: 10,
                isKitchenItem: false,
                menuCategory: 'general',
                isTrending: false
            });
        } else if (formType === 'staff') {
            setEditingStaff({ role: Role.Waiter, pin: '' });
        } else if (formType === 'tables') {
            setEditingTable({ capacity: 4 });
        }
        setShowModal(true);
    };

    const handleEdit = (item: any) => {
        if (formType === 'items') {
            setEditingItem(JSON.parse(JSON.stringify(item)));
        } else if (formType === 'staff') {
            setEditingStaff(JSON.parse(JSON.stringify(item)));
        } else if (formType === 'tables') {
            setEditingTable(JSON.parse(JSON.stringify(item)));
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (formType === 'items' && editingItem) {
                if (!editingItem.name || editingItem.price === undefined) {
                    alert('Please fill in all required fields');
                    return;
                }
                const itemData = editingItem as MenuItem;
                if (itemData.id) {
                    await db.updateProduct(itemData.id, itemData);
                } else {
                    itemData.id = generateUUID();
                    await db.addProduct(itemData);
                }
            } else if (formType === 'staff' && editingStaff) {
                if (!editingStaff.name || !editingStaff.pin) {
                    alert('Please fill in all required fields');
                    return;
                }
                const staffData = editingStaff as Employee;
                if (staffData.id) {
                    await db.updateEmployee(staffData.id, staffData);
                } else {
                    staffData.id = generateUUID();
                    await db.addEmployee(staffData);
                }
            } else if (formType === 'tables' && editingTable) {
                if (!editingTable.name) {
                    alert('Please fill in all required fields');
                    return;
                }
                const tableData = editingTable as TableConfig;
                if (tableData.id) {
                    await db.updateTable(tableData.id, tableData);
                } else {
                    tableData.id = generateUUID();
                    await db.addTable(tableData);
                }
            }
            setShowModal(false);
            setEditingItem(null);
            setEditingStaff(null);
            setEditingTable(null);
            onRefresh();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving data');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            if (formType === 'items') {
                await db.deleteProduct(id);
            } else if (formType === 'staff') {
                await db.deleteEmployee(id);
            } else if (formType === 'tables') {
                await db.deleteTable(id);
            }
            onRefresh();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error deleting item');
        }
    };

    const renderItemForm = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Item Name*</label>
                <input
                    type="text"
                    value={editingItem?.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Enter item name"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Category*</label>
                    <select
                        value={editingItem?.category || 'food'}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                        <option value="food">Food</option>
                        <option value="drink">Drink</option>
                        <option value="dessert">Dessert</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Menu Category</label>
                    <select
                        value={editingItem?.menuCategory || 'general'}
                        onChange={(e) => setEditingItem({ ...editingItem, menuCategory: e.target.value as any })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                        <option value="general">General</option>
                        <option value="indian-bar">Indian Bar</option>
                        <option value="arabic-bar">Arabic Bar</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Price*</label>
                    <input
                        type="number"
                        step="0.01"
                        value={editingItem?.price || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Cost</label>
                    <input
                        type="number"
                        step="0.01"
                        value={editingItem?.cost || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, cost: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Stock</label>
                    <input
                        type="number"
                        value={editingItem?.stock || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, stock: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="0"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Low Stock Threshold</label>
                    <input
                        type="number"
                        value={editingItem?.lowStockThreshold || 10}
                        onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: parseInt(e.target.value) || 10 })}
                        className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="10"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={editingItem?.isKitchenItem || false}
                        onChange={(e) => setEditingItem({ ...editingItem, isKitchenItem: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Kitchen Item</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={editingItem?.isTrending || false}
                        onChange={(e) => setEditingItem({ ...editingItem, isTrending: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Trending</span>
                </label>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Description</label>
                <textarea
                    value={editingItem?.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    rows={3}
                    placeholder="Enter item description"
                />
            </div>
        </div>
    );

    const renderStaffForm = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Name*</label>
                <input
                    type="text"
                    value={editingStaff?.name || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Enter staff name"
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Role*</label>
                <select
                    value={editingStaff?.role || Role.Waiter}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as Role })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                    <option value={Role.Admin}>Admin</option>
                    <option value={Role.Waiter}>Waiter</option>
                    <option value={Role.Kitchen}>Kitchen</option>
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">PIN (4 digits)*</label>
                <input
                    type="text"
                    maxLength={4}
                    value={editingStaff?.pin || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    placeholder="1234"
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Email</label>
                <input
                    type="email"
                    value={editingStaff?.email || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="staff@example.com"
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Phone</label>
                <input
                    type="tel"
                    value={editingStaff?.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="+968 1234 5678"
                />
            </div>
        </div>
    );

    const renderTableForm = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Table Number*</label>
                <input
                    type="text"
                    value={editingTable?.name || ''}
                    onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="e.g., 1, 2, 3 or A1, B2"
                />
            </div>

            <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-2">Seating Capacity</label>
                <input
                    type="number"
                    value={editingTable?.capacity || 4}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="4"
                />
            </div>
        </div>
    );

    const renderList = () => {
        if (formType === 'items') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg dark:text-white">{item.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{item.category}</span>
                                        {item.menuCategory && item.menuCategory !== 'general' && (
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${item.menuCategory === 'indian-bar' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.menuCategory === 'indian-bar' ? '🇮🇳' : '🇦🇪'}
                                            </span>
                                        )}
                                        {item.isKitchenItem && (
                                            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                                                <ChefHat size={10} /> Kitchen
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Edit2 size={16} className="text-blue-500" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Price:</span>
                                    <span className="font-bold dark:text-white">${item.price.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Stock:</span>
                                    <span className={`font-bold ${item.stock < item.lowStockThreshold ? 'text-red-500' : 'dark:text-white'}`}>{item.stock}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else if (formType === 'staff') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map((member) => (
                        <div key={member.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg dark:text-white">{member.name}</h3>
                                    <span className={`inline-block mt-1 text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                        member.role === Role.Admin ? 'bg-purple-100 text-purple-700' :
                                        member.role === Role.Waiter ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                        {member.role}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(member)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Edit2 size={16} className="text-blue-500" />
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 text-sm">
                                {member.email && (
                                    <div className="text-slate-600 dark:text-slate-400 truncate">{member.email}</div>
                                )}
                                {member.phone && (
                                    <div className="text-slate-600 dark:text-slate-400">{member.phone}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else if (formType === 'tables') {
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {tables.map((table) => (
                        <div key={table.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TableIcon size={20} className="text-slate-400" />
                                        <h3 className="font-bold text-lg dark:text-white">T-{table.name}</h3>
                                    </div>
                                    {table.capacity && (
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            Seats: {table.capacity}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => handleEdit(table)} className="flex-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <Edit2 size={14} className="text-blue-500 mx-auto" />
                                </button>
                                <button onClick={() => handleDelete(table.id)} className="flex-1 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <Trash2 size={14} className="text-red-500 mx-auto" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
    };

    const getTitle = () => {
        if (formType === 'items') return editingItem?.id ? 'Edit Item' : 'Add New Item';
        if (formType === 'staff') return editingStaff?.id ? 'Edit Staff' : 'Add New Staff';
        if (formType === 'tables') return editingTable?.id ? 'Edit Table' : 'Add New Table';
        return '';
    };

    const getIcon = () => {
        if (formType === 'items') return <ChefHat size={20} />;
        if (formType === 'staff') return <UsersIcon size={20} />;
        if (formType === 'tables') return <TableIcon size={20} />;
        return null;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white flex items-center gap-2">
                    {getIcon()}
                    {formType === 'items' ? 'Menu Items' : formType === 'staff' ? 'Staff Management' : 'Tables'}
                </h2>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold uppercase text-xs transition-all active:scale-95"
                >
                    <Plus size={16} /> Add New
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {renderList()}
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={getTitle()}>
                <div className="space-y-6">
                    {formType === 'items' && renderItemForm()}
                    {formType === 'staff' && renderStaffForm()}
                    {formType === 'tables' && renderTableForm()}

                    <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
                        <button
                            onClick={() => setShowModal(false)}
                            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold uppercase text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={16} className="inline mr-2" />
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold uppercase text-xs transition-colors active:scale-95"
                        >
                            <Save size={16} className="inline mr-2" />
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
