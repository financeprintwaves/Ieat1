import React, { useState, useEffect } from 'react';
import { CreditCard, Gift, Trash2 } from 'lucide-react';
import { db, generateUUID } from '../services/db';
import { AppSettings, LoyaltyReward, Branch } from '../types';

export const SettingsPanel = ({ settings, onUpdate, refresh }: { settings: AppSettings; onUpdate: (s: AppSettings) => void; refresh: () => void }) => {
    const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
    const [newReward, setNewReward] = useState<Partial<LoyaltyReward>>({});
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        db.getRewards().then(setRewards);
        db.getBranches().then(setBranches);
    }, []);

    const handleAddReward = async () => {
        if (newReward.name && newReward.cost && newReward.value) {
            await db.addLoyaltyReward({
                id: generateUUID(),
                name: newReward.name,
                cost: newReward.cost,
                value: newReward.value
            });
            setNewReward({});
            db.getRewards().then(setRewards);
        }
    };

    const handleDeleteReward = async (id: string) => {
        await db.deleteLoyaltyReward(id);
        db.getRewards().then(setRewards);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black italic dark:text-white">Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2"><CreditCard size={18}/> General</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Currency Symbol</label>
                            <input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={settings.currencySymbol} onChange={e => onUpdate({...settings, currencySymbol: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Tax Rate (Decimal)</label>
                            <input className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" type="number" step="0.01" value={settings.taxRate} onChange={e => onUpdate({...settings, taxRate: parseFloat(e.target.value)})} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Current Branch</label>
                            <select 
                                className="w-full p-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
                                value={settings.currentBranchId} 
                                onChange={e => onUpdate({...settings, currentBranchId: e.target.value})}
                            >
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <button onClick={() => { db.saveSettings(settings); refresh(); }} className="w-full bg-slate-900 dark:bg-brand-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">Save Settings</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2"><Gift size={18}/> Loyalty Rewards</h3>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <input className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs" placeholder="Name (e.g. $5 Off)" value={newReward.name || ''} onChange={e=>setNewReward({...newReward, name: e.target.value})} />
                        <input className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs" type="number" placeholder="Cost (Pts)" value={newReward.cost || ''} onChange={e=>setNewReward({...newReward, cost: parseFloat(e.target.value)})} />
                        <input className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs" type="number" placeholder="Value ($)" value={newReward.value || ''} onChange={e=>setNewReward({...newReward, value: parseFloat(e.target.value)})} />
                    </div>
                    <button onClick={handleAddReward} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs py-2 rounded-lg mb-4 hover:bg-slate-200 dark:hover:bg-slate-700">Add Reward</button>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {rewards.map(r => (
                            <div key={r.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div>
                                    <p className="font-bold text-sm dark:text-white">{r.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{r.cost} Pts • ${r.value} Off</p>
                                </div>
                                <button onClick={() => handleDeleteReward(r.id)} className="text-red-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
};