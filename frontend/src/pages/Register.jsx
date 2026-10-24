import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import {
    Car,
    Warehouse,
    Mail,
    Lock,
    User,
    Phone,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';

const Register = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const redirectPath = searchParams.get('redirect') || location.state?.redirect || location.state?.from;
    const qParam = searchParams.get('q') || location.state?.q || '';
    const vehicleTypeParam = searchParams.get('vehicleType') || location.state?.vehicleType || '';
    const roleParam = searchParams.get('role') || location.state?.role;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: roleParam === 'OWNER' ? 'OWNER' : 'DRIVER',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await register(formData);
            if (res.success) {
                if (res.data.role === 'OWNER') {
                    if (redirectPath && redirectPath.startsWith('/owner')) {
                        navigate(redirectPath);
                    } else {
                        navigate('/owner-dashboard');
                    }
                } else {
                    const targetBase = redirectPath && redirectPath.startsWith('/driver') ? redirectPath : '/driver-dashboard';
                    const params = new URLSearchParams();
                    if (qParam) params.set('q', qParam);
                    if (vehicleTypeParam) params.set('vehicleType', vehicleTypeParam);
                    const targetUrl = `${targetBase}${params.toString() ? `?${params.toString()}` : ''}`;
                    navigate(targetUrl, { state: { q: qParam, vehicleType: vehicleTypeParam } });
                }
            } else {
                setError(res.message || 'Registration failed');
            }
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                (err.message === 'Network Error'
                    ? 'Unable to reach server. Please check that backend is running on http://localhost:8080.'
                    : err.message) ||
                'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F8F8F6] flex items-center justify-center px-4 py-8 sm:py-12 selection:bg-[#2554D7] selection:text-white">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Brand & Role Benefits (Desktop only) */}
                <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-6 pr-2">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FD] border border-[#D5E0FA] text-[#2554D7] text-xs font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified Community</span>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-[#1E2024] leading-tight">
                            Join ParkShare today.
                        </h1>

                        <p className="text-sm text-[#666970] leading-relaxed">
                            Whether you're commuting across town or monetizing your empty driveway, ParkShare connects you seamlessly.
                        </p>
                    </div>

                    {/* Role Value Highlights */}
                    <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#EEF2FD] flex items-center justify-center text-[#2554D7] shrink-0 mt-0.5">
                                <Car className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-[#1E2024]">For Drivers</h2>
                                <p className="text-[11px] text-[#666970] mt-0.5">
                                    Find verified private spots, compare prices, and book hourly or daily parking in seconds.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                                <Warehouse className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-[#1E2024]">For Space Owners</h2>
                                <p className="text-[11px] text-[#666970] mt-0.5">
                                    List driveways, garages, or residential slots and earn recurring income on your schedule.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Compact Trust Signals */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2 text-xs text-[#666970]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2554D7] shrink-0" />
                            <span>Free account registration in under 60 seconds</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#666970]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2554D7] shrink-0" />
                            <span>No subscription commitments or hidden fees</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Registration Card */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 sm:p-10 shadow-xs">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold tracking-tight text-[#1E2024]">
                                Create your account
                            </h2>
                            <p className="text-xs sm:text-sm text-[#666970] mt-1">
                                Start reserving spots or list your parking space.
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Role Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1E2024] mb-2">
                                    I want to:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: 'DRIVER' })}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                            formData.role === 'DRIVER'
                                                ? 'border-[#2554D7] bg-[#EEF2FD] shadow-xs ring-1 ring-[#2554D7]'
                                                : 'border-[#EAEAE7] bg-[#F8F8F6] hover:bg-white text-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <Car className={`w-4 h-4 ${formData.role === 'DRIVER' ? 'text-[#2554D7]' : 'text-gray-400'}`} />
                                            <span className={`w-2 h-2 rounded-full ${formData.role === 'DRIVER' ? 'bg-[#2554D7]' : 'bg-transparent'}`} />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${formData.role === 'DRIVER' ? 'text-[#2554D7]' : 'text-[#1E2024]'}`}>
                                                Find Parking
                                            </p>
                                            <p className="text-[10px] text-[#666970] mt-0.5">Driver account</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role: 'OWNER' })}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                            formData.role === 'OWNER'
                                                ? 'border-[#2554D7] bg-[#EEF2FD] shadow-xs ring-1 ring-[#2554D7]'
                                                : 'border-[#EAEAE7] bg-[#F8F8F6] hover:bg-white text-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full mb-1">
                                            <Warehouse className={`w-4 h-4 ${formData.role === 'OWNER' ? 'text-[#2554D7]' : 'text-gray-400'}`} />
                                            <span className={`w-2 h-2 rounded-full ${formData.role === 'OWNER' ? 'bg-[#2554D7]' : 'bg-transparent'}`} />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold ${formData.role === 'OWNER' ? 'text-[#2554D7]' : 'text-[#1E2024]'}`}>
                                                Rent My Space
                                            </p>
                                            <p className="text-[10px] text-[#666970] mt-0.5">Space owner</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Full Name Field */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1E2024] mb-1.5">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Alex Morgan"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1E2024] mb-1.5">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1E2024] mb-1.5">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        placeholder="Minimum 6 characters"
                                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1E2024] transition-colors cursor-pointer"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Phone Field */}
                            <div>
                                <label className="block text-xs font-semibold text-[#1E2024] mb-1.5">
                                    Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="tel"
                                        placeholder="e.g. 9876543210"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#2554D7] hover:bg-[#1D44B8] text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Creating account...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Create Account</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Switch to Login */}
                        <div className="mt-6 pt-5 border-t border-[#EAEAE7] text-center">
                            <p className="text-xs text-[#666970]">
                                Already have an account?{' '}
                                <Link
                                    to={{ pathname: '/login', search: location.search }}
                                    state={location.state}
                                    className="text-[#2554D7] font-semibold hover:underline"
                                >
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;