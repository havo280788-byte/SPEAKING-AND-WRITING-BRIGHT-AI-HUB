import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, ScoreCircle, ScoreBreakdown } from './Components';
import { analyzePronunciation, interactWithExaminer, gradeSpeakingSession, generateSpeech } from '../services/geminiService';
import { AIResponse, ChatMessage } from '../types';

interface Props {
  onComplete: (score: number) => void;
  studentName: string;
}

interface Unit {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  shadowingSentences: string[];
  freeSpeakingQuestions?: { question: string; hint: string }[];
}

const UNITS: Unit[] = [
  {
    id: 1,
    title: "Generation Gap and Independent Life",
    description: "Discuss the differences between generations in your family and how to live independently.",
    icon: "fa-users",
    color: "from-blue-500 to-cyan-500",
    shadowingSentences: [
      "Teenagers want freedom, but parents want control.",
      "Living independently helps young people grow up.",
      "Parents worry, but teens want to make their own decisions.",
      "The generation gap causes arguments at home.",
      "Understanding each other can close the generation gap."
    ],
    freeSpeakingQuestions: [
      { question: "What problems do teenagers often have with their parents? Why?", hint: "rules, clothes, friends, going out late" },
      { question: "Why do many teenagers want to live more independently?", hint: "freedom, decisions, responsibility" },
      { question: "In your opinion, why do parents worry so much about their children?", hint: "safety, future, school performance" },
      { question: "How can parents and teenagers reduce the generation gap?", hint: "communication, listening, understanding" },
      { question: "Do you think teenagers today are more independent than in the past? Why or why not?", hint: "Compare with previous generations & express personal opinion" }
    ]
  },
  {
    id: 2,
    title: "Vietnam and ASEAN",
    description: "Explain the role of Vietnam within the ASEAN community and the benefits of integration.",
    icon: "fa-flag",
    color: "from-red-500 to-pink-500",
    shadowingSentences: [
      "Vietnam is an active member of ASEAN.",
      "ASEAN countries work together for peace and development.",
      "Vietnam attracts many tourists with its rich culture.",
      "Cultural diversity makes ASEAN stronger.",
      "Cooperation helps ASEAN countries grow."
    ],
    freeSpeakingQuestions: [
      { question: "What do you like most about Vietnam compared with other ASEAN countries? Why?", hint: "culture, food, landscapes, cost of living" },
      { question: "If you could visit one ASEAN country, which one would you choose and what would you like to see there?", hint: "Singapore, Thailand, famous landmarks, natural beauty" },
      { question: "How does being a member of ASEAN benefit Vietnam?", hint: "economy, education, culture, tourism" },
      { question: "In what ways can students help promote Vietnamese culture to people from other ASEAN countries?", hint: "social media, cultural exchanges, volunteering" },
      { question: "Do you think cooperation among ASEAN countries is important in the future? Why or why not?", hint: "solidarity, solving common problems, economic strength" }
    ]
  },
  {
    id: 3,
    title: "Global Warming and Ecological Systems",
    description: "What are the main causes of global warming, and how does it affect our ecosystem?",
    icon: "fa-globe-asia",
    color: "from-green-500 to-emerald-600",
    shadowingSentences: [
      "Global warming is becoming a serious problem that affects many countries around the world.",
      "Human activities such as cutting down trees and using fossil fuels cause climate change.",
      "As the Earth gets warmer, extreme weather events happen more frequently.",
      "Reducing pollution is an important way to protect the environment and human health.",
      "If people do not take action now, global warming will have more serious effects in the future."
    ]
  },
  {
    id: 4,
    title: "World Heritage Site",
    description: "Describe a World Heritage Site you know and why it is important to preserve it.",
    icon: "fa-landmark",
    color: "from-yellow-500 to-orange-500",
    shadowingSentences: [
      "World heritage sites are important because they show the history and culture of different countries.",
      "Hoi An Ancient Town attracts many visitors thanks to its well-preserved buildings and traditions.",
      "If world heritage sites are not protected carefully, they may be damaged or destroyed.",
      "Many heritage sites face serious threats from tourism and environmental pollution.",
      "Protecting world heritage sites is a shared responsibility of governments and local communities."
    ]
  }
];

type PracticeMode = 'MENU' | 'SHADOWING' | 'FREE_SPEAKING' | 'SUMMARY';

// Helper to create WAV header for raw PCM data
const createWavUrl = (base64Audio: string, sampleRate = 24000): string => {
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  };

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, len, true);

  const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

const SpeakingPractice: React.FC<Props> = ({ onComplete, studentName }) => {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('MENU');
  
  // --- Score Tracking ---
  const [partScores, setPartScores] = useState({ part1: 0, part2: 0 });
  const [partCompletion, setPartCompletion] = useState({ part1: false, part2: false });

  // Shadowing State
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isPlayingSample, setIsPlayingSample] = useState(false);

  // Free Speaking Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const MAX_TURNS = 5;
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [permissionError, setPermissionError] = useState<string>("");

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Auto-start Free Speaking Session
  useEffect(() => {
    if (practiceMode === 'FREE_SPEAKING' && selectedUnit && chatHistory.length === 0) {
      startFreeSpeakingSession();
    }
  }, [practiceMode, selectedUnit]);

  const resetSession = () => {
    setResult(null);
    setAudioUrl(null);
    setAudioChunks([]);
    setTimer(0);
    setPermissionError("");
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
    }
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const startFreeSpeakingSession = async () => {
    setIsAnalyzing(true);
    try {
        // If unit has pre-defined questions, use the first one
        const firstQ = selectedUnit?.freeSpeakingQuestions ? selectedUnit.freeSpeakingQuestions[0].question : undefined;
        
        const { aiResponse, aiAudioBase64 } = await interactWithExaminer([], selectedUnit!.title, undefined, firstQ);
        
        let aiAudioUrl = undefined;
        if (aiAudioBase64) {
           aiAudioUrl = createWavUrl(aiAudioBase64, 24000);
        }

        setChatHistory([{ role: 'ai', text: aiResponse, audioUrl: aiAudioUrl }]);
    } catch (e) {
        console.error(e);
        setPermissionError("Could not connect to AI examiner.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    // In Free Speaking, we don't clear chat history, just the current audio recording
    if (practiceMode !== 'FREE_SPEAKING') resetSession();
    else {
        setAudioUrl(null);
        setAudioChunks([]);
        setTimer(0);
        if (timerRef.current) window.clearInterval(timerRef.current);
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); 
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioChunks(chunks);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      timerRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error(err);
      setPermissionError("Cannot access microphone. Please grant permission in browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const handlePlaySample = async () => {
    if (isPlayingSample || !selectedUnit) return;
    setIsPlayingSample(true);
    try {
        const text = selectedUnit.shadowingSentences[currentSentenceIdx];
        const base64 = await generateSpeech(text);
        if (base64) {
            const audioUrl = createWavUrl(base64, 24000);
            const audio = new Audio(audioUrl);
            audio.onended = () => {
                setIsPlayingSample(false);
                URL.revokeObjectURL(audioUrl);
            };
            audio.play();
        } else {
            setIsPlayingSample(false);
        }
    } catch (e) {
        console.error("Error playing sample:", e);
        setIsPlayingSample(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleShadowingSubmit = async () => {
    if (audioChunks.length === 0 || !selectedUnit) return;
    setIsAnalyzing(true);
    try {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        const targetText = selectedUnit.shadowingSentences[currentSentenceIdx];
        const response = await analyzePronunciation(base64, targetText);
        setResult(response);
    } catch (error: any) {
        alert(error.message);
    } finally {
        setIsAnalyzing(false);
    }
  }

  const handleSavePart1 = () => {
      if (!result) return;
      // Scale 10 to 5
      const scaledScore = (result.score / 10) * 5;
      setPartScores(prev => ({ ...prev, part1: scaledScore }));
      setPartCompletion(prev => ({ ...prev, part1: true }));
      setPracticeMode('MENU');
      setResult(null);
  };

  const handleFreeSpeakingSubmit = async () => {
    if (audioChunks.length === 0 || !selectedUnit) return;
    
    setIsAnalyzing(true);
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const base64 = await blobToBase64(audioBlob);
    
    // Determine next question
    const nextTurnIndex = turnCount + 1;
    const isFinalTurn = nextTurnIndex >= MAX_TURNS;
    
    let nextQ = undefined;
    if (!isFinalTurn && selectedUnit.freeSpeakingQuestions && selectedUnit.freeSpeakingQuestions[nextTurnIndex]) {
        nextQ = selectedUnit.freeSpeakingQuestions[nextTurnIndex].question;
    }

    try {
        // Send audio to AI to transcribe + get next question
        const { userTranscription, aiResponse, aiAudioBase64 } = await interactWithExaminer(
            chatHistory, 
            selectedUnit.title, 
            base64,
            nextQ,
            isFinalTurn
        );

        // Process AI Audio
        let aiAudioUrl = undefined;
        if (aiAudioBase64) {
           aiAudioUrl = createWavUrl(aiAudioBase64, 24000);
        }

        const newHistory: ChatMessage[] = [
            ...chatHistory,
            { role: 'user', text: userTranscription, audioUrl: audioUrl || undefined },
            { role: 'ai', text: aiResponse, audioUrl: aiAudioUrl }
        ];

        setChatHistory(newHistory);
        setTurnCount(prev => prev + 1);
        
        // Reset recorder for next turn
        setAudioUrl(null);
        setAudioChunks([]);
        setTimer(0);

        // 2. Check if Session Finished (5 turns)
        if (isFinalTurn) {
             // Finalize
             const finalGrade = await gradeSpeakingSession(newHistory, selectedUnit.title, base64);
             
             // Scale 10 to 5 for Part 2
             const scaledScore = (finalGrade.score / 10) * 5;
             setPartScores(prev => ({ ...prev, part2: scaledScore }));
             setPartCompletion(prev => ({ ...prev, part2: true }));
             
             setPracticeMode('SUMMARY');
             onComplete((partScores.part1 + scaledScore)); // Update global stats
        }

    } catch (error: any) {
        alert(error.message);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDownloadCertificate = () => {
      if (!selectedUnit) return;
      
      const totalScore = partScores.part1 + partScores.part2;

      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Border
      ctx.lineWidth = 15;
      ctx.strokeStyle = '#DAA520'; // Golden Rod
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      // 3. Header
      ctx.fillStyle = '#1a365d'; // Dark Blue
      ctx.font = 'bold 50px serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICATE', canvas.width / 2, 140);
      
      ctx.font = '28px serif';
      ctx.fillStyle = '#DAA520';
      ctx.fillText('OF SPEAKING MASTERY', canvas.width / 2, 180);

      // 4. Content
      ctx.font = 'italic 24px sans-serif';
      ctx.fillStyle = '#555555';
      ctx.fillText('This certificate is proudly presented to', canvas.width / 2, 250);

      // Student Name
      ctx.font = 'bold italic 60px serif';
      ctx.fillStyle = '#2563EB'; // Blue-600
      ctx.fillText(studentName, canvas.width / 2, 330);
      
      // Line under name
      ctx.beginPath();
      ctx.moveTo(250, 350);
      ctx.lineTo(750, 350);
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Description
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#444444';
      ctx.fillText(`For outstanding performance in`, canvas.width / 2, 400);
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`Unit: ${selectedUnit.title}`, canvas.width / 2, 440);

      // Score
      ctx.fillStyle = '#16a34a'; // Green
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(`Total Score: ${totalScore.toFixed(1)}/10`, canvas.width / 2, 500);

      // 5. Footer (Date and Signature)
      const today = new Date().toLocaleDateString('en-GB');
      
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(`Date: ${today}`, 100, 600);

      ctx.textAlign = 'right';
      ctx.fillText('LinguaAI Director', 900, 600);
      
      ctx.font = 'italic 30px serif';
      ctx.fillText('Gemini AI', 900, 570);

      // Download
      const link = document.createElement('a');
      link.download = `Speaking-Certificate-${studentName}-${selectedUnit.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackToUnits = () => {
    setSelectedUnit(null);
    setPracticeMode('MENU');
    resetSession();
    setChatHistory([]);
    setTurnCount(0);
    setPartScores({ part1: 0, part2: 0 });
    setPartCompletion({ part1: false, part2: false });
  };

  const handleBackToMode = () => {
    setPracticeMode('MENU');
    resetSession();
    // Do not reset scores or completion status here to allow progress
  };

  // --- 1. UNIT SELECTION VIEW ---
  if (!selectedUnit) {
    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Select a Speaking Unit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {UNITS.map((unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedUnit(unit)}
              className="group bg-white rounded-[2rem] p-8 shadow-soft border border-gray-100 hover:shadow-2xl hover:border-blue-300 transition-all text-left flex gap-6 items-start relative overflow-hidden transform hover:-translate-y-1"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${unit.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                <i className={`fas ${unit.icon} text-3xl`}></i>
              </div>
              <div className="z-10 flex-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unit {unit.id}</span>
                <h3 className="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors mt-1 mb-2">{unit.title}</h3>
                <p className="text-lg text-gray-500 mt-2 line-clamp-2 leading-relaxed">{unit.description}</p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform">
                <i className={`fas ${unit.icon} text-9xl`}></i>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- SUMMARY VIEW (FINAL SCREEN) ---
  if (practiceMode === 'SUMMARY') {
      const totalScore = partScores.part1 + partScores.part2;
      const passed = totalScore >= 6.0;

      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <button onClick={handleBackToMode} className="text-gray-500 hover:text-blue-600 font-bold text-lg transition-colors flex items-center mb-4">
                <i className="fas fa-arrow-left mr-3"></i> Back to Menu
            </button>

            <Card className="text-center py-16">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-5xl mb-8 shadow-2xl ${passed ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                    <i className={`fas ${passed ? 'fa-trophy' : 'fa-clipboard-check'}`}></i>
                </div>
                
                <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Unit Complete!</h2>
                <p className="text-xl text-gray-500 mb-10">Here is your speaking score breakdown</p>

                <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 shadow-sm">
                        <div className="text-sm text-purple-600 font-bold uppercase mb-2 tracking-wide">Part 1 (Shadowing)</div>
                        <div className="text-4xl font-extrabold text-gray-800">{partScores.part1.toFixed(1)}<span className="text-xl text-gray-400">/5</span></div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
                        <div className="text-sm text-blue-600 font-bold uppercase mb-2 tracking-wide">Part 2 (Free Speaking)</div>
                        <div className="text-4xl font-extrabold text-gray-800">{partScores.part2.toFixed(1)}<span className="text-xl text-gray-400">/5</span></div>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-8 max-w-lg mx-auto mb-10 border border-gray-200">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-3">Total Score</p>
                    <div className="text-7xl font-black text-gray-900 tracking-tight">{totalScore.toFixed(1)}<span className="text-3xl text-gray-400 font-normal">/10</span></div>
                </div>

                {passed ? (
                    <div className="space-y-6">
                        <p className="text-green-600 font-bold text-xl">Congratulations! You have passed this unit.</p>
                        <button 
                            onClick={handleDownloadCertificate}
                            className="px-10 py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-xl rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:-translate-y-1 transition-all flex items-center gap-3 mx-auto"
                        >
                            <i className="fas fa-certificate text-2xl"></i>
                            Download Certificate
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <p className="text-orange-600 font-bold text-xl">Keep practicing to reach 6.0 and unlock your certificate!</p>
                         <Button onClick={handleBackToUnits}>
                            Return to Units
                         </Button>
                    </div>
                )}
            </Card>
        </div>
      );
  }

  // --- 2. MODE SELECTION VIEW ---
  if (practiceMode === 'MENU') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <button onClick={handleBackToUnits} className="text-gray-500 hover:text-blue-600 font-bold text-lg transition-colors flex items-center mb-4">
           <i className="fas fa-arrow-left mr-3"></i> Back to Units
        </button>
        
        <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">{selectedUnit.title}</h2>
            <p className="text-xl text-gray-500">Complete both parts to get your score</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div onClick={() => { setPracticeMode('SHADOWING'); setCurrentSentenceIdx(0); }} className={`cursor-pointer bg-white p-10 rounded-[2rem] shadow-soft border transition-all group transform hover:-translate-y-1 relative overflow-hidden ${partCompletion.part1 ? 'border-green-300 bg-green-50/30' : 'border-gray-100 hover:shadow-2xl hover:border-purple-200'}`}>
                {partCompletion.part1 && <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl shadow-sm"><i className="fas fa-check mr-1"></i> Done</div>}
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform ${partCompletion.part1 ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                    <i className="fas fa-microphone-lines"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Part 1: Shadowing</h3>
                <p className="text-gray-600 text-lg mb-6">Listen and mimic sentences. Max 5 points.</p>
                <div className={`font-bold text-base uppercase tracking-wider ${partCompletion.part1 ? 'text-green-600' : 'text-purple-600'}`}>
                    {partCompletion.part1 ? 'Redo Part 1' : 'Start Practice'} <i className="fas fa-arrow-right ml-1"></i>
                </div>
            </div>

            <div onClick={() => setPracticeMode('FREE_SPEAKING')} className={`cursor-pointer bg-white p-10 rounded-[2rem] shadow-soft border transition-all group transform hover:-translate-y-1 relative overflow-hidden ${partCompletion.part2 ? 'border-green-300 bg-green-50/30' : 'border-gray-100 hover:shadow-2xl hover:border-blue-200'}`}>
                {partCompletion.part2 && <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-bl-xl shadow-sm"><i className="fas fa-check mr-1"></i> Done</div>}
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform ${partCompletion.part2 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    <i className="fas fa-comments"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Part 2: Free Speaking</h3>
                <p className="text-gray-600 text-lg mb-6">Conversation with AI (5 turns). Max 5 points.</p>
                <div className={`font-bold text-base uppercase tracking-wider ${partCompletion.part2 ? 'text-green-600' : 'text-blue-600'}`}>
                    {partCompletion.part2 ? 'Redo Part 2' : 'Start Practice'} <i className="fas fa-arrow-right ml-1"></i>
                </div>
            </div>
        </div>

        {/* Final Action */}
        <div className="flex justify-center mt-8">
            <button 
                disabled={!(partCompletion.part1 && partCompletion.part2)}
                onClick={() => setPracticeMode('SUMMARY')}
                className={`px-10 py-5 rounded-2xl font-bold text-xl shadow-xl flex items-center gap-4 transition-all duration-300 transform ${
                    partCompletion.part1 && partCompletion.part2
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/50 hover:-translate-y-1 cursor-pointer' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                <i className="fas fa-flag-checkered text-2xl"></i>
                View Final Score & Certificate
            </button>
        </div>
      </div>
    );
  }

  // --- 3. SHADOWING MODE ---
  if (practiceMode === 'SHADOWING') {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
          <button onClick={handleBackToMode} className="flex items-center text-gray-500 hover:text-blue-600 font-bold text-lg transition-colors">
            <i className="fas fa-arrow-left mr-3"></i> Back to Menu
          </button>
          
          <Card title={`Part 1: Shadowing - Sentence ${currentSentenceIdx + 1}/${selectedUnit.shadowingSentences.length}`}>
            <div className="flex flex-col items-center justify-center space-y-10 py-10">
                {!result ? (
                    <>
                        <div className="text-center space-y-6 max-w-3xl px-6">
                            <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Read this aloud</p>
                            <h3 className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
                                "{selectedUnit.shadowingSentences[currentSentenceIdx]}"
                            </h3>
                            
                            {/* Listen Button */}
                            <button
                                onClick={handlePlaySample}
                                disabled={isPlayingSample}
                                className="mx-auto flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-600 rounded-full font-bold text-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                                {isPlayingSample ? (
                                    <>
                                        <i className="fas fa-volume-high animate-pulse"></i> Playing...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-volume-up"></i> Listen to Sample
                                    </>
                                )}
                            </button>

                            <div className="flex gap-4 justify-center mt-8">
                                <button 
                                    disabled={currentSentenceIdx === 0}
                                    onClick={() => { setCurrentSentenceIdx(p => p - 1); resetSession(); }}
                                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-600 transition-colors"
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button 
                                    disabled={currentSentenceIdx === selectedUnit.shadowingSentences.length - 1}
                                    onClick={() => { setCurrentSentenceIdx(p => p + 1); resetSession(); }}
                                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-gray-600 transition-colors"
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        {/* Recorder Control */}
                        <div className="relative group">
                            {isRecording && (
                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                            )}
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all duration-300 transform group-hover:scale-105 ${
                                isRecording 
                                    ? 'bg-red-500 text-white hover:bg-red-600' 
                                    : `bg-gradient-to-br ${selectedUnit.color} text-white`
                                }`}
                            >
                                <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                            </button>
                        </div>
                        <div className="text-3xl font-mono text-gray-500 font-bold tracking-widest bg-gray-100 px-4 py-1 rounded-lg">
                            {formatTime(timer)}
                        </div>

                        {audioUrl && !isRecording && (
                            <div className="w-full max-w-lg bg-gray-50 p-6 rounded-[2rem] flex flex-col gap-6 shadow-inner border border-gray-100">
                            <audio src={audioUrl} controls className="w-full h-12" />
                            <div className="flex justify-center gap-4">
                                <Button variant="secondary" onClick={resetSession}>
                                    <i className="fas fa-trash mr-2"></i> Retry
                                </Button>
                                <Button onClick={handleShadowingSubmit} isLoading={isAnalyzing}>
                                    <i className="fas fa-magic mr-2"></i> Analyze
                                </Button>
                            </div>
                            </div>
                        )}
                    </>
                ) : (
                    // Result View inside Shadowing
                    <div className="w-full space-y-8 animate-fade-in">
                        <div className="flex flex-col items-center">
                            <ScoreCircle score={(result.score / 10) * 5} /> {/* Displaying on 5 scale visually? Or just regular score but mapped */}
                            <p className="mt-4 text-gray-500 font-bold uppercase">Pronunciation Score (Scaled to 5.0)</p>
                            <div className="text-4xl font-extrabold text-gray-800 mt-2">{(result.score / 10 * 5).toFixed(1)}<span className="text-xl text-gray-400">/5</span></div>
                            <p className="mt-4 text-center max-w-2xl text-lg text-gray-600">"{result.feedback}"</p>
                        </div>
                        
                        <div className="flex justify-center gap-4 mt-8">
                             <Button variant="secondary" onClick={() => setResult(null)}>
                                <i className="fas fa-rotate-left mr-2"></i> Try Again
                             </Button>
                             <Button onClick={handleSavePart1}>
                                <i className="fas fa-check mr-2"></i> Save & Finish Part 1
                             </Button>
                        </div>
                    </div>
                )}
            </div>
          </Card>
        </div>
    );
  }

  // --- 4. FREE SPEAKING MODE (CHAT UI) ---
  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-160px)] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
             <button onClick={handleBackToMode} className="flex items-center text-gray-500 hover:text-blue-600 font-bold text-lg transition-colors">
                <i className="fas fa-arrow-left mr-3"></i> Back to Menu
             </button>
             <div className="bg-blue-100 px-4 py-2 rounded-full text-blue-800 text-sm font-bold shadow-sm border border-blue-200">
                 Turn {turnCount}/{MAX_TURNS}
             </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-t-[2.5rem] shadow-soft border border-gray-100 p-8 space-y-8 relative custom-scrollbar">
             {chatHistory.length === 0 && isAnalyzing && (
                 <div className="flex justify-center items-center h-full">
                     <div className="flex flex-col items-center text-gray-400">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
                        </div>
                        <p className="text-lg font-medium">Examiner is preparing the first question...</p>
                     </div>
                 </div>
             )}

             {chatHistory.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                     <div className={`max-w-[85%] rounded-[2rem] p-6 shadow-md transition-all ${
                         msg.role === 'ai' 
                         ? 'bg-gray-50 border border-gray-100 rounded-tl-none text-gray-800' 
                         : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none'
                     }`}>
                         {msg.role === 'ai' && (
                             <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2 uppercase tracking-wide">
                                 <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i className="fas fa-robot"></i></div> 
                                 Examiner
                             </div>
                         )}
                         <p className="text-lg md:text-xl leading-relaxed font-medium">{msg.text}</p>
                         {msg.audioUrl && (
                             <audio src={msg.audioUrl} controls autoPlay className="mt-4 h-10 w-full max-w-[240px] opacity-90 hover:opacity-100 transition-opacity" />
                         )}
                     </div>
                 </div>
             ))}

             {isAnalyzing && chatHistory.length > 0 && (
                 <div className="flex justify-start animate-pulse">
                     <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none p-5 text-gray-500 text-base flex items-center gap-3">
                         <span className="flex gap-1.5">
                             <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></span>
                             <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                             <span className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                         </span>
                         Examiner is thinking...
                     </div>
                 </div>
             )}
             <div ref={chatEndRef} />
        </div>

        {/* Input Area (Recording) */}
        <div className="bg-white p-6 border-t border-gray-100 rounded-b-[2.5rem] shadow-lg flex flex-col gap-4 flex-shrink-0 z-10">
             
             {/* Hint Display */}
             {selectedUnit.freeSpeakingQuestions && turnCount < MAX_TURNS && !isRecording && !audioUrl && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl text-base text-yellow-900 flex items-start gap-3 animate-fade-in shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0"><i className="fas fa-lightbulb"></i></div>
                    <div className="py-1">
                        <span className="font-bold">Suggestion:</span> {selectedUnit.freeSpeakingQuestions[turnCount].hint}
                    </div>
                </div>
             )}

             <div className="flex items-center justify-between px-2">
                {turnCount >= MAX_TURNS ? (
                    <div className="w-full text-center py-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-3 text-2xl"><i className="fas fa-spinner fa-spin"></i></div>
                        <p className="text-blue-800 font-bold text-2xl mb-1">Session Complete!</p>
                        <p className="text-gray-500 text-lg">Calculating final score...</p>
                    </div>
                ) : (
                    <>
                        <div className="text-base font-medium text-gray-500">
                            {isRecording ? <span className="text-red-500 animate-pulse font-bold flex items-center gap-2"><i className="fas fa-circle text-xs"></i> Recording {formatTime(timer)}</span> : 'Tap microphone to answer'}
                        </div>
                        
                        <div className="flex gap-4 items-center">
                            {audioUrl && !isRecording ? (
                                <div className="flex gap-3">
                                    <Button variant="secondary" onClick={() => { setAudioUrl(null); setAudioChunks([]); }}>
                                        <i className="fas fa-rotate-left"></i>
                                    </Button>
                                    <Button onClick={handleFreeSpeakingSubmit} isLoading={isAnalyzing}>
                                        Send Answer <i className="fas fa-paper-plane ml-2"></i>
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    disabled={isAnalyzing}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${
                                    isRecording 
                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30' 
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                                >
                                    <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                                </button>
                            )}
                        </div>
                    </>
                )}
             </div>
        </div>
    </div>
  );
};

export default SpeakingPractice;