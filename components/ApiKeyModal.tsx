import React, { useState, useEffect } from 'react';
import { TEXT_MODELS, ModelConfig, setApiKey, getApiKey, setSelectedModel, getSelectedModel } from '../services/geminiService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKey: string, modelId: string) => void;
    forceOpen?: boolean; // If true, user cannot close without saving
}

const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose, onSave, forceOpen = false }) => {
    const [apiKey, setApiKeyLocal] = useState('');
    const [selectedModelId, setSelectedModelIdLocal] = useState(TEXT_MODELS[0].id);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Load current values
            const storedKey = getApiKey();
            const storedModel = getSelectedModel();
            if (storedKey) setApiKeyLocal(storedKey);
            if (storedModel) setSelectedModelIdLocal(storedModel);
            setError('');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!apiKey.trim()) {
            setError('Vui lòng nhập API Key để tiếp tục.');
            return;
        }

        // Validate API key format (basic check)
        if (apiKey.trim().length < 20) {
            setError('API Key không hợp lệ. Vui lòng kiểm tra lại.');
            return;
        }

        // Save to service and localStorage
        setApiKey(apiKey.trim());
        setSelectedModel(selectedModelId);

        onSave(apiKey.trim(), selectedModelId);
        onClose();
    };

    const handleClose = () => {
        if (forceOpen && !getApiKey()) {
            setError('Bạn cần nhập API Key để sử dụng ứng dụng.');
            return;
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in-up">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-3xl z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <i className="fas fa-cog text-2xl"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-gray-900">Thiết lập Model & API Key</h2>
                            <p className="text-gray-500 text-sm mt-0.5">Cấu hình AI cho ứng dụng của bạn</p>
                        </div>
                    </div>
                    {!forceOpen && (
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Model Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">
                            1. Chọn Model AI
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {TEXT_MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => setSelectedModelIdLocal(model.id)}
                                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-center group ${selectedModelId === model.id
                                            ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                                        }`}
                                >
                                    {model.isDefault && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            Mặc định
                                        </span>
                                    )}
                                    <div className="text-3xl mb-2">{model.icon}</div>
                                    <div className={`font-bold text-sm ${selectedModelId === model.id ? 'text-blue-700' : 'text-gray-800'}`}>
                                        {model.name.replace('Gemini ', '')}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{model.description}</div>
                                    {selectedModelId === model.id && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <i className="fas fa-check text-white text-xs"></i>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            <i className="fas fa-info-circle mr-1"></i>
                            Nếu model gặp lỗi, hệ thống tự động chuyển sang model khác
                        </p>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                            2. API Key
                        </label>
                        <div className="relative">
                            <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="password"
                                placeholder="Nhập Gemini API Key của bạn..."
                                className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl text-base font-medium focus:outline-none transition-all ${error
                                        ? 'border-red-300 bg-red-50 focus:border-red-500'
                                        : 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white'
                                    }`}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKeyLocal(e.target.value);
                                    setError('');
                                }}
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                <i className="fas fa-exclamation-circle"></i>
                                {error}
                            </p>
                        )}

                        {/* Help Link */}
                        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                            <p className="text-sm text-amber-800 font-medium mb-2">
                                <i className="fas fa-lightbulb mr-2 text-amber-500"></i>
                                Chưa có API Key?
                            </p>
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-sm transition-colors"
                            >
                                <i className="fas fa-external-link-alt"></i>
                                Lấy API Key miễn phí tại Google AI Studio
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 rounded-b-3xl">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-save"></i>
                        Lưu và Tiếp tục
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
