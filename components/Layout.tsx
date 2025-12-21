import React, { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import FeedbackModal from './FeedbackModal';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const [showFeedback, setShowFeedback] = useState(false);

  // Simple dark mode toggle
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Venues', path: '/venues', icon: 'storefront' },
    { label: 'Recommendations', path: '/recommendations', icon: 'auto_awesome' },
    { label: 'Planner AI', path: '/planner', icon: 'psychology' },
    { label: 'Final Review', path: '/confirmation', icon: 'assignment_turned_in' },
    { label: 'Export', path: '/export', icon: 'download' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-body">
      {/* Navbar */}
      <nav className={`w-full px-6 py-4 flex items-center justify-between z-50 transition-colors duration-300 ${
        isLanding 
          ? 'bg-transparent absolute top-0 left-0 right-0 max-w-7xl mx-auto' 
          : 'bg-white/80 dark:bg-surface-dark/90 backdrop-blur-md border-b border-secondary/30 dark:border-gray-700 sticky top-0'
      }`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <span className="material-icons-round text-primary text-3xl">favorite</span>
          <span className={`font-display font-bold text-2xl tracking-tight ${isLanding ? 'text-text-main dark:text-text-light' : 'text-text-main dark:text-text-light'}`}>
            Seat<span className="italic text-primary">Harmony</span>
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {!isLanding ? (
            navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'text-primary font-bold border-b-2 border-primary pb-0.5'
                    : 'text-gray-500 hover:text-primary dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                <span className="material-icons-round text-lg">{link.icon}</span>
                {link.label}
              </Link>
            ))
          ) : (
            <>
              <a href="#" className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                <span className="material-icons-round text-lg">lightbulb</span> How it Works
              </a>
              <a href="#" className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                 <span className="material-icons-round text-lg">monetization_on</span> Pricing
              </a>
              <a href="#" className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                 <span className="material-icons-round text-lg">map</span> Sample Plans
              </a>
            </>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {!isLanding && (
            <button 
              onClick={() => setShowFeedback(true)}
              className="hidden md:flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:text-accent"
            >
              <span className="material-icons-round text-lg">rate_review</span> Feedback
            </button>
          )}
          
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-accent-beige/20 dark:bg-surface-dark hover:bg-accent-beige/40 transition-colors"
          >
            <span className="material-icons-round text-sm">light_mode</span>
          </button>

          {isLanding ? (
             <>
               <Link to="/dashboard" className="hidden sm:flex items-center gap-1 text-sm font-bold text-text-main dark:text-text-light hover:text-primary">
                 <span className="material-icons-round text-lg">login</span> Log In
               </Link>
               <Link to="/dashboard" className="flex items-center gap-2 bg-primary hover:bg-[#777b63] text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                  <span className="material-icons-round text-lg">rocket_launch</span> Get Started
               </Link>
             </>
          ) : (
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-secondary/20 text-gray-500 dark:text-gray-300 transition-colors">
                <span className="material-icons-round">notifications</span>
              </button>
              <div className="h-9 w-9 rounded-full bg-secondary overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm">
                <img src="https://ui-avatars.com/api/?name=James+Smith&background=D5C7AD&color=fff" alt="User Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col relative">
        <Outlet />
      </main>

      {/* Footer (Simplified) */}
      {!isLanding && (
         <footer className="border-t border-secondary/20 dark:border-gray-700 bg-surface-light dark:bg-surface-dark py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">© 2024 SeatHarmony. All rights reserved.</p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-primary transition text-sm">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-primary transition text-sm">Terms of Service</a>
                <a href="#" className="text-gray-400 hover:text-primary transition text-sm">Help Center</a>
              </div>
            </div>
        </footer>
      )}
      
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
};

export default Layout;