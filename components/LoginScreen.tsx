import React, { useState, useEffect } from 'react';
import { Card, Button } from './Components';

// Full list of students provided (Unaccented / English alphabet)
const STUDENTS = [
  "Hoa Quang An", "Pham Quynh Anh", "Ha Thi Minh Anh", "Cao Nguyen Quynh Anh", "Tran Nguyet Anh",
  "Hoa Gia Binh", "Hoang Van Cong Chinh", "Nguyen Manh Cuong", "Tran Thi Dung", "Nguyen Thanh Dat",
  "Nguyen Phuc Dien", "Nguyen Trung Duc", "Nguyen Le Gia Han", "Nguyen Phuong Hien", "Nguyen Hoang Gia Huynh",
  "Duong Gia Hung", "Dinh Van Hung", "Le Dinh Khoi", "Nguyen Thi Ngoc Lan", "Huynh Dang Khanh Linh",
  "Pham Vu Thuy Linh", "Nguyen Bui Yen Linh", "Dang Hoang Long", "Nguyen Khanh Ly", "Tran Hoang Minh",
  "Tran Nu Nguyet Nga", "Tran Nhu Ngoc", "Le Thi Nhu Ngoc", "Tran Nu Bao Ngoc", "Tran Hoang Nguyen",
  "Nguyen Thao Nguyen", "Phan Duy Nguyen", "Nguyen Thi Thanh Nhan", "Bui Thien Nhan", "Nguyen Ngoc Uyen Nhi",
  "Vu Nguyen Tue Nhi", "Nguyen Hoang Tam Nhu", "Le Kim Phat", "Nguyen Ba Phi", "Dinh Xuan Hoang Phuc",
  "Ta Pham Minh Phuc", "Tran Huu Quang", "Nguyen Tien Sang", "Tran Minh Thong", "Vu Le Phuong Thuy",
  "Vo Bao Thuy", "Nguyen Anh Thu", "Le Trinh Anh Thu", "Pham Anh Thu", "Nguyen Thuy Tien",
  "Nguyen Phuong Uyen", "Vu Thi Ha Vy"
];

interface Props {
  onLogin: (name: string, apiKey: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Auto-fill from local storage if available
  useEffect(() => {
    const storedKey = localStorage.getItem('lingua_api_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const filteredStudents = STUDENTS.filter(student => 
    student.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogin = () => {
    if (!apiKey.trim()) {
        alert("Please enter a valid Gemini API Key to continue.");
        return;
    }
    if (!selectedStudent) {
        alert("Please select your name from the list.");
        return;
    }
    onLogin(selectedStudent, apiKey);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white flex flex-col items-center justify-center p-6 font-sans relative">
      <div className="w-full max-w-lg space-y-6 animate-fade-in-up z-10 my-auto">
        {/* Logo / Header */}
        <div className="text-center relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-400/20 blur-3xl rounded-full"></div>
            <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-4 transform rotate-3 hover:rotate-0 transition-all duration-300">
                <i className="fas fa-shapes text-4xl"></i>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Welcome Class!</h1>
            <p className="text-base text-gray-500">Enter API Key & select your name</p>
        </div>

        <Card className="!p-0 !rounded-3xl border border-white/60 shadow-xl backdrop-blur-xl bg-white/80 overflow-visible">
            {/* API Key Input Section */}
            <div className="p-6 bg-blue-50/50 border-b border-gray-100 rounded-t-3xl">
                 <label className="block text-sm font-bold text-gray-700 mb-2">1. Gemini API Key</label>
                 <div className="relative group">
                    <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input 
                        type="password" 
                        placeholder="Paste your key here..." 
                        className="w-full pl-14 pr-6 py-3.5 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all font-medium placeholder-gray-400 shadow-sm text-sm"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                 </div>
            </div>

            {/* List Header */}
            <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                <label className="block text-sm font-bold text-gray-700 mb-2">2. Find Your Name</label>
                <div className="relative group">
                    <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-blue-500 transition-colors"></i>
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="w-full pl-14 pr-6 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all text-base font-medium placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="h-[35vh] overflow-y-auto custom-scrollbar bg-transparent p-3 space-y-2">
                {filteredStudents.length > 0 ? (
                    filteredStudents.map((student, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedStudent(student)}
                            className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 flex items-center gap-3 border-2 ${
                                selectedStudent === student 
                                ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-100' 
                                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-colors ${
                                selectedStudent === student
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                                {student.charAt(0)}
                            </div>
                            <span className={`font-semibold text-base ${selectedStudent === student ? 'text-blue-700' : 'text-gray-700'}`}>{student}</span>
                            {selectedStudent === student && (
                                <div className="ml-auto text-blue-500">
                                    <i className="fas fa-check-circle text-xl"></i>
                                </div>
                            )}
                        </button>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        <p className="text-sm font-medium">No student found.</p>
                    </div>
                )}
            </div>
            
            {/* Login Action Area */}
            <div className="p-6 bg-white border-t border-gray-100 rounded-b-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20">
                <Button 
                    onClick={handleLogin} 
                    className="w-full py-4 text-lg shadow-xl shadow-blue-500/20"
                    disabled={!selectedStudent || !apiKey.trim()}
                >
                    Start Learning <i className="fas fa-arrow-right ml-2"></i>
                </Button>
                <p className="text-center text-xs text-gray-400 mt-3">
                    Ensure your API Key is valid before starting.
                </p>
            </div>
        </Card>
      </div>

      <footer className="mt-6 py-4 text-center text-orange-600 text-[10px] font-bold uppercase tracking-widest">
        DEVELOPED BY TEACHER VO THI THU HA - TRAN HUNG DAO HIGH SCHOOL - LAM DONG
      </footer>
    </div>
  );
};

export default LoginScreen;