import React from 'react';

// --- Card Component ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-white rounded-[2rem] shadow-soft border border-white/50 overflow-hidden transition-all duration-300 hover:shadow-xl ${className}`}>
    {title && (
      <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30">
        <h3 className="font-bold text-xl text-gray-800 tracking-tight">{title}</h3>
      </div>
    )}
    <div className="p-8">{children}</div>
  </div>
);

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className = '', ...props }) => {
  const baseStyle = "px-8 py-3.5 rounded-2xl text-lg font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm";
  
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5",
    secondary: "bg-white text-gray-700 border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200",
    outline: "border-2 border-blue-500 text-blue-600 hover:bg-blue-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <>
          <i className="fas fa-circle-notch fa-spin"></i> Processing...
        </>
      ) : children}
    </button>
  );
};

// --- Score Circle ---
export const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const getColor = (s: number) => {
    if (s >= 8.0) return 'text-green-500 border-green-500 bg-green-50';
    if (s >= 6.0) return 'text-blue-500 border-blue-500 bg-blue-50';
    if (s >= 4.0) return 'text-yellow-500 border-yellow-500 bg-yellow-50';
    return 'text-red-500 border-red-500 bg-red-50';
  };

  return (
    <div className={`w-32 h-32 rounded-full border-[6px] flex items-center justify-center ${getColor(score)} shadow-inner transition-all duration-500 transform hover:scale-105`}>
      <span className="text-5xl font-extrabold tracking-tighter">{score.toFixed(1)}</span>
    </div>
  );
};

// --- Score Breakdown ---
export const ScoreBreakdown: React.FC<{ breakdown: Record<string, number>; max?: number }> = ({ breakdown, max = 10 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
    {Object.entries(breakdown).map(([key, value]) => {
      const val = value as number;
      return (
      <div key={key} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">
            <span>{key}</span>
            <span className="text-gray-800 text-base">{val}/{max}</span>
        </div>
        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-[2px]">
            <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                  val >= max * 0.8 ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                  val >= max * 0.5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                  'bg-gradient-to-r from-yellow-400 to-yellow-500'
                }`}
                style={{ width: `${(val / max) * 100}%` }}
            ></div>
        </div>
      </div>
    );
    })}
  </div>
);