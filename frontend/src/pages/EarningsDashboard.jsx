import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    DollarSign,
    ArrowUpRight,
    TrendingUp,
    Shield,
    Receipt,
    RotateCw,
    AlertTriangle,
    CheckCircle,
    Calendar,
    ArrowDownLeft,
    Clock,
    CreditCard,
    Check
} from 'lucide-react';
import api from '../services/api';

/** Formats a number as an Indian Rupee string: \u20B960.00 */
const formatINR = (amount) => `\u20B9${Number(amount || 0).toFixed(2)}`;

const EarningsDashboard = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [chartData, setChartData] = useState([]);
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [withdrawSuccess, setWithdrawSuccess] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/payments/owner/completed');
            if (res.success) {
                const data = res.data || [];
                setPayments(data);

                // Group by date for chart (chronological order)
                const grouped = data.reduce((acc, p) => {
                    const date = new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    acc[date] = (acc[date] || 0) + (p.ownerEarnings || 0);
                    return acc;
                }, {});

                const chartArray = Object.keys(grouped).map((date) => ({
                    name: date,
                    earnings: grouped[date]
                })).reverse();

                setChartData(chartArray);
            } else {
                setError('Could not retrieve payment settlements.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load earnings data.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate real financial aggregations strictly from backend data
    const totalEarnings = payments.reduce((sum, p) => sum + (p.ownerEarnings || 0), 0);
    const totalGross = payments.reduce((sum, p) => sum + ((p.settledAmount != null ? p.settledAmount : p.amount) || 0), 0);
    const totalCommission = payments.reduce((sum, p) => sum + (p.commission || 0), 0);
    const totalRefunds = payments.reduce((sum, p) => sum + (p.refundAdjustment || 0), 0);

    const handleWithdrawConfirm = () => {
        setWithdrawSuccess(true);
        setTimeout(() => {
            setWithdrawSuccess(false);
            setWithdrawModalOpen(false);
        }, 1500);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1E2024]">Earnings & Settlements</h1>
                    <p className="text-xs text-[#666970] mt-1">
                        Track rental revenue, platform commissions, early departure refunds, and payout settlements.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 rounded-xl border border-[#EAEAE7] bg-white hover:bg-gray-50 text-[#1E2024] transition-colors cursor-pointer"
                        title="Refresh Settlements"
                    >
                        <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2554D7]' : 'text-gray-500'}`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setWithdrawModalOpen(true)}
                        disabled={totalEarnings <= 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Withdraw Funds</span>
                    </button>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="underline font-semibold hover:text-red-800 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* 4 Financial Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Available / Net Payout */}
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Net Owner Earnings
                        </span>
                        <p className="text-xl font-bold text-emerald-700 truncate">
                            {formatINR(totalEarnings)}
                        </p>
                    </div>
                </div>

                {/* Gross Volume */}
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2554D7] shrink-0">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Gross Rental Volume
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {formatINR(totalGross)}
                        </p>
                    </div>
                </div>

                {/* Platform Commission */}
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Platform Fee (10%)
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {formatINR(totalCommission)}
                        </p>
                    </div>
                </div>

                {/* Completed Transactions */}
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-5 shadow-xs flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                        <Receipt className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-[#666970] uppercase tracking-wider block">
                            Settled Transactions
                        </span>
                        <p className="text-xl font-bold text-[#1E2024] truncate">
                            {payments.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Revenue Over Time Chart */}
            <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-base font-bold text-[#1E2024]">Revenue Over Time</h3>
                        <p className="text-xs text-[#666970]">Chronological history of settled owner rental payouts</p>
                    </div>
                    <span className="text-xs font-semibold text-[#2554D7] bg-[#EEF2FD] border border-[#D5E0FA] px-2.5 py-1 rounded-lg self-start sm:self-auto">
                        Net Payouts (after 10% fee)
                    </span>
                </div>

                <div className="h-[260px] w-full pt-2">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorParkShare" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2554D7" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#2554D7" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAE7" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#666970"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#666970"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `\u20B9${v}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '12px',
                                        border: '1px solid #EAEAE7',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                        fontSize: '12px'
                                    }}
                                    formatter={(value) => [`\u20B9${Number(value).toFixed(2)}`, 'Net Earnings']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="earnings"
                                    stroke="#2554D7"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorParkShare)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#666970] space-y-2">
                            <Clock className="w-8 h-8 text-gray-400" />
                            <p className="text-xs">No settled transactions yet to generate revenue chart.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Settlements & Transactions Table */}
            <div className="bg-white rounded-2xl border border-[#EAEAE7] shadow-xs overflow-hidden">
                <div className="p-5 border-b border-[#EAEAE7] flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-[#1E2024]">Settlement History</h3>
                        <p className="text-xs text-[#666970]">Itemized record of driver payments and platform fees</p>
                    </div>
                    <span className="text-xs text-[#666970]">
                        {payments.length} {payments.length === 1 ? 'transaction' : 'transactions'}
                    </span>
                </div>

                {loading ? (
                    <div className="p-6 space-y-3 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 bg-[#F8F8F6] rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-[#F8F8F6] text-[#666970] border-b border-[#EAEAE7]">
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                    <th className="px-5 py-3 font-semibold">Space & Booking</th>
                                    <th className="px-5 py-3 font-semibold">Reference</th>
                                    <th className="px-5 py-3 font-semibold">Gross Paid</th>
                                    <th className="px-5 py-3 font-semibold">Fee (10%)</th>
                                    <th className="px-5 py-3 font-semibold">Your Net</th>
                                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EAEAE7]">
                                {payments.map((p) => {
                                    const grossPaid = p.settledAmount != null ? p.settledAmount : p.amount;
                                    const hasRefund = p.refundAdjustment > 0;

                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-5 py-4 text-[#1E2024] whitespace-nowrap font-medium">
                                                {new Date(p.createdAt).toLocaleDateString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-[#1E2024]">{p.parkingSpaceTitle || 'Parking Space'}</div>
                                                <span className="text-[11px] font-mono text-gray-500">Booking #{p.bookingId}</span>
                                            </td>
                                            <td className="px-5 py-4 font-mono text-gray-500 whitespace-nowrap">
                                                {p.razorpayPaymentId || '\u2014'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-[#1E2024]">{formatINR(grossPaid)}</div>
                                                {hasRefund && (
                                                    <span className="text-[10px] text-blue-600 block">
                                                        (Original {formatINR(p.amount)} - {formatINR(p.refundAdjustment)} refund)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-rose-600 font-medium whitespace-nowrap">
                                                -{formatINR(p.commission)}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-emerald-700 whitespace-nowrap">
                                                +{formatINR(p.ownerEarnings)}
                                            </td>
                                            <td className="px-5 py-4 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {payments.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-12 text-center text-[#666970]">
                                            <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="font-medium">No completed transactions yet.</p>
                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                Once drivers complete payment and reservations settle, itemized earnings will be recorded here.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Withdraw Modal */}
            {withdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-[#EAEAE7] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-[#1E2024]">Withdraw Rental Earnings</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Demo Simulation
                                </span>
                            </div>
                            <p className="text-xs text-[#666970] mt-1 leading-relaxed">
                                This action simulates the owner payout workflow. In production, this would trigger an automated transfer via your payment processor. No real bank transfer will be executed.
                            </p>
                        </div>

                        <div className="bg-[#F8F8F6] p-4 rounded-xl border border-[#EAEAE7] space-y-2 text-xs">
                            <div className="flex justify-between items-center text-[#666970]">
                                <span>Available Net Balance:</span>
                                <span className="text-base font-bold text-emerald-700">{formatINR(totalEarnings)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#666970]">
                                <span>Payout Method:</span>
                                <span className="font-semibold text-[#1E2024]">Simulated Bank Transfer (IMPS)</span>
                            </div>
                            <div className="flex justify-between items-center text-[#666970]">
                                <span>Execution Mode:</span>
                                <span className="font-semibold text-amber-700">Sandbox Simulation (No Real Money)</span>
                            </div>
                        </div>

                        {withdrawSuccess ? (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>Payout simulation completed! In production, this transfers {formatINR(totalEarnings)} to your bank account. No real funds were moved.</span>
                            </div>
                        ) : (
                            <div className="pt-2 flex justify-end gap-3 border-t border-[#EAEAE7]">
                                <button
                                    type="button"
                                    onClick={() => setWithdrawModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-[#EAEAE7] text-xs font-semibold text-[#1E2024] hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleWithdrawConfirm}
                                    className="px-4 py-2 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span>Simulate Withdrawal</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EarningsDashboard;
