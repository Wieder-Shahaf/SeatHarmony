import React from 'react';
import { Link } from 'react-router-dom';

const Confirmation: React.FC = () => {
  return (
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Actions */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-primary dark:text-accent font-bold mb-1">Step 3 of 3</p>
          <h1 className="flex items-center gap-3 font-display text-4xl text-text-main dark:text-secondary mb-2">
            <span className="material-icons-round text-primary text-4xl">check_circle</span> Final Confirmation
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
            Review the bird's eye view of your seating arrangement. Tables are color-coded by group affiliation. Confirm layout to finalize seating charts.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium flex items-center gap-2">
            <span className="material-icons-round text-sm">picture_as_pdf</span> Export PDF
          </button>
          <Link to="/export" className="px-6 py-2.5 rounded-full bg-primary hover:bg-opacity-90 text-white shadow-lg shadow-primary/30 transition font-medium flex items-center gap-2">
            <span className="material-icons-round text-sm">print</span> Confirm & Print
          </Link>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-250px)] min-h-[600px]">
        
        {/* Sidebar Info */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700">
            <h3 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
              <span className="material-icons-round text-secondary">map</span> Groups Legend
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-slate-400 block shadow-sm"></span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Groom's Side</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">4 Tables</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-red-300 block shadow-sm"></span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bride's Side</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">5 Tables</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-primary block shadow-sm"></span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mutual Friends</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">3 Tables</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-secondary block shadow-sm"></span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">VIP / Head Table</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">1 Table</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 dark:border-gray-700 flex-grow flex flex-col">
            <h3 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
               <span className="material-icons-round text-secondary">analytics</span> Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                <span className="block text-3xl font-display text-primary font-bold">128</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Guests</span>
              </div>
              <div className="bg-background-light dark:bg-gray-800 p-4 rounded-xl text-center border border-secondary/10 dark:border-gray-700">
                <span className="block text-3xl font-display text-primary font-bold">13</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Tables</span>
              </div>
            </div>
            <div className="mt-auto">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Unseated Guests</h4>
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                <span className="material-icons-round text-red-400 text-xl">warning</span>
                <span className="text-sm text-red-600 dark:text-red-300">0 guests remaining</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Great job! Everyone has a seat.</p>
            </div>
          </div>
        </div>

        {/* Large Map View */}
        <div className="lg:col-span-9 bg-white dark:bg-gray-800 rounded-3xl shadow-inner border border-secondary/20 dark:border-gray-700 relative overflow-hidden">
           <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Zoom In">
              <span className="material-icons-round">add</span>
            </button>
            <button className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Zoom Out">
              <span className="material-icons-round">remove</span>
            </button>
            <button className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition" title="Fit to Screen">
              <span className="material-icons-round">aspect_ratio</span>
            </button>
          </div>
          
          <div className="w-full h-full relative pattern-grid">
             {/* Head Table */}
             <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 flex flex-col items-center group cursor-pointer">
              <div className="w-64 h-24 bg-secondary/20 dark:bg-secondary/10 border-2 border-secondary rounded-xl flex items-center justify-center relative shadow-lg">
                <span className="font-display font-medium text-text-main dark:text-secondary">Head Table</span>
                <div className="absolute -top-3 flex gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border border-secondary shadow-sm"></div>)}
                </div>
              </div>
            </div>

            {/* Dance Floor */}
            <div className="absolute top-[35%] left-1/2 transform -translate-x-1/2 w-48 h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center opacity-50">
              <span className="text-sm text-gray-400 uppercase tracking-widest font-light">Dance Floor</span>
            </div>

            {/* Tables Groom Side */}
            <div className="absolute top-[30%] left-[15%] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-slate-400/20 dark:bg-slate-400/10 border-2 border-slate-400 flex items-center justify-center shadow-md">
                 <span className="font-bold text-slate-500 dark:text-slate-300 text-lg">1</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Smith Family</div>
            </div>

            <div className="absolute top-[55%] left-[12%] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-slate-400/20 dark:bg-slate-400/10 border-2 border-slate-400 flex items-center justify-center shadow-md">
                 <span className="font-bold text-slate-500 dark:text-slate-300 text-lg">2</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">College Friends</div>
            </div>

            <div className="absolute top-[75%] left-[20%] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-slate-400/20 dark:bg-slate-400/10 border-2 border-slate-400 flex items-center justify-center shadow-md">
                 <span className="font-bold text-slate-500 dark:text-slate-300 text-lg">3</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Work Colleagues</div>
            </div>

             {/* Tables Bride Side */}
             <div className="absolute top-[30%] right-[15%] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-red-300/30 dark:bg-red-300/10 border-2 border-red-300 flex items-center justify-center shadow-md">
                 <span className="font-bold text-red-400 dark:text-red-300 text-lg">4</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Jones Family</div>
            </div>

            <div className="absolute top-[55%] right-[12%] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-red-300/30 dark:bg-red-300/10 border-2 border-red-300 flex items-center justify-center shadow-md">
                 <span className="font-bold text-red-400 dark:text-red-300 text-lg">5</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Cousins</div>
            </div>

            <div className="absolute top-[75%] right-[20%] flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-red-300/30 dark:bg-red-300/10 border-2 border-red-300 flex items-center justify-center shadow-md">
                 <span className="font-bold text-red-400 dark:text-red-300 text-lg">6</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Childhood Friends</div>
            </div>

            {/* Mutuals */}
            <div className="absolute bottom-[10%] left-[40%] transform -translate-x-1/2 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-primary/20 dark:bg-primary/10 border-2 border-primary flex items-center justify-center shadow-md">
                 <span className="font-bold text-primary text-lg">7</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Mutuals</div>
            </div>

             <div className="absolute bottom-[10%] right-[40%] transform translate-x-1/2 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform">
               <div className="w-24 h-24 rounded-full bg-primary/20 dark:bg-primary/10 border-2 border-primary flex items-center justify-center shadow-md">
                 <span className="font-bold text-primary text-lg">8</span>
               </div>
               <div className="absolute inset-0 -m-3 border-[6px] border-dotted border-gray-200 dark:border-gray-600 rounded-full opacity-40"></div>
               <div className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Kids Table</div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Detail Rows */}
      <div className="mt-8">
        <h2 className="font-display text-2xl text-text-main dark:text-secondary mb-4">Table Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-secondary/20 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="h-2 bg-slate-400 w-full"></div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Table 1</h4>
                <span className="text-xs font-medium bg-slate-400/10 text-slate-500 px-2 py-1 rounded">Groom</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">8 Seats • Round Table</p>
              <ul className="space-y-1">
                 {['John Smith (Father)', 'Mary Smith (Mother)', 'Uncle Bob', 'Aunt Sarah', 'Cousin Mike'].map((n, i) => (
                   <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> {n}</li>
                 ))}
              </ul>
            </div>
          </div>
          
           <div className="bg-white dark:bg-surface-dark rounded-xl border border-secondary/20 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="h-2 bg-red-300 w-full"></div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Table 4</h4>
                <span className="text-xs font-medium bg-red-300/20 text-red-400 dark:text-red-300 px-2 py-1 rounded">Bride</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">8 Seats • Round Table</p>
               <ul className="space-y-1">
                 {['Robert Jones (Father)', 'Linda Jones (Mother)', 'Grandma Betty', 'Grandpa Joe'].map((n, i) => (
                   <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> {n}</li>
                 ))}
              </ul>
            </div>
          </div>

           <div className="bg-white dark:bg-surface-dark rounded-xl border border-secondary/20 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="h-2 bg-primary w-full"></div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Table 7</h4>
                <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded">Mutual</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">10 Seats • Round Table</p>
               <ul className="space-y-1">
                 {['Sarah Connor', 'Kyle Reese', 'Peter Parker', 'Mary Jane'].map((n, i) => (
                   <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> {n}</li>
                 ))}
              </ul>
            </div>
          </div>

           <div className="bg-white dark:bg-surface-dark rounded-xl border border-secondary/20 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="h-2 bg-secondary w-full"></div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Head Table</h4>
                <span className="text-xs font-medium bg-secondary/20 text-text-main dark:text-secondary px-2 py-1 rounded">VIP</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">12 Seats • Rectangular</p>
               <ul className="space-y-1">
                 {['Groom', 'Bride', 'Best Man', 'Maid of Honor'].map((n, i) => (
                   <li key={i} className={`text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 ${i < 2 ? 'font-bold' : ''}`}><div className={`w-1.5 h-1.5 rounded-full ${i < 2 ? 'bg-secondary' : 'bg-gray-300'}`}></div> {n}</li>
                 ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Confirmation;