import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2,
    ShieldCheck,
    CheckCircle2,
    MapPin
} from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const redirectPath = searchParams.get('redirect') || location.state?.redirect || location.state?.from;
    const qParam = searchParams.get('q') || location.state?.q || '';
    const vehicleTypeParam = searchParams.get('vehicleType') || location.state?.vehicleType || '';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await login(email, password);
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
                setError(res.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F8F8F6] flex items-center justify-center px-4 py-8 sm:py-12 selection:bg-[#2554D7] selection:text-white">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Brand & Trust Visual (Desktop only) */}
                <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-6 pr-2">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2FD] border border-[#D5E0FA] text-[#2554D7] text-xs font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Trusted Parking Network</span>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-[#1E2024] leading-tight">
                            Welcome back to easy, reserved parking.
                        </h1>

                        <p className="text-sm text-[#666970] leading-relaxed">
                            Access your dashboard, manage active spots, view reservations, and track earnings with total peace of mind.
                        </p>
                    </div>

                    {/* Visual Card / Live Preview Pill */}
                    <div className="p-4 rounded-2xl bg-white border border-[#EAEAE7] shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#EEF2FD] flex items-center justify-center text-[#2554D7]">
                                    <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#1E2024]">Indiranagar Metro</p>
                                    <p className="text-[10px] text-[#666970]">0.3 km away</p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Available
                            </span>
                        </div>

                        <div className="pt-2 border-t border-[#EAEAE7] flex items-center justify-between text-xs">
                            <span className="text-[#666970]">Instant Reservation</span>
                            <span className="font-bold text-[#1E2024]">{'\u20B9'}50 / hr</span>
                        </div>
                    </div>

                    {/* Compact Trust Signals */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2 text-xs text-[#666970]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2554D7] shrink-0" />
                            <span>Verified private spots and gated slots</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#666970]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2554D7] shrink-0" />
                            <span>Transparent pricing with zero hidden fees</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Authentication Card */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-2xl border border-[#EAEAE7] p-6 sm:p-10 shadow-xs">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold tracking-tight text-[#1E2024]">
                                Welcome back
                            </h2>
                            <p className="text-xs sm:text-sm text-[#666970] mt-1">
                                Sign in to your ParkShare account to continue.
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
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-[#1E2024]">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                </div>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Enter your password"
                                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#2554D7] hover:bg-[#1D44B8] text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-xs hover:shadow transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Switch to Register */}
                        <div className="mt-6 pt-5 border-t border-[#EAEAE7] text-center">
                            <p className="text-xs text-[#666970]">
                                Don't have an account?{' '}
                                <Link
                                    to={{ pathname: '/register', search: location.search }}
                                    state={location.state}
                                    className="text-[#2554D7] font-semibold hover:underline"
                                >
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;