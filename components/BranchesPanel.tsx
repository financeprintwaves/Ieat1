import React, { useState } from 'react';
import { MapPin, Edit3, Trash2, Plus, Store } from 'lucide-react';
import { Branch } from '../types';
import { db, generateUUID } from '../services/db';

export const BranchesPanel = ({ branches, refresh }: { branches: Branch[], refresh: () => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentBranch, setCurrentBranch] = useState<Partial<Branch>>({});

    const handleSave = async () => {
        if (!currentBranch.name) return;
        
        if (currentBranch.id) {
            await db.updateBranch(currentBranch.id, currentBranch);
        } else {
            await db.addBranch({
                id: generateUUID(),
                name: currentBranch.name,
                address: currentBranch.address || ''
            });
        }
        setIsEditing(false);
        setCurrentBranch({});
        refresh();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure? This might affect historical data.')) {
            await db.deleteBranch(id);
            refresh();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic dark:text-white flex items-center gap-2">
                    <Store className="text-brand-500" /> Branches
                </h2>
                <button 
                    onClick={() => { setCurrentBranch({}); setIsEditing(true); }}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus size={16}/> Add Branch
                </button>
            </div>

            {isEditing && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border dark:border-slate-800 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold mb-4 dark:text-white">{currentBranch.id ? 'Edit Branch' : 'New Branch'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Branch Name</label>
                            <input 
                                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                value={currentBranch.name || ''}
                                onChange={e => setCurrentBranch({...currentBranch, name: e.target.value})}
                                placeholder="e.g. Downtown Branch"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Address</label>
                            <input 
                                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                value={currentBranch.address || ''}
                                onChange={e => setCurrentBranch({...currentBranch, address: e.target.value})}
                                placeholder="e.g. 123 Main St"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleSave} className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700">Save</button>
                        <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-brand-600 dark:text-brand-400 mb-4">
                                <Store size={24} />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setCurrentBranch(branch); setIsEditing(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit3 size={18}/></button>
                                <button onClick={() => handleDelete(branch.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-lg dark:text-white mb-1">{branch.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                            <MapPin size={14} />
                            {branch.address || 'No address set'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};