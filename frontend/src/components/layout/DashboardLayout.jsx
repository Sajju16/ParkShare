import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardLayout = ({ children, title, fullBleed = false }) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="h-screen bg-[#F8F8F6] flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar */}
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Mobile Top Header */}
                <header className="md:hidden sticky top-0 z-20 h-14 bg-white/95 backdrop-blur-md border-b border-[#EAEAE7] px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="p-1.5 -ml-1 text-[#1E2024] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                            aria-label="Open sidebar navigation"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#2554D7] flex items-center justify-center text-white">
                                <Car className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm text-[#1E2024]">
                                Park<span className="text-[#2554D7]">Share</span>
                            </span>
                        </Link>
                    </div>
                    {title && (
                        <span className="text-xs font-semibold text-[#666970] truncate max-w-[150px]">
                            {title}
                        </span>
                    )}
                </header>

                {/* Page Content */}
                <main className={`flex-1 flex flex-col min-h-0 ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;