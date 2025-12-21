import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  return (
    <div className="flex-grow p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Analysis</span>
            <span className="material-icons-round text-xs">chevron_right</span>
            <span className="flex items-center gap-1 text-primary dark:text-accent font-medium">
               <span className="material-icons-round text-sm">dashboard</span> Cluster View
            </span>
          </div>
          <h2 className="font-display text-4xl text-text-main dark:text-white mb-2">Guest Group Orientation</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-xl">
            Our AI has detected <span className="font-bold text-primary">6 distinct clusters</span> from your guest list. 
            Review these groupings to ensure everyone is seated with their tribe.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-secondary text-text-main dark:text-accent hover:bg-secondary/10 transition-colors bg-white dark:bg-transparent">
            <span className="material-icons-round text-sm">filter_list</span>
            Filter
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white shadow-md hover:bg-opacity-90 transition-transform hover:-translate-y-0.5">
            <span className="material-icons-round text-sm">auto_fix_high</span>
            Regenerate AI Sort
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">people</span> Total Guests
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-text-main dark:text-white">142</span>
            <span className="text-green-600 text-sm flex items-center bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
              <span className="material-icons-round text-xs mr-1">check_circle</span> Confirmed
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">hourglass_empty</span> Unassigned
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-orange-400">8</span>
            <span className="text-gray-400 text-sm">Guests pending</span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">favorite</span> Avg. Affinity
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-primary">94%</span>
            <span className="text-gray-400 text-sm">Match score</span>
          </div>
        </div>
        <Link to="/export" className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-secondary/20 flex flex-col relative overflow-hidden group cursor-pointer hover:border-primary transition-colors">
          <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-icons-round text-6xl text-primary">download</span>
          </div>
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">
            <span className="material-icons-round text-sm">download</span> Export
          </span>
          <div className="flex items-center gap-2 mt-auto">
            <span className="font-semibold text-text-main dark:text-accent">Download Report</span>
            <span className="material-icons-round text-sm">arrow_forward</span>
          </div>
        </Link>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        
        {/* Card 1 */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-md border-t-4 border-primary hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-2 rounded-lg">
                <span className="material-icons-round">family_restroom</span>
              </div>
              <div>
                <h3 className="font-display text-xl text-text-main dark:text-white font-semibold">Bride's Family</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide">High Priority</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-primary"><span className="material-icons-round">more_vert</span></button>
          </div>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Size</span>
              <span className="font-bold text-gray-800 dark:text-white">12 Guests</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
            <div className="flex -space-x-2 overflow-hidden py-2">
               {[1,2,3,4].map((i) => (
                  <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark object-cover" src={`https://ui-avatars.com/api/?name=User+${i}&background=8A8E75&color=fff`} alt="" />
               ))}
               <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 font-medium">+8</div>
            </div>
          </div>
          <div className="bg-secondary/10 dark:bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs text-text-main dark:text-accent italic font-display">
              "Close relations detected. Suggested tables: 1 & 2 near head table."
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-md border-t-4 border-slate-400 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 p-2 rounded-lg">
                <span className="material-icons-round">school</span>
              </div>
              <div>
                <h3 className="font-display text-xl text-text-main dark:text-white font-semibold">Uni Friends</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Standard</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-primary"><span className="material-icons-round">more_vert</span></button>
          </div>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Size</span>
              <span className="font-bold text-gray-800 dark:text-white">24 Guests</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-slate-400 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <div className="flex -space-x-2 overflow-hidden py-2">
               {[1,2,3].map((i) => (
                  <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark object-cover" src={`https://ui-avatars.com/api/?name=Student+${i}&background=94a3b8&color=fff`} alt="" />
               ))}
               <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 font-medium">+21</div>
            </div>
          </div>
           <div className="bg-secondary/10 dark:bg-gray-700/50 rounded-xl p-3 flex justify-between items-center">
             <div className="flex gap-2">
                <span className="px-2 py-1 bg-white dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-500">Loud</span>
                <span className="px-2 py-1 bg-white dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-500">Dance Floor</span>
             </div>
           </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-md border-t-4 border-secondary hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/20 text-text-main p-2 rounded-lg">
                <span className="material-icons-round">work</span>
              </div>
              <div>
                <h3 className="font-display text-xl text-text-main dark:text-white font-semibold">Work Colleagues</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Mixed Group</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-secondary"><span className="material-icons-round">more_vert</span></button>
          </div>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Size</span>
              <span className="font-bold text-gray-800 dark:text-white">18 Guests</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-secondary h-2 rounded-full" style={{ width: '70%' }}></div>
            </div>
            <div className="flex -space-x-2 overflow-hidden py-2">
               {[1,2].map((i) => (
                  <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark object-cover" src={`https://ui-avatars.com/api/?name=Work+${i}&background=D5C7AD&color=fff`} alt="" />
               ))}
               <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-surface-dark bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 font-medium">+16</div>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 flex items-start gap-2">
            <span className="material-icons-round text-red-400 text-sm mt-0.5">warning</span>
            <p className="text-xs text-red-800 dark:text-red-200">
              Potential conflict detected between Guest #42 and #18.
            </p>
          </div>
        </div>

        {/* Card 4 - Create New */}
        <div className="border-2 border-dashed border-secondary/50 dark:border-gray-600 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] hover:bg-secondary/10 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
          <div className="h-12 w-12 rounded-full bg-secondary/20 dark:bg-gray-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-primary text-2xl">add</span>
          </div>
          <h3 className="font-display text-lg text-text-main dark:text-accent font-medium">Create New Cluster</h3>
          <p className="text-sm text-gray-500 text-center mt-2">Manually group remaining guests</p>
        </div>

      </div>

      <div className="fixed bottom-8 right-8 z-40">
        <button className="h-14 w-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
          <span className="material-icons-round text-2xl">chat_bubble</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;