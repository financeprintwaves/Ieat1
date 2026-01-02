import React, { useState } from 'react';
import { Utensils, Trash2, ChevronRight } from 'lucide-react';
import { db } from '../services/db';
import { Employee } from '../types';

export const LoginScreen = ({ onLogin }: { onLogin: (user: Employee) => void }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    
    const handleLogin = async () => {
        const user = await db.authenticate(pin);
        if (user) onLogin(user);
        else {
            setError('Invalid PIN');
            setPin('');
            setTimeout(() => setError(''), 2000);
        }
    }
    
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white p-4">
            <div className="w-full max-w-xs flex flex-col items-center">
                <div className="mb-8 flex items-center gap-3 text-brand-400">
                    <Utensils size={40}/>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white">iEat POS</h1>
                </div>
                
                <div className="w-full bg-slate-800 p-6 rounded-3xl shadow-2xl border border-slate-700">
                    <input 
                        type="password" 
                        value={pin} 
                        readOnly
                        className="w-full bg-slate-900 border border-slate-700 text-center text-4xl tracking-[0.5em] p-4 rounded-xl mb-6 font-mono text-white focus:outline-none focus:border-brand-500 transition-colors h-20"
                        placeholder="••••"
                    />
                    {error && <div className="text-red-400 text-center mb-4 text-sm font-bold animate-pulse">{error}</div>}
                    
                    <div className="grid grid-cols-3 gap-3">
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                            <button key={n} onClick={() => setPin(p => (p + n).slice(0,4))} className="aspect-square bg-slate-700 rounded-xl font-bold text-2xl hover:bg-slate-600 transition-colors shadow-sm active:scale-95">{n}</button>
                        ))}
                        <button onClick={() => setPin('')} className="aspect-square bg-slate-700/50 rounded-xl font-bold text-lg hover:bg-red-900/30 text-red-400 transition-colors shadow-sm active:scale-95 flex items-center justify-center"><Trash2 size={24}/></button>
                        <button onClick={() => setPin(p => (p + '0').slice(0,4))} className="aspect-square bg-slate-700 rounded-xl font-bold text-2xl hover:bg-slate-600 transition-colors shadow-sm active:scale-95">0</button>
                        <button onClick={handleLogin} className="aspect-square bg-brand-600 rounded-xl font-bold text-lg hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-500/20 active:scale-95 flex items-center justify-center"><ChevronRight size={32}/></button>
                    </div>
                </div>
            </div>
        </div>
    )
};