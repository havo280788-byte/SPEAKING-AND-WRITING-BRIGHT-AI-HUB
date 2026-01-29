import React from 'react';
import { getSelectedModelConfig } from '../services/geminiService';

interface Props {
    onClick: () => void;
    hasApiKey: boolean;
}

const SettingsButton: React.FC<Props> = ({ onClick, hasApiKey }) => {
    const currentModel = getSelectedModelConfig();

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
        >
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100 flex items-center justify-center transition-colors">
                <i className="fas fa-cog text-gray-500 group-hover:text-blue-600 transition-colors"></i>
            </div>

            {/* Text */}
            <div className="text-left">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">Settings</span>
                    {hasApiKey && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                            {currentModel.icon} {currentModel.name.replace('Gemini ', '')}
                        </span>
                    )}
                </div>
                <p className="text-xs text-red-500 font-semibold">
                    {hasApiKey ? 'Thay đổi API key hoặc model' : 'Lấy API key để sử dụng app'}
                </p>
            </div>
        </button>
    );
};

export default SettingsButton;
