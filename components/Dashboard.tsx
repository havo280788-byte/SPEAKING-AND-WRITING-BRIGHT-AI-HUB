import React from 'react';
import { Card } from './Components';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UserStats } from '../types';

interface Props {
  stats: UserStats;
}

const Dashboard: React.FC<Props> = ({ stats }) => {
  // Mock data generation based on simple stats if array is empty
  const data = stats.speakingScore.length > 0 
    ? stats.speakingScore.map((s, i) => ({ name: `Attempt ${i+1}`, score: s }))
    : [{ name: 'Start', score: 0 }];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white !border-0 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -bottom-6 text-white/10 text-9xl group-hover:scale-110 transition-transform">
               <i className="fas fa-book-open"></i>
            </div>
            <div className="flex flex-col relative z-10">
               <span className="text-blue-100 font-medium text-lg">Practiced</span>
               <span className="text-5xl font-extrabold mt-2">{stats.lessonsCompleted}</span>
               <span className="text-blue-100 text-sm mt-1">Lessons completed</span>
            </div>
         </Card>
         
         <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white !border-0 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -bottom-6 text-white/10 text-9xl group-hover:scale-110 transition-transform">
               <i className="fas fa-fire"></i>
            </div>
            <div className="flex flex-col relative z-10">
               <span className="text-orange-100 font-medium text-lg">Streak</span>
               <span className="text-5xl font-extrabold mt-2 flex items-baseline gap-2">
                  {stats.streak} <span className="text-2xl font-bold opacity-80">days</span>
               </span>
               <span className="text-orange-100 text-sm mt-1">Keep it up!</span>
            </div>
         </Card>

         <Card className="bg-white group hover:border-blue-200 transition-colors">
            <div className="flex flex-col">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                     <i className="fas fa-microphone"></i>
                  </div>
                  <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Avg Speaking</span>
               </div>
               <span className="text-5xl font-extrabold text-gray-800">
                  {stats.speakingScore.length > 0 
                    ? (stats.speakingScore.reduce((a,b) => a+b, 0) / stats.speakingScore.length).toFixed(1) 
                    : '-'}
               </span>
            </div>
         </Card>

         <Card className="bg-white group hover:border-purple-200 transition-colors">
            <div className="flex flex-col">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                     <i className="fas fa-pen-nib"></i>
                  </div>
                  <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Avg Writing</span>
               </div>
               <span className="text-5xl font-extrabold text-gray-800">
                  {stats.writingScore.length > 0 
                    ? (stats.writingScore.reduce((a,b) => a+b, 0) / stats.writingScore.length).toFixed(1) 
                    : '-'}
               </span>
            </div>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Chart */}
         <div className="lg:col-span-2">
            <Card title="Speaking Progress" className="h-[450px] flex flex-col">
               <div className="flex-1 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 14, fontWeight: 500}} dy={10} />
                        <YAxis hide domain={[0, 10]} />
                        <Tooltip 
                           contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px 20px' }}
                           itemStyle={{ color: '#1e293b', fontWeight: 'bold', fontSize: '16px' }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </Card>
         </div>

         {/* Recent Tips */}
         <div className="lg:col-span-1">
            <Card title="Daily Tips" className="h-full bg-gradient-to-b from-white to-gray-50">
               <ul className="space-y-6">
                  <li className="flex gap-4 items-start p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                     <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center shrink-0 text-xl">
                        <i className="fas fa-microphone-lines"></i>
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-800 mb-1">Self-Correction</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">Record your speech and listen back. You'll catch 50% more errors yourself.</p>
                     </div>
                  </li>
                  <li className="flex gap-4 items-start p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                     <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 text-xl">
                        <i className="fas fa-book-open"></i>
                     </div>
                     <div>
                         <h4 className="font-bold text-gray-800 mb-1">Vocabulary</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">Learn 5 new "high-value" words daily. Use them in context immediately.</p>
                     </div>
                  </li>
                  <li className="flex gap-4 items-start p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                     <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0 text-xl">
                        <i className="fas fa-clock"></i>
                     </div>
                     <div>
                         <h4 className="font-bold text-gray-800 mb-1">Consistency</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">15 minutes every morning is better than 2 hours once a week.</p>
                     </div>
                  </li>
               </ul>
            </Card>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;