import React, { useState, useRef } from 'react';

const PlannerAI: React.FC = () => {
  const [zoom, setZoom] = useState(1);
  const [showInsight, setShowInsight] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex-grow flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-white dark:bg-surface-dark border-r border-secondary/30 dark:border-gray-700 flex flex-col z-10 shadow-soft">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="flex items-center gap-2 font-display text-lg text-text-main dark:text-secondary mb-4">
            <span className="material-icons-round text-primary">list_alt</span> Guest List
          </h2>
          <div className="relative">
            <span className="material-icons-round absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
            <input type="text" className="w-full pl-9 pr-4 py-2 bg-background-light dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 text-gray-700 dark:text-gray-200 placeholder-gray-400" placeholder="Find a guest..." />
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
            <button className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs rounded-full whitespace-nowrap">
              <span className="material-icons-round text-[10px]">hourglass_empty</span> Unseated (12)
            </button>
            <button className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600">Bride's Family</button>
            <button className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600">Groom's Family</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Needs Placement</div>
          <div className="group bg-background-light dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:border-primary/50 cursor-grab active:cursor-grabbing flex items-center justify-between transition-all">
            <div className="flex items-center gap-3">
              <span className="material-icons-round text-gray-300 group-hover:text-primary cursor-grab">drag_indicator</span>
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  <span className="material-icons-round text-gray-400 text-xs">person</span> Aunt Margaret
                </p>
                <p className="text-xs text-gray-500">Bride's Family • Vegetarian</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center" title="Conflicts">
              <span className="material-icons-round text-orange-500 text-xs">warning</span>
            </div>
          </div>
          <div className="group bg-background-light dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:border-primary/50 cursor-grab active:cursor-grabbing flex items-center justify-between transition-all">
            <div className="flex items-center gap-3">
              <span className="material-icons-round text-gray-300 group-hover:text-primary cursor-grab">drag_indicator</span>
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  <span className="material-icons-round text-gray-400 text-xs">person</span> Uncle Bob
                </p>
                <p className="text-xs text-gray-500">Bride's Family</p>
              </div>
            </div>
          </div>
          <div className="group bg-background-light dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:border-primary/50 cursor-grab active:cursor-grabbing flex items-center justify-between transition-all">
            <div className="flex items-center gap-3">
              <span className="material-icons-round text-gray-300 group-hover:text-primary cursor-grab">drag_indicator</span>
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  <span className="material-icons-round text-gray-400 text-xs">person</span> Jessica Miller
                </p>
                <p className="text-xs text-gray-500">College Friend</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center" title="High Affinity">
              <span className="material-icons-round text-blue-500 text-xs">favorite</span>
            </div>
          </div>
          <div className="my-4 border-t border-gray-100 dark:border-gray-700"></div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Recently Placed</div>
          <div className="opacity-60 hover:opacity-100 transition-opacity">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 text-primary flex items-center justify-center text-xs font-bold">EL</div>
              <div>
                <p className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                  <span className="material-icons-round text-gray-400 text-xs">person</span> Emma Lewis
                </p>
                <p className="text-xs text-gray-400">Table 4</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <main
        className={`flex-1 bg-background-lighter dark:bg-background-dark pattern-grid relative overflow-hidden ${isPanning ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Floating Toolbar */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-surface-dark px-2 py-1.5 rounded-xl shadow-lg flex items-center gap-2 border border-secondary/20 dark:border-gray-700 z-30">
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Zoom Out">
            <span className="material-icons-round text-xl">remove</span>
          </button>
          <span className="text-xs font-mono text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" title="Zoom In">
            <span className="material-icons-round text-xl">add</span>
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1"></div>
          <button
            className={`p-2 rounded-lg transition-colors ${!isPanning ? 'text-primary bg-primary/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setIsPanning(false)}
            title="Select Tool"
          >
            <span className="material-icons-round text-xl">near_me</span>
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${isPanning ? 'text-primary bg-primary/10' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => setIsPanning(true)}
            title="Pan Tool"
          >
            <span className="material-icons-round text-xl">hand_gesture</span>
          </button>
        </div>

        {/* Canvas Area */}
        <div
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center p-20 origin-center transition-transform duration-75 ease-linear"
          style={{ transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom})` }}
        >
          {/* Table 1 */}
          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-48 h-48 rounded-full bg-white dark:bg-gray-800 border-4 border-secondary/50 dark:border-gray-600 shadow-lg flex items-center justify-center relative group">
              <span className="font-display text-2xl text-secondary dark:text-gray-500">1</span>
              {/* Chairs */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm"></div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm"></div>
              <div className="absolute top-1/2 -right-6 -translate-y-1/2 w-10 h-10 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm"></div>
              <div className="absolute top-1/2 -left-6 -translate-y-1/2 w-10 h-10 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm"></div>
            </div>
          </div>

          {/* Head Table (2) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="w-64 h-64 rounded-full bg-white dark:bg-gray-800 border-4 border-primary/40 dark:border-primary/20 shadow-xl flex flex-col items-center justify-center relative z-10">
                <span className="font-display text-4xl text-text-main dark:text-secondary mb-1">2</span>
                <span className="text-xs uppercase tracking-widest text-gray-400">Head Table</span>
              </div>
              {/* Guests */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm flex items-center justify-center z-0">
                <span className="text-xs font-bold text-text-main dark:text-secondary">Maid</span>
              </div>
              <div className="absolute top-[10%] right-[5%] w-12 h-12 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm flex items-center justify-center z-0">
                <span className="text-xs font-bold text-text-main dark:text-secondary">Best</span>
              </div>

              {/* Liam (Highlighted) */}
              <div className="absolute top-1/2 -right-8 -translate-y-1/2 z-20">
                <div
                  onClick={() => setShowInsight(true)}
                  className="w-14 h-14 rounded-full bg-primary text-white border-2 border-white dark:border-gray-800 shadow-md flex items-center justify-center relative ring-4 ring-primary/20 animate-pulse cursor-pointer hover:scale-110 transition-transform"
                >
                  <span className="text-xs font-bold">Liam</span>
                </div>
                {/* Tooltip */}
                {showInsight && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-64 z-50 animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-primary/20 dark:border-gray-600 p-4 relative">
                      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r border-primary/20 dark:border-gray-600 rotate-45"></div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-md p-1 shadow-sm">
                          <span className="material-icons-round text-sm block">auto_awesome</span>
                        </div>
                        <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 uppercase tracking-wide">AI Insight</span>
                      </div>
                      <h3 className="font-display text-lg leading-tight text-gray-900 dark:text-white mb-1">Why here?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        Placed near <span className="font-semibold text-primary dark:text-accent">Sarah</span> due to high affinity score and shared college history.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => setShowInsight(false)} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 px-2 py-1 rounded transition-colors">Dismiss</button>
                        <button className="text-xs bg-primary/10 hover:bg-primary/20 text-primary dark:text-accent px-2 py-1 rounded transition-colors font-semibold">View Details</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-[10%] right-[5%] w-12 h-12 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm z-0"></div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-accent text-white border border-white shadow-sm flex items-center justify-center z-0">
                <span className="text-xs font-bold">Sarah</span>
              </div>
              <div className="absolute bottom-[10%] left-[5%] w-12 h-12 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm z-0"></div>
              <div className="absolute top-1/2 -left-8 -translate-y-1/2 w-12 h-12 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm z-0"></div>
              <div className="absolute top-[10%] left-[5%] w-12 h-12 rounded-full bg-background-light dark:bg-gray-700 border border-secondary shadow-sm z-0"></div>
            </div>
          </div>

          {/* Table 3 */}
          <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2">
            <div className="w-40 h-40 rounded-full bg-white dark:bg-gray-800 border-4 border-secondary/50 dark:border-gray-600 shadow-lg flex items-center justify-center relative">
              <span className="font-display text-2xl text-secondary dark:text-gray-500">3</span>
              <div className="absolute -top-5 left-1/2 w-8 h-8 rounded-full bg-background-light border border-secondary"></div>
              <div className="absolute -bottom-5 left-1/2 w-8 h-8 rounded-full bg-background-light border border-secondary"></div>
              <div className="absolute top-1/2 -right-5 w-8 h-8 rounded-full bg-background-light border border-secondary"></div>
              <div className="absolute top-1/2 -left-5 w-8 h-8 rounded-full bg-background-light border border-secondary"></div>
            </div>
          </div>

        </div>

        {/* Legend */}
        <div className="absolute bottom-6 right-6 bg-white dark:bg-surface-dark p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-20 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-background-light dark:bg-gray-700 border border-secondary"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">VIP</span>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PlannerAI;