import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Download, ArrowUpCircle } from 'lucide-react';
import api from '../services/api';

const EarningsDashboard = () => {
    const [payments, setPayments] = useState([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [chartData, setChartData] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/payments/owner/completed');
            if (res.success) {
                const data = res.data;
                setPayments(data);
                
                // Calculate total earnings
                const total = data.reduce((sum, p) => sum + p.ownerEarnings, 0);
                setTotalEarnings(total);

                // Group by date for chart
                const grouped = data.reduce((acc, p) => {
                    const date = new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    acc[date] = (acc[date] || 0) + p.ownerEarnings;
                    return acc;
                }, {});

                const chartArray = Object.keys(grouped).map(date => ({
                    name: date,
                    earnings: grouped[date]
                })).reverse(); // Assuming descending order from backend, we want chronological for chart

                setChartData(chartArray);
            }
        } catch (err) {
            setError("Failed to load earnings data.");
        }
    };

    const handleWithdraw = () => {
        alert(`Withdraw request for $${totalEarnings.toFixed(2)} submitted successfully! (Simulation)`);
    };

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            <h1 className="text-4xl font-extrabold mb-8 text-gray-800">Earnings Dashboard</h1>
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-8 rounded-xl shadow-lg flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-green-100 uppercase tracking-wider text-sm font-semibold mb-2">Available to Withdraw</p>
                            <h2 className="text-5xl font-extrabold">${totalEarnings.toFixed(2)}</h2>
                        </div>
                        <div className="bg-white/20 p-3 rounded-full"><DollarSign size={32} /></div>
                    </div>
                    <button 
                        onClick={handleWithdraw}
                        className="mt-8 bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
                    >
                        <ArrowUpCircle size={20} /> Withdraw Funds
                    </button>
                </div>

                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Revenue Over Time</h3>
                    <div className="h-[250px] w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`$${value.toFixed(2)}`, 'Earnings']}
                                    />
                                    <Area type="monotone" dataKey="earnings" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">Not enough data to display chart</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Transaction ID</th>
                                <th className="px-6 py-4 font-semibold">Total Amount</th>
                                <th className="px-6 py-4 font-semibold">Platform Fee (10%)</th>
                                <th className="px-6 py-4 font-semibold">Your Earnings</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                                        {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-500">{p.razorpayPaymentId}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-700">${p.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm text-red-500">-${p.commission.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-green-600">${p.ownerEarnings.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500 italic">No completed transactions yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EarningsDashboard;
