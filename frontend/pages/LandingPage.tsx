import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useGuests } from '../src/context/GuestContext';
import { Guest, createGuestFromExcel } from '../src/types/models';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { initializeFromExcel, setIsLoading, setError } = useGuests();
  const [isDragging, setIsDragging] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setPendingFile(file);
      setShowInstructions(true);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleFileInputChange triggered', e.target.files);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log('File selected:', file.name);
      validateAndProcessFile(file);
    }
  };

  const parseExcelFile = async (file: File): Promise<Guest[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          // Get the first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

          if (jsonData.length === 0) {
            reject(new Error('The spreadsheet appears to be empty.'));
            return;
          }

          // Check for required columns (case-insensitive)
          const firstRow = jsonData[0];
          const columns = Object.keys(firstRow).map(k => k.toLowerCase());

          // Debug: log detected columns
          console.log('Detected columns:', Object.keys(firstRow));
          console.log('First row data:', firstRow);

          // Support "Proper Names" column (column W in the Excel)
          const hasName = columns.some(c => c === 'proper names' || c === 'name');
          const hasCategory = columns.some(c => c === 'category');

          if (!hasName || !hasCategory) {
            const missing = [];
            if (!hasName) missing.push('"Proper Names"');
            if (!hasCategory) missing.push('"Category"');
            reject(new Error(`Missing required column(s): ${missing.join(' and ')}. Please ensure your spreadsheet has the required columns.`));
            return;
          }

          // Find the actual column names (preserving original case)
          // Prefer "Proper Names" over "Name" if both exist
          const nameCol = Object.keys(firstRow).find(k => k.toLowerCase() === 'proper names')
            || Object.keys(firstRow).find(k => k.toLowerCase() === 'name')!;
          const categoryCol = Object.keys(firstRow).find(k => k.toLowerCase() === 'category')!;

          // Parse guests
          const guests: Guest[] = jsonData
            .filter(row => row[nameCol] && String(row[nameCol]).trim() !== '')
            .map((row, index) => {
              const name = String(row[nameCol]).trim();
              const category = row[categoryCol] ? String(row[categoryCol]).trim() : '';
              const id = `guest-${index + 1}-${name.toLowerCase().replace(/\s+/g, '-')}`;

              return createGuestFromExcel(id, name, category);
            });

          if (guests.length === 0) {
            reject(new Error('No valid guests found. Please ensure the "Name" column has data.'));
            return;
          }

          console.log(`Successfully parsed ${guests.length} guests from ${file.name}`);
          resolve(guests);
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          reject(new Error('Failed to parse the file. Please ensure it\'s a valid Excel or CSV file.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read the file. Please try again.'));
      };

      reader.readAsBinaryString(file);
    });
  };

  const validateAndProcessFile = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv');

    if (!isValidExtension) {
      setParseError('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setParseError(null);
    setIsLoading(true);

    try {
      const guests = await parseExcelFile(file);

      // Store guests in global context
      initializeFromExcel(guests);

      console.log(`Stored ${guests.length} guests in context`);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setParseError(message);
      setError(message);
      console.error('File processing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAreaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPendingFile(null); // Clear any pending file if manually clicking
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const proceedToFileSelection = async () => {
    setShowInstructions(false);

    if (pendingFile) {
      // If a file was dropped, process it now
      await validateAndProcessFile(pendingFile);
      setPendingFile(null);
    } else {
      // Otherwise open the file picker
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset value to allow selecting the same file again
        fileInputRef.current.click();
      }
    }
  };

  const downloadTemplate = () => {
    // Download the Excel template from the public folder
    const link = document.createElement('a');
    link.href = '/Template.xlsx';
    link.setAttribute('download', 'Guest_List_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const suggestedCategories = [
    "Groom's Parents", "Bride's Parents", "Groom's Siblings", "Bride's Siblings",
    "Grandparents", "Groom's Extended Family", "Bride's Extended Family",
    "Mutual Friends", "Groom's College Friends", "Bride's College Friends",
    "Groom's Childhood Friends", "Bride's Childhood Friends",
    "Groom's Work Colleagues", "Bride's Work Colleagues",
    "Neighbors", "Wedding Party", "Officiant"
  ];

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4 relative overflow-hidden bg-background-light dark:bg-background-dark min-h-screen">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-secondary/20 rounded-full blur-3xl dark:bg-primary/10"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-accent-beige/30 rounded-full blur-3xl dark:bg-accent-beige/10"></div>
      </div>

      {/* Hero Content */}
      <div className="max-w-4xl w-full text-center mt-7 md:mt-7 mb-4 animate-[fadeInUp_1s_ease-out]">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-surface-dark/60 border border-secondary/30 backdrop-blur-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
            <span className="material-icons-round text-sm">auto_awesome</span> AI-Powered Planning
          </span>
        </div>
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-medium leading-tight text-text-main dark:text-text-light mb-6">
          Create harmonious seating plans <br className="hidden md:block" />
          <span className="italic text-primary">without the stress.</span>
        </h1>
        <p className="text-lg md:text-xl text-text-main/80 dark:text-text-light/80 max-w-2xl mx-auto leading-relaxed mb-3">
          Upload your guest list and let our intelligent algorithm design the perfect layout for social harmony.
        </p>

        <button
          onClick={() => setShowInstructions(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-surface-dark border border-secondary text-text-main dark:text-text-light text-sm font-medium hover:bg-secondary/10 transition-all shadow-sm hover:shadow-md"
        >
          <span className="material-icons-round text-base text-primary">lightbulb</span>
          How it Works
        </button>
      </div>

      {/* Hidden File Input - Placed outside the card to avoid event conflicts */}
      <input
        type="file"
        id="file-upload-input"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="sr-only"
        aria-hidden="true"
      />

      {/* Upload Card */}
      <div className="w-full max-w-2xl mx-auto mb-20 relative z-10">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadAreaClick}
          className={`group relative bg-white dark:bg-surface-dark rounded-3xl p-8 md:p-12 shadow-soft border-2 border-dashed transition-all duration-300 ease-in-out cursor-pointer ${isDragging
            ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-[1.02]'
            : 'border-accent-beige dark:border-gray-600 hover:border-primary dark:hover:border-primary'
            }`}
        >

          <div className={`absolute inset-0 bg-primary/5 rounded-3xl transition-opacity pointer-events-none ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
          <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
            <div className={`w-20 h-20 rounded-full bg-background-light dark:bg-gray-800 flex items-center justify-center mb-2 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
              <span className="material-icons-outlined text-4xl text-primary">cloud_upload</span>
            </div>
            <h3 className="font-display text-2xl text-text-main dark:text-text-light">
              {isDragging ? 'Drop file here' : 'Upload your guest list'}
            </h3>
            <p className="text-text-main/60 dark:text-text-light/60 max-w-sm">
              Drag & drop your Excel or CSV file here to get started, or click the button below.
            </p>
            <div className="pt-4 w-full max-w-xs relative z-20">
              <button
                type="button"
                onClick={(e) => {
                  console.log('Choose File button clicked');
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('fileInputRef.current:', fileInputRef.current);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''; // Reset to allow re-selecting same file
                    console.log('Triggering file input click...');
                    fileInputRef.current.click();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-text-main dark:bg-accent-beige text-white dark:text-text-main font-bold py-3 px-6 rounded-lg hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all shadow-md cursor-pointer"
              >
                <span className="material-icons-outlined text-lg">folder_open</span>
                <span>Choose File</span>
              </button>
            </div>
            <p className="text-xs text-text-main/40 dark:text-text-light/40 mt-4">
              Supports .xlsx, .xls, .csv up to 10MB
            </p>

            {/* Error Message */}
            {parseError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg flex gap-2 items-start text-left">
                <span className="material-icons-round text-red-500 text-lg flex-shrink-0">error</span>
                <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Elements */}
        <div className="hidden md:block absolute -right-16 top-1/2 transform -translate-y-1/2 bg-white dark:bg-surface-dark p-4 rounded-xl shadow-lg border border-accent-beige/20 rotate-6 animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center text-primary">
              <span className="material-icons-outlined text-lg">groups</span>
            </div>
            <div>
              <p className="text-xs font-bold text-text-main dark:text-text-light">Perfect Match</p>
              <p className="text-[10px] text-text-main/60 dark:text-text-light/60">Aunt May & Uncle Ben</p>
            </div>
          </div>
        </div>
        <div className="hidden md:block absolute -left-12 top-10 bg-white dark:bg-surface-dark p-3 rounded-xl shadow-lg border border-accent-beige/20 -rotate-6 animate-bounce" style={{ animationDuration: '4s' }}>
          <div className="flex items-center gap-2">
            <span className="material-icons-outlined text-primary text-xl">check_circle</span>
            <p className="text-xs font-bold text-text-main dark:text-text-light">0 Conflicts</p>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16 w-full">
        <div className="bg-white/50 dark:bg-surface-dark/50 p-6 rounded-2xl border border-white dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4 text-primary">
            <span className="material-icons-outlined">psychology</span>
          </div>
          <h3 className="font-display text-xl mb-2 text-text-main dark:text-text-light">Smart Grouping</h3>
          <p className="text-sm text-text-main/70 dark:text-text-light/70 leading-relaxed">
            Our AI analyzes relationships to ensure everyone sits next to someone they enjoy.
          </p>
        </div>
        <div className="bg-white/50 dark:bg-surface-dark/50 p-6 rounded-2xl border border-white dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4 text-primary">
            <span className="material-icons-outlined">spa</span>
          </div>
          <h3 className="font-display text-xl mb-2 text-text-main dark:text-text-light">Stress Reduction</h3>
          <p className="text-sm text-text-main/70 dark:text-text-light/70 leading-relaxed">
            Save hours of manual shuffling. Let the algorithm do the heavy lifting for you.
          </p>
        </div>
        <div className="bg-white/50 dark:bg-surface-dark/50 p-6 rounded-2xl border border-white dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4 text-primary">
            <span className="material-icons-outlined">table_restaurant</span>
          </div>
          <h3 className="font-display text-xl mb-2 text-text-main dark:text-text-light">Visual Layouts</h3>
          <p className="text-sm text-text-main/70 dark:text-text-light/70 leading-relaxed">
            Visualize your reception floor plan and drag-and-drop to make final tweaks easily.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-text-main/10 dark:border-white/10 py-8 bg-white/40 dark:bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-main/60 dark:text-text-light/60">
            © 2024 SeatHarmony. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-text-main/60 dark:text-text-light/60 hover:text-primary">Privacy</a>
            <a href="#" className="text-sm text-text-main/60 dark:text-text-light/60 hover:text-primary">Terms</a>
            <a href="#" className="text-sm text-text-main/60 dark:text-text-light/60 hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white dark:bg-surface-dark w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-[zoomIn_0.3s_ease-out] relative">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
              <h2 className="flex items-center gap-2 font-display text-2xl md:text-3xl text-text-main dark:text-white">
                <span className="material-icons-round text-primary">edit_note</span> Prepare Your Guest List
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="material-icons-round text-gray-500 dark:text-gray-400">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar bg-white dark:bg-surface-dark">
              <div className="text-center mb-10">
                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                  For the best results, please format your spreadsheet exactly as shown below. Our AI uses these specific categories to find optimal seating arrangements.
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-12 items-start">
                {/* Left: Instructions & Visual */}
                <div className="w-full lg:w-1/2 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-bold text-text-main dark:text-white mb-1">Create Columns</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Create two columns in your spreadsheet: <span className="font-mono text-primary bg-primary/5 px-1 rounded">Proper Names</span> and <span className="font-mono text-primary bg-primary/5 px-1 rounded">Category</span>.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-bold text-text-main dark:text-white mb-1">Fill in Data</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add every guest's name in the "Proper Names" column and assign them a specific category from the list on the right.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-bold text-text-main dark:text-white mb-1">Save & Upload</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Save your file as .xlsx or .csv and we will handle the rest.</p>
                      </div>
                    </div>
                  </div>

                  {/* Spreadsheet Visual */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-600 font-bold w-1/2">Proper Names</th>
                          <th className="px-4 py-2 font-bold w-1/2">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200">Jane Doe</td>
                          <td className="px-4 py-2 text-primary dark:text-accent font-medium">Bride's College Friends</td>
                        </tr>
                        <tr className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200">John Smith</td>
                          <td className="px-4 py-2 text-primary dark:text-accent font-medium">Groom's Family</td>
                        </tr>
                        <tr className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200">Grandma Betty</td>
                          <td className="px-4 py-2 text-primary dark:text-accent font-medium">Bride's Extended Family</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg flex gap-3 items-start">
                    <span className="material-icons-round text-amber-500 text-lg mt-0.5">lightbulb</span>
                    <p className="text-xs text-amber-800 dark:text-amber-200"><strong>Tip:</strong> Ensure your column headers are exactly "Proper Names" and "Category" to prevent upload errors.</p>
                  </div>
                </div>

                {/* Right: Taxonomy Cloud */}
                <div className="w-full lg:w-1/2 bg-background-light dark:bg-gray-800/50 rounded-2xl p-6 border border-secondary/20">
                  <h4 className="font-display text-xl text-text-main dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-secondary">category</span>
                    Suggested Categories
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Use these specific group names in your "Category" column to help the AI understand relationships better.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedCategories.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-secondary/30 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 shadow-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-black/20 flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={downloadTemplate}
                className="px-6 py-3 rounded-xl border border-secondary text-text-main dark:text-gray-300 font-bold hover:bg-secondary/10 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-icons-outlined">download</span> Download Template
              </button>

              <button
                onClick={proceedToFileSelection}
                className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-[#777b63] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {pendingFile ? (
                  <>
                    <span>Continue with {pendingFile.name}</span>
                    <span className="material-icons-round">arrow_forward</span>
                  </>
                ) : (
                  <>
                    <span>I'm Ready, Select File</span>
                    <span className="material-icons-round">folder_open</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
