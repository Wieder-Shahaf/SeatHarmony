import React, { useState } from 'react';

interface FeedbackModalProps {
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-2/5 relative h-48 md:h-auto bg-primary overflow-hidden group">
          <img
            src="https://images.unsplash.com/photo-1510076857177-7470076d4098?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            alt="Wedding setting"
            className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-8">
            <div className="mb-2">
              <span className="material-icons-round text-white text-4xl opacity-90">favorite</span>
            </div>
            <h2 className="font-display text-4xl text-white italic leading-tight mb-2">SeatHarmony</h2>
            <p className="text-white/90 text-base font-script tracking-wide">Crafting perfect moments, one seat at a time.</p>
          </div>
        </div>

        <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-primary dark:hover:text-white transition-colors"
          >
            <span className="material-icons-round">close</span>
          </button>

          <div className="mb-8 text-center md:text-left">
            <h1 className="font-display text-4xl md:text-5xl text-primary mb-3">Your Wedding, Your Way</h1>
            <p className="text-gray-500 dark:text-gray-300 font-light text-lg">
              Did our AI planner help bring your vision to life?
            </p>
          </div>

          <div className="mb-8 flex flex-col items-center md:items-start">
            <div className="flex flex-row-reverse gap-2 text-3xl mb-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className={`material-icons-round cursor-pointer transition-colors ${star <= (hoverRating || rating)
                    ? 'text-secondary'
                    : 'text-gray-300 dark:text-gray-600 hover:text-secondary/70'
                    }`}
                >
                  star
                </span>
              ))}
            </div>
            <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold">
              Rate your experience
            </span>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Leave a note (Optional)
            </label>
            <textarea
              className="w-full bg-gray-50 dark:bg-gray-700 border-0 rounded-xl p-4 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-gray-600 transition-all resize-none shadow-inner outline-none"
              placeholder="Tell us about your favorite feature..."
              rows={3}
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
            <button
              className="w-full sm:w-auto flex-1 bg-primary hover:bg-[#777b63] text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              onClick={onClose}
            >
              <span>Submit Feedback</span>
              <span className="material-icons-round text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;


