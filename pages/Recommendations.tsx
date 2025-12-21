import React from 'react';
import { Link } from 'react-router-dom';

const Recommendations: React.FC = () => {
  return (
    <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="text-center mb-16">
        <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-accent/20 text-primary dark:text-accent text-xs font-bold tracking-wider uppercase mb-4">
           <span className="material-icons-round text-sm">psychology</span> Tree-of-Thoughts Analysis Complete
        </span>
        <h1 className="flex items-center justify-center gap-2 font-display text-4xl md:text-5xl text-text-main dark:text-secondary mb-4">
           <span className="material-icons-round text-4xl text-primary">auto_awesome</span> Top 3 Recommendations
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Our AI has analyzed 15,000+ permutations based on your preferences for family unity and minimizing conflict. Here are the most harmonious arrangements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Option A */}
        <div className="group relative bg-white dark:bg-surface-dark rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden border border-secondary/20 dark:border-white/5 transform hover:-translate-y-1 h-full flex flex-col">
          <div className="absolute top-0 left-0 right-0 bg-primary h-1.5"></div>
          <div className="p-8 flex-grow">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-xl">
                <span className="material-icons-round text-primary text-2xl">family_restroom</span>
              </div>
              <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                <span className="text-sm font-bold text-green-700 dark:text-green-300">95/100</span>
                <span className="material-icons-round text-green-600 dark:text-green-400 text-sm">stars</span>
              </div>
            </div>
            <h2 className="flex items-center gap-2 font-display text-2xl text-text-main dark:text-white mb-2">
               <span className="material-icons-round">handshake</span> Option A: Maximum Unity
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">Ideally balances both sides of the family.</p>
            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Trade-off Summary</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-green-500 text-base mt-0.5">check_circle</span>
                  <span>Successfully separates conflicting cousins (Table 4 & 9).</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-green-500 text-base mt-0.5">check_circle</span>
                  <span>Parents are seated with close friends.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-amber-500 text-base mt-0.5">warning</span>
                  <span>Mixes work friends across two tables.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="p-6 pt-0 mt-auto">
            <Link to="/planner" className="w-full py-3 px-4 bg-primary hover:bg-[#777b63] text-white rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 flex justify-center items-center gap-2 group-hover:gap-3 transition-all">
              <span className="material-icons-round text-sm">auto_awesome</span> Select & Refine
              <span className="material-icons-round text-sm">arrow_forward</span>
            </Link>
            <div className="text-center mt-3">
              <a href="#" className="text-xs text-gray-400 hover:text-primary underline decoration-dotted">View Table Map Preview</a>
            </div>
          </div>
        </div>

        {/* Option B */}
        <div className="group relative bg-white dark:bg-surface-dark rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden border border-secondary/20 dark:border-white/5 transform hover:-translate-y-1 h-full flex flex-col">
          <div className="absolute top-0 left-0 right-0 bg-secondary h-1.5"></div>
          <div className="p-8 flex-grow">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-secondary/20 dark:bg-secondary/10 p-3 rounded-xl">
                <span className="material-icons-round text-text-main dark:text-secondary text-2xl">celebration</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">88/100</span>
              </div>
            </div>
            <h2 className="flex items-center gap-2 font-display text-2xl text-text-main dark:text-white mb-2">
               <span className="material-icons-round">celebration</span> Option B: Party Vibes
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">Optimized for dancing and conversation flow.</p>
            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Trade-off Summary</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-green-500 text-base mt-0.5">check_circle</span>
                  <span>Groups younger guests near the dance floor.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-amber-500 text-base mt-0.5">warning</span>
                  <span>Grandparents seated further from head table.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-amber-500 text-base mt-0.5">warning</span>
                  <span>High noise potential for Table 3.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="p-6 pt-0 mt-auto">
            <button className="w-full py-3 px-4 bg-white dark:bg-surface-light border-2 border-secondary text-text-main dark:text-surface-dark hover:bg-secondary hover:text-white dark:hover:text-white dark:hover:bg-secondary rounded-xl font-medium transition-colors flex justify-center items-center gap-2">
              <span className="material-icons-round text-sm">auto_awesome</span> Select & Refine
            </button>
            <div className="text-center mt-3">
              <a href="#" className="text-xs text-gray-400 hover:text-primary underline decoration-dotted">View Table Map Preview</a>
            </div>
          </div>
        </div>

        {/* Option C */}
        <div className="group relative bg-white dark:bg-surface-dark rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden border border-secondary/20 dark:border-white/5 transform hover:-translate-y-1 h-full flex flex-col">
          <div className="absolute top-0 left-0 right-0 bg-accent h-1.5"></div>
          <div className="p-8 flex-grow">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-accent/10 dark:bg-accent/30 p-3 rounded-xl">
                <span className="material-icons-round text-text-main dark:text-gray-200 text-2xl">handshake</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">82/100</span>
              </div>
            </div>
            <h2 className="flex items-center gap-2 font-display text-2xl text-text-main dark:text-white mb-2">
               <span className="material-icons-round">history_edu</span> Option C: Traditional
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">Strict adherence to family lines.</p>
            <div className="space-y-4 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Trade-off Summary</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-green-500 text-base mt-0.5">check_circle</span>
                  <span>Keeps immediate families entirely together.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-red-400 text-base mt-0.5">error</span>
                  <span>Does not separate conflicting cousins (Table 5).</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="material-icons-round text-amber-500 text-base mt-0.5">warning</span>
                  <span>Singles table feels isolated.</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="p-6 pt-0 mt-auto">
             <button className="w-full py-3 px-4 bg-white dark:bg-surface-light border-2 border-secondary text-text-main dark:text-surface-dark hover:bg-secondary hover:text-white dark:hover:text-white dark:hover:bg-secondary rounded-xl font-medium transition-colors flex justify-center items-center gap-2">
              <span className="material-icons-round text-sm">auto_awesome</span> Select & Refine
            </button>
            <div className="text-center mt-3">
              <a href="#" className="text-xs text-gray-400 hover:text-primary underline decoration-dotted">View Table Map Preview</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;