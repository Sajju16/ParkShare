import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search,
    MapPin,
    Car,
    ShieldCheck,
    Key,
    Clock,
    Sparkles,
    AlertCircle,
    X,
    CheckCircle2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Landing = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // Search state
    const [searchLocation, setSearchLocation] = useState('');
    const [vehicleType, setVehicleType] = useState(''); // Default: All Vehicles

    // Role conflict modal state: 'OWNER_FINDING_PARKING' | 'DRIVER_LISTING_SPACE' | null
    const [conflictModal, setConflictModal] = useState(null);

    // Handle Find Parking
    const handleFindParking = (e) => {
        if (e) e.preventDefault();

        // 1. Unauthenticated visitor: navigate to /login preserving criteria & destination
        if (!user) {
            const params = new URLSearchParams();
            params.set('redirect', '/driver-dashboard');
            if (searchLocation.trim()) params.set('q', searchLocation.trim());
            if (vehicleType) params.set('vehicleType', vehicleType);

            navigate(`/login?${params.toString()}`, {
                state: {
                    redirect: '/driver-dashboard',
                    q: searchLocation.trim(),
                    vehicleType: vehicleType,
                },
            });
            return;
        }

        // 2. Authenticated as OWNER: do not silently grant or route into ProtectedRoute redirect
        if (user.role === 'OWNER') {
            setConflictModal('OWNER_FINDING_PARKING');
            return;
        }

        // 3. Authenticated as DRIVER: skip login and navigate directly
        const params = new URLSearchParams();
        if (searchLocation.trim()) params.set('q', searchLocation.trim());
        if (vehicleType) params.set('vehicleType', vehicleType);

        const targetUrl = `/driver-dashboard${params.toString() ? `?${params.toString()}` : ''}`;
        navigate(targetUrl, {
            state: {
                q: searchLocation.trim(),
                vehicleType: vehicleType,
            },
        });
    };

    // Handle List Your Space
    const handleListYourSpace = (e) => {
        if (e) e.preventDefault();

        // 1. Unauthenticated visitor: route to register with OWNER role intent preserved
        if (!user) {
            navigate('/register?role=OWNER&redirect=/owner-dashboard', {
                state: {
                    role: 'OWNER',
                    redirect: '/owner-dashboard',
                },
            });
            return;
        }

        // 2. Authenticated as OWNER: navigate directly to owner dashboard
        if (user.role === 'OWNER') {
            navigate('/owner-dashboard');
            return;
        }

        // 3. Authenticated as DRIVER: show role conflict warning
        if (user.role === 'DRIVER') {
            setConflictModal('DRIVER_LISTING_SPACE');
            return;
        }
    };

    // Account switch handlers
    const handleSwitchToDriver = () => {
        logout();
        setConflictModal(null);
        const params = new URLSearchParams();
        params.set('redirect', '/driver-dashboard');
        if (searchLocation.trim()) params.set('q', searchLocation.trim());
        if (vehicleType) params.set('vehicleType', vehicleType);

        navigate(`/login?${params.toString()}`, {
            state: {
                redirect: '/driver-dashboard',
                q: searchLocation.trim(),
                vehicleType: vehicleType,
            },
        });
    };

    const handleSwitchToOwner = () => {
        logout();
        setConflictModal(null);
        navigate('/register?role=OWNER&redirect=/owner-dashboard', {
            state: {
                role: 'OWNER',
                redirect: '/owner-dashboard',
            },
        });
    };

    return (
        <div className="bg-[#F8F8F6] text-[#1E2024] min-h-[calc(100vh-4rem)] flex flex-col justify-between">
            {/* â”€â”€ HERO SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-20 my-auto">
                {/* Subtle decorative glow */}
                <div
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[300px] bg-gradient-to-tr from-[#EEF2FD]/80 to-[#EAEAE7]/50 rounded-full blur-3xl opacity-60 pointer-events-none -z-10"
                    aria-hidden="true"
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                        {/* Left Column: Headline, Search, Owner Prompt, Compact Benefits */}
                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                            {/* Small Label */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EEF2FD] text-[#2554D7] border border-[#2554D7]/20 shadow-2xs">
                                <Sparkles className="w-3.5 h-3.5 text-[#2554D7]" />
                                <span>P2P Parking Marketplace</span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#1E2024] leading-[1.12]">
                                Find a parking spot <br className="hidden sm:inline" />
                                <span className="text-[#2554D7]">near you.</span>
                            </h1>

                            {/* Supporting Text */}
                            <p className="text-base sm:text-lg text-[#666970] font-normal leading-relaxed max-w-lg mx-auto lg:mx-0">
                                Search. Book. Park with peace of mind.
                            </p>

                            {/* Prominent Search Control */}
                            <form
                                onSubmit={handleFindParking}
                                className="bg-white border border-[#EAEAE7] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 max-w-xl mx-auto lg:mx-0"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    {/* Location Input */}
                                    <div className="sm:col-span-7">
                                        <label htmlFor="search-location" className="block text-xs font-semibold text-[#666970] mb-1 text-left">
                                            Location
                                        </label>
                                        <div className="relative">
                                            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                id="search-location"
                                                type="text"
                                                value={searchLocation}
                                                onChange={(e) => setSearchLocation(e.target.value)}
                                                placeholder="City, neighborhood, or area"
                                                className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#F8F8F6] border border-[#EAEAE7] rounded-xl text-[#1E2024] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2554D7]/20 focus:border-[#2554D7]"
                                            />
                                        </div>
                                    </div>

                                    {/* Vehicle Type Selector (Using Supported Types) */}
                                    <div className="sm:col-span-5">
                                        <label htmlFor="search-vehicle-type" className="block text-xs font-semibold text-[#666970] mb-1 text-left">
                                            Vehicle Type
                                        </label>
                                        <div className="relative">
                                            <Car className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <select
                                                id="search-vehicle-type"
                                                value={vehicleType}
                                                onChange={(e) => setVehicleType(e.target.value)}
                                                className="w-full pl-9 pr-8 py-2.5 text-sm bg-[#F8F8F6] border border-[#EAEAE7] rounded-xl text-[#1E2024] focus:outline-none focus:ring-2 focus:ring-[#2554D7]/20 focus:border-[#2554D7] appearance-none cursor-pointer"
                                            >
                                                <option value="">All Vehicles</option>
                                                <option value="SEDAN">Sedan</option>
                                                <option value="HATCHBACK">Hatchback</option>
                                                <option value="SUV">SUV</option>
                                                <option value="BIKE">Bike / Two-Wheeler</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Find Parking Action Button */}
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex items-center justify-center gap-2 bg-[#2554D7] hover:bg-[#1D44B8] text-white py-3 rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer active:scale-[0.99]"
                                    >
                                        <Search className="w-4 h-4" />
                                        Find Parking
                                    </button>
                                </div>
                            </form>

                            {/* Owner CTA below search bar */}
                            <div className="pt-1 text-sm text-[#666970]">
                                Have an unused parking space?{' '}
                                <button
                                    type="button"
                                    onClick={handleListYourSpace}
                                    className="font-semibold text-[#2554D7] hover:underline cursor-pointer inline-flex items-center gap-1"
                                >
                                    List it on ParkShare &rarr;
                                </button>
                            </div>

                            {/* Compact Benefit Labels (3 Supported Claims) */}
                            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-[#666970]">
                                <div className="inline-flex items-center gap-1.5 font-medium">
                                    <ShieldCheck className="w-4 h-4 text-[#2554D7]" />
                                    <span>Guaranteed Spot Reservations</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 font-medium">
                                    <Key className="w-4 h-4 text-[#2554D7]" />
                                    <span>Dual-OTP Check-In Security</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5 font-medium">
                                    <Clock className="w-4 h-4 text-[#2554D7]" />
                                    <span>Transparent Hourly Rates</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: High-Quality Illustrative Parking/Car Visual */}
                        <div className="lg:col-span-5">
                            <div className="relative mx-auto max-w-md lg:max-w-none">
                                {/* Illustrative Card Container */}
                                <div className="bg-white rounded-2xl border border-[#EAEAE7] shadow-md p-6 space-y-5">
                                    {/* Header of Illustrative Visual */}
                                    <div className="flex items-center justify-between pb-3 border-b border-[#EAEAE7]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-[#EEF2FD] text-[#2554D7] flex items-center justify-center">
                                                <Car className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-[#1E2024]">Reserved Bay Preview</div>
                                                <div className="text-[11px] text-[#666970]">Private Space Reservation</div>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Reserved & Ready
                                        </span>
                                    </div>

                                    {/* Illustrative Parking Bay Graphic */}
                                    <div className="relative h-56 bg-gradient-to-b from-[#F8F8F6] to-[#ECECE8] rounded-xl border border-[#EAEAE7] overflow-hidden flex flex-col items-center justify-center p-4">
                                        {/* Stylized Parking Slot Lines */}
                                        <div className="absolute inset-x-8 top-4 bottom-4 border-2 border-dashed border-[#2554D7]/30 rounded-lg flex items-center justify-center">
                                            <div className="w-full flex justify-between px-3 text-[10px] font-mono font-bold text-[#2554D7]/40 uppercase tracking-widest">
                                                <span>BAY A-1</span>
                                                <span>PARKSHARE</span>
                                            </div>
                                        </div>

                                        {/* Center Vehicle Graphic */}
                                        <div className="relative z-10 bg-white p-4 rounded-2xl border border-[#EAEAE7] shadow-sm flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 rounded-xl bg-[#2554D7] text-white flex items-center justify-center shadow-xs">
                                                <Car className="w-9 h-9" />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-[#1E2024]">Dedicated Private Bay</div>
                                                <div className="text-[11px] text-[#666970]">OTP Guarded Access</div>
                                            </div>
                                        </div>

                                        {/* Micro Badges inside visual */}
                                        <div className="absolute bottom-2.5 inset-x-4 flex justify-between text-[10px] text-[#666970]">
                                            <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-[#EAEAE7]">
                                                Off-street driveway
                                            </span>
                                            <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-[#EAEAE7]">
                                                Upfront pricing
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer of Illustrative Card */}
                                    <div className="pt-1 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-[#666970]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2554D7]" />
                                            <span>Instant booking confirmation</span>
                                        </div>
                                        <span className="text-[11px] text-gray-400 italic">
                                            Illustrative preview
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <footer className="bg-[#F8F8F6] border-t border-[#EAEAE7] py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Brand & One-line description */}
                        <div className="space-y-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <div className="w-6 h-6 rounded-lg bg-[#2554D7] flex items-center justify-center text-white">
                                    <Car className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-bold tracking-tight text-[#1E2024]">
                                    Park<span className="text-[#2554D7]">Share</span>
                                </span>
                            </div>
                            <p className="text-xs text-[#666970] max-w-md">
                                Peer-to-peer parking marketplace connecting drivers who need convenient spots with property owners renting out their spaces.
                            </p>
                        </div>

                        {/* Minimal Links */}
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#666970]">
                            <Link to="/driver-dashboard" className="hover:text-[#2554D7] transition-colors">
                                Explore Parking
                            </Link>
                            <button
                                type="button"
                                onClick={handleListYourSpace}
                                className="hover:text-[#2554D7] transition-colors cursor-pointer"
                            >
                                List Your Space
                            </button>
                            {!user ? (
                                <>
                                    <Link to="/login" className="hover:text-[#2554D7] transition-colors">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="hover:text-[#2554D7] transition-colors">
                                        Sign Up
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    to={user.role === 'OWNER' ? '/owner-dashboard' : '/driver-dashboard'}
                                    className="text-[#2554D7] font-semibold hover:underline"
                                >
                                    My Dashboard &rarr;
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className="mt-6 pt-6 border-t border-[#EAEAE7] text-center text-[11px] text-[#666970]">
                        Â© {new Date().getFullYear()} ParkShare. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* â”€â”€ ROLE CONFLICT MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {conflictModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl border border-[#EAEAE7] max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <button
                                onClick={() => setConflictModal(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-[#1E2024]">
                                {conflictModal === 'OWNER_FINDING_PARKING'
                                    ? 'Driver Account Required'
                                    : 'Property Owner Account Required'}
                            </h3>
                            <p className="text-xs text-[#666970] leading-relaxed">
                                {conflictModal === 'OWNER_FINDING_PARKING'
                                    ? 'You are currently signed in as a Property Owner. Searching and booking parking slots requires a Driver account. To continue, please switch accounts or sign in as a driver.'
                                    : 'You are currently signed in as a Driver. Listing parking spaces requires a Property Owner account. To continue, please switch accounts or register as an owner.'}
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAEAE7]">
                            <button
                                type="button"
                                onClick={() => setConflictModal(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                            >
                                Dismiss
                            </button>
                            <button
                                type="button"
                                onClick={
                                    conflictModal === 'OWNER_FINDING_PARKING'
                                        ? handleSwitchToDriver
                                        : handleSwitchToOwner
                                }
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#2554D7] hover:bg-[#1D44B8] rounded-xl transition cursor-pointer"
                            >
                                {conflictModal === 'OWNER_FINDING_PARKING'
                                    ? 'Sign In as Driver'
                                    : 'Register as Owner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Landing;