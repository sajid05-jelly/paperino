"use client";

import { useState } from "react";
import { Calculator as CalcIcon, Percent, Award, ArrowRight } from "lucide-react";

export default function CalculatorPage() {
  const [internal, setInternal] = useState<string>("");
  const [semester, setSemester] = useState<string>("");

  // Calculations
  const internalNum = parseFloat(internal) || 0;
  const semesterNum = parseFloat(semester) || 0;

  const convertedSemester = (semesterNum / 75) * 40;
  const finalTotal = internalNum + convertedSemester;

  const getGrade = (total: number) => {
    const t = Math.round(total);
    if (t >= 91) return { grade: "O", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (t >= 81) return { grade: "A+", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (t >= 71) return { grade: "A", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (t >= 61) return { grade: "B+", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (t >= 56) return { grade: "B", color: "text-purple-400", bg: "bg-purple-500/20" };
    if (t >= 50) return { grade: "C", color: "text-purple-400", bg: "bg-purple-500/20" };
    return { grade: "F", color: "text-red-400", bg: "bg-red-500/20" };
  };

  const gradeInfo = getGrade(finalTotal);
  const isValid = internal !== "" && semester !== "" && internalNum <= 60 && semesterNum <= 75 && internalNum >= 0 && semesterNum >= 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-full mb-6">
          <CalcIcon size={40} className="text-purple-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Semester Mark Calculator</h1>
        <p className="text-gray-400 text-lg">Calculate your final grade by converting your university semester marks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="glass-panel p-8 rounded-2xl border-t border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-6">Enter Marks</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Internal Mark (Out of 60)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={internal}
                  onChange={(e) => setInternal(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">/ 60</span>
              </div>
              {internalNum > 60 && <p className="text-red-400 text-sm mt-2">Cannot exceed 60</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Semester Exam Mark (Out of 75)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="75"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. 65"
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">/ 75</span>
              </div>
              {semesterNum > 75 && <p className="text-red-400 text-sm mt-2">Cannot exceed 75</p>}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className={`glass-panel p-8 rounded-2xl border-t border-white/10 flex flex-col justify-center relative overflow-hidden transition-opacity duration-500 ${isValid ? 'opacity-100' : 'opacity-40'}`}>
          {!isValid && (
            <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
              <p className="text-gray-300 font-medium bg-black/60 px-6 py-3 rounded-full">Enter marks to see result</p>
            </div>
          )}

          <h2 className="text-2xl font-semibold text-white mb-8">Calculation Result</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Percent size={20} className="text-blue-400" />
                <span className="text-gray-300">Converted Semester</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{convertedSemester.toFixed(2)}</span>
                <span className="text-sm text-gray-500 ml-1">/ 40</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="text-gray-600 rotate-90 md:rotate-0" />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <CalcIcon size={20} className="text-purple-400" />
                <span className="text-gray-300">Final Total Mark</span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">{finalTotal.toFixed(2)}</span>
                <span className="text-sm text-gray-500 ml-1">/ 100</span>
              </div>
            </div>

            <div className={`mt-6 p-6 rounded-xl border border-white/10 text-center flex flex-col items-center gap-2 ${gradeInfo.bg}`}>
              <Award size={32} className={gradeInfo.color} />
              <span className="text-gray-300 font-medium">Final Grade</span>
              <span className={`text-5xl font-black ${gradeInfo.color} drop-shadow-lg`}>{gradeInfo.grade}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
