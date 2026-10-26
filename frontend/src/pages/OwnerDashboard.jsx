import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, MapMarker, MarkerContent, MapControls, useMap } from '@/components/ui/map';
import api from '../services/api';
import {
    Plus,
    MapPin,
    Car,
    ShieldCheck,
    Zap,
    Tag,
    CalendarCheck,
    TrendingUp,
    X,
    Crosshair,
    Upload,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    Warehouse,
    CheckCircle2
} from 'lucide-react';

// Map recenter and resize helper using MapLibre / MapCN
const MapRecenter = ({ center }) => {
    const { map } = useMap();
    useEffect(() => {
        if (map && center && center[0] != null && center[1] != null) {
            map.resize();
            const currentZoom = map.getZoom();
            map.flyTo({
                center: [center[1], center[0]], // center is [lat, lng], convert to [lng, lat] for MapLibre
                zoom: currentZoom > 14 ? currentZoom : 14,
                duration: 600
            });
        }
    }, [center, map]);
    return null;
};

// Map click event listener for picking location
const MapClickListener = ({ enabled, onSelect }) => {
    const { map } = useMap();
    useEffect(() => {
        if (!map) return;
        const canvas = map.getCanvas();
        if (enabled && canvas) {
            canvas.style.cursor = 'crosshair';
        } else if (canvas) {
            canvas.style.cursor = '';
        }

        const handleClick = (e) => {
            if (!enabled) return;
            // MapLibre e.lngLat provides { lng, lat }
            onSelect(e.lngLat.lat, e.lngLat.lng);
        };
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
            if (canvas) canvas.style.cursor = '';
        };
    }, [map, enabled, onSelect]);
    return null;
};

const initialFormState = {
    title: '',
    description: '',
    address: '',
    city: '',
    zipCode: '',
    pricePerHour: '',
    pricePerDay: '',
    latitude: '',
    longitude: '',
    vehicleType: 'SEDAN',
    propertyType: 'HOUSE',
    isCovered: false,
    hasEvCharging: false
};

const OwnerDashboard = () => {
    const [spaces, setSpaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [spaceForm, setSpaceForm] = useState(initialFormState);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState('');
    const [isPinning, setIsPinning] = useState(false);
    const mapRef = useRef(null);

    // Auto-resize MapLibre canvas whenever the add space modal opens
    useEffect(() => {
        if (showForm && mapRef.current) {
            const timer = setTimeout(() => {
                mapRef.current?.resize();
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showForm]);

    useEffect(() => {
        fetchSpaces();
    }, []);

    // Clean up preview object URL if generated
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const fetchSpaces = async () => {
        setLoading(true);
        setFetchError('');
        try {
            const res = await api.get('/parking/owner');
            if (res.success) {
                setSpaces(res.data || []);
            } else {
                setFetchError('Could not load parking spaces.');
            }
        } catch (err) {
            console.error('Failed to fetch parking spaces', err);
            setFetchError('Failed to connect to the server. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    // Use My Current Location via browser Geolocation API
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocError('Geolocation is not supported by your browser.');
            return;
        }
        setLocLoading(true);
        setLocError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setSpaceForm(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude.toFixed(6),
                    longitude: pos.coords.longitude.toFixed(6)
                }));
                setIsPinning(false);
                setLocLoading(false);
            },
            (err) => {
                setLocLoading(false);
                setLocError('Could not retrieve location. Please grant permission or click on the map.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Map click handler (exits pinning mode after selecting location)
    const handleMapSelect = (lat, lng) => {
        setSpaceForm(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        }));
        setIsPinning(false);
    };

    const resetFormAndClose = () => {
        setShowForm(false);
        setIsPinning(false);
        setSpaceForm(initialFormState);
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setSubmitError('');
        setLocError('');
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        // Location Validation (-90 to +90 lat, -180 to +180 lng)
        const latNum = parseFloat(spaceForm.latitude);
        const lngNum = parseFloat(spaceForm.longitude);
        if (isNaN(latNum) || latNum < -90 || latNum > 90) {
            setSubmitError('Please select a valid location on the map (latitude must be between -90 and 90).');
            return;
        }
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
            setSubmitError('Please select a valid location on the map (longitude must be between -180 and 180).');
            return;
        }

        let images = [];

        if (file) {
            setUploading(true);
            const uploadForm = new FormData();
            uploadForm.append('file', file);
            try {
                const uploadRes = await api.post('/parking/upload-image', uploadForm, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (uploadRes.success) images.push(uploadRes.data);
            } catch (err) {
                console.error('Upload failed', err);
                setSubmitError('Image upload failed. Space will be saved without the image.');
            } finally {
                setUploading(false);
            }
        }

        const payload = {
            ...spaceForm,
            pricePerHour: parseFloat(spaceForm.pricePerHour) || 0,
            pricePerDay: spaceForm.pricePerDay ? parseFloat(spaceForm.pricePerDay) : null,
            latitude: latNum,
            longitude: lngNum,
            images
        };

        try {
            setUploading(true);
            const res = await api.post('/parking', payload);
            if (res.success) {
                resetFormAndClose();
                fetchSpaces();
            } else {
                setSubmitError(res.message || 'Failed to save parking space.');
            }
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to save parking space.');
        } finally {
            setUploading(false);
        }
    };

    const hasValidCoords = !isNaN(parseFloat(spaceForm.latitude)) && !isNaN(parseFloat(spaceForm.longitude));
    const currentMapCenter = hasValidCoords
        ? [parseFloat(spaceForm.latitude), parseFloat(spaceForm.longitude)]
        : [12.9716, 77.5946];

    return (
        <div className="w-full space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E2024]">
                        My Spaces
                    </h1>
                    <p className="text-sm text-[#666970] mt-1">
                        List and manage your parking spaces.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Parking Space</span>
                </button>
            </div>

            {/* Error Notification Banner */}
            {fetchError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{fetchError}</span>
                    </div>
                    <button
                        onClick={fetchSpaces}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-white rounded-2xl border border-[#EAEAE7] p-4 space-y-4 animate-pulse">
                            <div className="w-full h-44 bg-[#F8F8F6] rounded-xl" />
                            <div className="h-5 bg-[#F8F8F6] rounded-md w-3/4" />
                            <div className="h-4 bg-[#F8F8F6] rounded-md w-1/2" />
                            <div className="pt-2 border-t border-[#EAEAE7] flex justify-between">
                                <div className="h-4 bg-[#F8F8F6] rounded-md w-1/4" />
                                <div className="h-4 bg-[#F8F8F6] rounded-md w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : spaces.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-2xl border border-[#EAEAE7] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-[#EEF2FD] border border-[#D5E0FA] flex items-center justify-center mx-auto text-[#2554D7] mb-5 shadow-xs">
                        <Warehouse className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1E2024] tracking-tight mb-2">
                        You haven't added any parking spaces yet.
                    </h2>
                    <p className="text-sm text-[#666970] max-w-md mx-auto mb-6">
                        List your driveway, parking slot or private space and start earning.
                    </p>

                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white font-semibold text-sm transition-all shadow-xs hover:shadow cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Parking Space</span>
                    </button>

                    {/* Three Compact Feature Highlights */}
                    <div className="mt-10 pt-8 border-t border-[#EAEAE7] grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                        <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7]">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAE7] flex items-center justify-center text-[#2554D7] mb-2.5 shadow-xs">
                                <Tag className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-bold text-[#1E2024] uppercase tracking-wider mb-1">
                                Set Your Price
                            </h3>
                            <p className="text-xs text-[#666970] leading-relaxed">
                                Choose hourly or daily rates.
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7]">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAE7] flex items-center justify-center text-[#2554D7] mb-2.5 shadow-xs">
                                <CalendarCheck className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-bold text-[#1E2024] uppercase tracking-wider mb-1">
                                Manage Bookings
                            </h3>
                            <p className="text-xs text-[#666970] leading-relaxed">
                                View and respond to requests.
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#EAEAE7]">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAE7] flex items-center justify-center text-[#2554D7] mb-2.5 shadow-xs">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-bold text-[#1E2024] uppercase tracking-wider mb-1">
                                Earn Income
                            </h3>
                            <p className="text-xs text-[#666970] leading-relaxed">
                                Track your earnings easily.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Populated State (Active Parking Spaces Grid) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {spaces.map((space) => {
                        const hasImage = space.images && space.images.length > 0;
                        const isCovered = space.covered ?? space.isCovered;
                        const hasEv = space.evCharging ?? space.hasEvCharging;
                        const isAvailable = space.available !== false;

                        return (
                            <div
                                key={space.id}
                                className="bg-white rounded-2xl border border-[#EAEAE7] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                            >
                                {/* Card Media Header */}
                                <div className="relative h-48 w-full bg-[#F8F8F6] overflow-hidden border-b border-[#EAEAE7]">
                                    {hasImage ? (
                                        <img
                                            src={space.images[0]}
                                            alt={space.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1.5">
                                            <Car className="w-8 h-8 opacity-40 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500">No photo uploaded</span>
                                        </div>
                                    )}

                                    {/* Badges Overlay */}
                                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/95 backdrop-blur-xs text-[#2554D7] shadow-xs">
                                            {space.vehicleType || 'VEHICLE'}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-xs text-white">
                                            {space.propertyType === 'APARTMENT' ? 'Apartment' : 'House'}
                                        </span>
                                    </div>

                                    {/* Availability Status Badge */}
                                    <div className="absolute top-3 right-3 z-10">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-xs shadow-xs ${
                                            isAvailable
                                                ? 'bg-emerald-500/90 text-white'
                                                : 'bg-amber-500/90 text-white'
                                        }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            <span>{isAvailable ? 'Active' : 'Paused'}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-base text-[#1E2024] group-hover:text-[#2554D7] transition-colors tracking-tight line-clamp-1">
                                            {space.title}
                                        </h3>
                                        <p className="text-xs text-[#666970] flex items-center gap-1.5 line-clamp-1">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                            <span>{space.address}{space.city ? `, ${space.city}` : ''}</span>
                                        </p>

                                        {/* Amenities Chips */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            {isCovered && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-100">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    <span>Covered</span>
                                                </span>
                                            )}
                                            {hasEv && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#2554D7] text-[11px] font-medium border border-blue-100">
                                                    <Zap className="w-3 h-3" />
                                                    <span>EV Charging</span>
                                                </span>
                                            )}
                                            {space.latitude && space.longitude && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                                                    {parseFloat(space.latitude).toFixed(3)}, {parseFloat(space.longitude).toFixed(3)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer: Pricing and Action */}
                                    <div className="mt-5 pt-4 border-t border-[#EAEAE7] flex items-center justify-between">
                                        <div>
                                            <span className="text-lg font-bold text-[#1E2024]">
                                                {'\u20B9'}{space.pricePerHour}
                                            </span>
                                            <span className="text-xs text-[#666970] font-normal"> / hour</span>
                                            {space.pricePerDay && (
                                                <div className="text-[11px] text-gray-500">
                                                    {'\u20B9'}{space.pricePerDay} / day
                                                </div>
                                            )}
                                        </div>

                                        <Link
                                            to={`/parking/${space.id}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-[#EEF2FD] text-[#1E2024] hover:text-[#2554D7] text-xs font-semibold border border-[#EAEAE7] transition-colors"
                                        >
                                            <span>View</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Parking Space Modal Dialog */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
                    <div
                        className="bg-white rounded-2xl border border-[#EAEAE7] shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-[#EAEAE7] flex items-center justify-between bg-white sticky top-0 z-20">
                            <div>
                                <h2 className="text-lg font-bold text-[#1E2024]">Add New Parking Space</h2>
                                <p className="text-xs text-[#666970]">Enter space details and pin location on the map.</p>
                            </div>
                            <button
                                type="button"
                                onClick={resetFormAndClose}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#1E2024] hover:bg-gray-100 transition-colors cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            {submitError && (
                                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>{submitError}</span>
                                </div>
                            )}

                            {/* Section: Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    General Details
                                </h3>
                                <div>
                                    <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                        Space Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        placeholder="e.g. Covered Secure Driveway near Indiranagar Metro"
                                        required
                                        value={spaceForm.title}
                                        onChange={(e) => setSpaceForm({ ...spaceForm, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition resize-none"
                                        placeholder="Describe access instructions, gate rules, or space features..."
                                        value={spaceForm.description}
                                        onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                        Street Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                        placeholder="e.g. 42, 100ft Road, HAL 2nd Stage"
                                        required
                                        value={spaceForm.address}
                                        onChange={(e) => setSpaceForm({ ...spaceForm, address: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1">City</label>
                                        <input
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                            placeholder="e.g. Bengaluru"
                                            value={spaceForm.city}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1">Zip Code</label>
                                        <input
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] focus:ring-1 focus:ring-[#2554D7] bg-white transition"
                                            placeholder="e.g. 560038"
                                            value={spaceForm.zipCode}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, zipCode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                            Property Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] focus:outline-none focus:border-[#2554D7] bg-white transition"
                                            required
                                            value={spaceForm.propertyType}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, propertyType: e.target.value })}
                                        >
                                            <option value="HOUSE">House / Independent Villa</option>
                                            <option value="APARTMENT">Apartment / Residential Complex</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                            Vehicle Type <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] focus:outline-none focus:border-[#2554D7] bg-white transition"
                                            value={spaceForm.vehicleType}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, vehicleType: e.target.value })}
                                        >
                                            <option value="SEDAN">Sedan</option>
                                            <option value="HATCHBACK">Hatchback</option>
                                            <option value="SUV">SUV</option>
                                            <option value="BIKE">Bike / Two Wheeler</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Pricing */}
                            <div className="space-y-4 pt-2 border-t border-[#EAEAE7]">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Pricing
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                            Price Per Hour ({'\u20B9'}) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] bg-white transition"
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="e.g. 50"
                                            required
                                            value={spaceForm.pricePerHour}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, pricePerHour: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#1E2024] mb-1">
                                            Price Per Day ({'\u20B9'}) <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAEAE7] text-sm text-[#1E2024] placeholder-gray-400 focus:outline-none focus:border-[#2554D7] bg-white transition"
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="e.g. 400"
                                            value={spaceForm.pricePerDay}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, pricePerDay: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Amenities */}
                            <div className="space-y-3 pt-2 border-t border-[#EAEAE7]">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Amenities & Features
                                </h3>
                                <div className="flex flex-wrap gap-6">
                                    <label className="flex items-center gap-2.5 text-sm text-[#1E2024] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={spaceForm.isCovered}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, isCovered: e.target.checked })}
                                            className="w-4 h-4 rounded text-[#2554D7] border-gray-300 focus:ring-[#2554D7]"
                                        />
                                        <span>Covered Parking</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 text-sm text-[#1E2024] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={spaceForm.hasEvCharging}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, hasEvCharging: e.target.checked })}
                                            className="w-4 h-4 rounded text-[#2554D7] border-gray-300 focus:ring-[#2554D7]"
                                        />
                                        <span>EV Charging Available</span>
                                    </label>
                                </div>
                            </div>

                            {/* Section: Location Picker */}
                            <div className="space-y-3 pt-2 border-t border-[#EAEAE7]">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            Location on Map <span className="text-red-500">*</span>
                                        </h3>
                                        <p className="text-[11px] text-[#666970]">
                                            Click Pin Location to place your spot, or use your GPS coordinates.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => setIsPinning(!isPinning)}
                                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                isPinning
                                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                                    : 'bg-[#2554D7] hover:bg-[#1D44B8] text-white shadow-xs'
                                            }`}
                                        >
                                            {isPinning ? (
                                                <>
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>Cancel Pinning</span>
                                                </>
                                            ) : (
                                                <>
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span>Pin Location</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleUseCurrentLocation}
                                            disabled={locLoading}
                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FD] hover:bg-[#DCE5FC] text-[#2554D7] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <Crosshair className="w-3.5 h-3.5" />
                                            <span>{locLoading ? 'Locating...' : 'Use Current GPS'}</span>
                                        </button>
                                    </div>
                                </div>

                                {isPinning && (
                                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#2554D7] text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in duration-150">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 animate-bounce text-[#2554D7] shrink-0" />
                                            <span>Click anywhere on the map to place your parking pin.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsPinning(false)}
                                            className="text-xs font-bold underline hover:no-underline cursor-pointer shrink-0"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {locError && (
                                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                                        {locError}
                                    </div>
                                )}

                                {/* Location Status Banner: Selected vs Empty */}
                                {hasValidCoords ? (
                                    <div className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>
                                                Pinned Coordinates: <strong className="font-mono">{parseFloat(spaceForm.latitude).toFixed(6)}, {parseFloat(spaceForm.longitude).toFixed(6)}</strong>
                                            </span>
                                        </div>
                                        {!isPinning && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPinning(true)}
                                                className="text-emerald-700 hover:text-emerald-900 font-semibold underline text-[11px] cursor-pointer"
                                            >
                                                Reposition Pin
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>No location selected yet. Click <strong>Pin Location</strong> to click on the map, or use <strong>GPS</strong>.</span>
                                    </div>
                                )}

                                {/* MapCN Map Picker Container with Light CARTO Style */}
                                <div className="h-60 w-full rounded-xl overflow-hidden border border-[#EAEAE7] relative z-0 shadow-xs">
                                    <Map
                                        ref={mapRef}
                                        theme="light"
                                        styles={{
                                            light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
                                            dark: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                                        }}
                                        center={[currentMapCenter[1], currentMapCenter[0]]}
                                        zoom={13}
                                        scrollZoom={false}
                                        className="w-full h-full"
                                    >
                                        <MapControls position="bottom-right" showZoom={true} />
                                        <MapClickListener enabled={isPinning} onSelect={handleMapSelect} />
                                        {hasValidCoords && (
                                            <>
                                                <MapRecenter center={currentMapCenter} />
                                                <MapMarker
                                                    longitude={parseFloat(spaceForm.longitude)}
                                                    latitude={parseFloat(spaceForm.latitude)}
                                                    anchor="bottom"
                                                    draggable={false}
                                                >
                                                    <MarkerContent>
                                                        <div className="flex flex-col items-center cursor-pointer select-none">
                                                            <span className="px-2 py-0.5 rounded-md bg-[#1E2024] text-white text-[10px] font-bold shadow-md whitespace-nowrap mb-1">
                                                                Parking Location
                                                            </span>
                                                            <div className="relative flex items-center justify-center">
                                                                <span className="absolute -bottom-1 w-3 h-1 bg-black/30 rounded-full blur-[1px]" />
                                                                <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-red-500/20">
                                                                    <MapPin className="w-5 h-5 fill-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </MarkerContent>
                                                </MapMarker>
                                            </>
                                        )}
                                    </Map>
                                </div>

                                {/* Coordinate Inputs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                            Latitude (-90 to 90) *
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            placeholder="12.9716"
                                            value={spaceForm.latitude}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, latitude: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-[#EAEAE7] text-xs font-mono text-[#1E2024] bg-[#F8F8F6] focus:bg-white focus:outline-none focus:border-[#2554D7]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                                            Longitude (-180 to 180) *
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            required
                                            placeholder="77.5946"
                                            value={spaceForm.longitude}
                                            onChange={(e) => setSpaceForm({ ...spaceForm, longitude: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-[#EAEAE7] text-xs font-mono text-[#1E2024] bg-[#F8F8F6] focus:bg-white focus:outline-none focus:border-[#2554D7]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Photo Upload */}
                            <div className="space-y-3 pt-2 border-t border-[#EAEAE7]">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Space Photo (Optional)
                                </h3>
                                <div className="flex items-center gap-4">
                                    {previewUrl ? (
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#EAEAE7] shrink-0">
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-[#F8F8F6] border border-dashed border-[#EAEAE7] flex items-center justify-center text-gray-400 shrink-0">
                                            <Upload className="w-6 h-6 opacity-40 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EEF2FD] file:text-[#2554D7] hover:file:bg-[#DCE5FC] cursor-pointer"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-1">PNG, JPG, or WEBP up to 5MB.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-4 border-t border-[#EAEAE7] flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                                <button
                                    type="button"
                                    onClick={resetFormAndClose}
                                    className="px-4 py-2.5 rounded-xl border border-[#EAEAE7] hover:bg-gray-50 text-[#1E2024] text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-5 py-2.5 rounded-xl bg-[#2554D7] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Saving Space...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Save Parking Space</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerDashboard;