"use client";

import { useState } from "react";
import { Calculator, Plus, Trash2, RotateCcw, Activity, Award, ChevronRight, Percent, ArrowRight } from "lucide-react";

// SRM Grade Points Mapping
const GRADE_POINTS: Record<string, number> = {
  "O": 10,
  "A+": 9,
  "A": 8,
  "B+": 7,
  "B": 6,
  "C": 5,
  "F": 0,
};

const GRADE_RANGES: Record<string, string> = {
  "O": "91–100%",
  "A+": "81–90%",
  "A": "71–80%",
  "B+": "61–70%",
  "B": "56–60%",
  "C": "50–55%",
  "F": "Below 50%",
};

type Subject = {
  id: string;
  name: string;
  credits: number;
  grade: string;
};

type Semester = {
  id: string;
  name: string;
  gpa: number;
};

export default function GPACalculatorPage() {
  const [activeTab, setActiveTab] = useState<"gpa" | "cgpa" | "semester">("gpa");
  
  // GPA State
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: "1", name: "Subject 1", credits: 3, grade: "A" },
    { id: "2", name: "Subject 2", credits: 4, grade: "O" },
    { id: "3", name: "Subject 3", credits: 3, grade: "A+" }
  ]);

  // CGPA State
  const [semesters, setSemesters] = useState<Semester[]>([
    { id: "1", name: "Semester 1", gpa: 9.2 },
    { id: "2", name: "Semester 2", gpa: 8.8 }
  ]);

  // --- GPA Logic ---
  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now().toString(), name: `Subject ${subjects.length + 1}`, credits: 3, grade: "A" }]);
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const calculateGPA = () => {
    let totalCredits = 0;
    let totalPoints = 0;
    let hasFailed = false;

    subjects.forEach(sub => {
      const credits = Number(sub.credits) || 0;
      const point = GRADE_POINTS[sub.grade] || 0;
      
      if (sub.grade === "F") hasFailed = true;

      totalCredits += credits;
      totalPoints += (credits * point);
    });

    if (totalCredits === 0) return { gpa: 0, hasFailed };
    return { gpa: Number((totalPoints / totalCredits).toFixed(2)), hasFailed };
  };

  const resetGPA = () => setSubjects([{ id: Date.now().toString(), name: "Subject 1", credits: 3, grade: "A" }]);

  const { gpa, hasFailed: gpaFailed } = calculateGPA();

  // --- CGPA Logic ---
  const addSemester = () => {
    setSemesters([...semesters, { id: Date.now().toString(), name: `Semester ${semesters.length + 1}`, gpa: 9.0 }]);
  };

  const removeSemester = (id: string) => {
    setSemesters(semesters.filter(s => s.id !== id));
  };

  const updateSemester = (id: string, field: keyof Semester, value: any) => {
    setSemesters(semesters.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const calculateCGPA = () => {
    if (semesters.length === 0) return 0;
    const totalGPA = semesters.reduce((sum, sem) => sum + (Number(sem.gpa) || 0), 0);
    return Number((totalGPA / semesters.length).toFixed(2));
  };

  const resetCGPA = () => setSemesters([{ id: Date.now().toString(), name: "Semester 1", gpa: 9.0 }]);

  const cgpa = calculateCGPA();

  // --- Semester Calc Logic ---
  const [internal, setInternal] = useState<string>("");
  const [semesterMark, setSemesterMark] = useState<string>("");

  const internalNum = parseFloat(internal) || 0;
  const semesterNum = parseFloat(semesterMark) || 0;

  const convertedSemester = (semesterNum / 75) * 40;
  const finalTotal = internalNum + convertedSemester;

  const getSemesterGrade = (total: number) => {
    const t = Math.round(total);
    if (t >= 91) return { grade: "O", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (t >= 81) return { grade: "A+", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (t >= 71) return { grade: "A", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (t >= 61) return { grade: "B+", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (t >= 56) return { grade: "B", color: "text-purple-400", bg: "bg-purple-500/20" };
    if (t >= 50) return { grade: "C", color: "text-purple-400", bg: "bg-purple-500/20" };
    return { grade: "F", color: "text-red-400", bg: "bg-red-500/20" };
  };

  const semGradeInfo = getSemesterGrade(finalTotal);
  const isSemValid = internal !== "" && semesterMark !== "" && internalNum <= 60 && semesterNum <= 75 && internalNum >= 0 && semesterNum >= 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-full mb-6">
          <Calculator size={40} className="text-purple-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">SRM Grade Calculator</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Instantly calculate your SRM GPA and CGPA using the official SRM grade point mapping.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8 w-full">
        <div className="bg-white/5 p-1 rounded-xl flex flex-col sm:flex-row w-full sm:w-auto gap-1">
          <button 
            onClick={() => setActiveTab("gpa")}
            className={`px-4 md:px-8 py-3 rounded-lg font-medium transition-all w-full sm:w-auto text-sm md:text-base ${activeTab === "gpa" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
          >
            GPA Calculator
          </button>
          <button 
            onClick={() => setActiveTab("cgpa")}
            className={`px-4 md:px-8 py-3 rounded-lg font-medium transition-all w-full sm:w-auto text-sm md:text-base ${activeTab === "cgpa" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
          >
            CGPA Calculator
          </button>
          <button 
            onClick={() => setActiveTab("semester")}
            className={`px-4 md:px-8 py-3 rounded-lg font-medium transition-all w-full sm:w-auto text-sm md:text-base ${activeTab === "semester" ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
          >
            Semester Calculator
          </button>
        </div>
      </div>

      {activeTab === "gpa" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
          
          {/* Main Input Panel */}
          <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-2xl border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="text-cyan-400" size={24} /> Semester Subjects
              </h2>
              <button onClick={resetGPA} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full transition-colors">
                <RotateCcw size={14} /> Reset
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {/* Header Row */}
              <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-semibold text-gray-400 px-4">
                <div className="col-span-5">Subject Name</div>
                <div className="col-span-3">Credits</div>
                <div className="col-span-3">Grade</div>
                <div className="col-span-1 text-center">Act</div>
              </div>

              {subjects.map((sub, index) => (
                <div key={sub.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-black/40 p-4 rounded-xl border border-white/5 items-center hover:border-white/10 transition-colors">
                  <div className="md:col-span-5 relative">
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-md hidden md:block"></span>
                    <input 
                      type="text" 
                      value={sub.name}
                      onChange={(e) => updateSubject(sub.id, "name", e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 pb-1 text-white outline-none focus:border-purple-400 transition-colors"
                      placeholder={`Subject ${index + 1}`}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-gray-500 md:hidden block mb-1">Credits</label>
                    <input 
                      type="number" 
                      min="1" max="10"
                      value={sub.credits}
                      onChange={(e) => updateSubject(sub.id, "credits", Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-gray-500 md:hidden block mb-1">Grade</label>
                    <select 
                      value={sub.grade}
                      onChange={(e) => updateSubject(sub.id, "grade", e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-400 cursor-pointer appearance-none"
                    >
                      {Object.keys(GRADE_POINTS).map(g => (
                        <option key={g} value={g}>{g} ({GRADE_RANGES[g]})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1 flex justify-center mt-2 md:mt-0">
                    <button 
                      onClick={() => removeSubject(sub.id)}
                      disabled={subjects.length === 1}
                      className="text-gray-500 hover:text-red-400 disabled:opacity-30 transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={addSubject}
              className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} /> Add Another Subject
            </button>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-8 rounded-2xl border-t-4 border-t-purple-500 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="text-purple-400" /> Live Results
              </h3>
              
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <div className={`hidden md:block absolute inset-0 blur-2xl opacity-50 rounded-full transition-colors ${gpaFailed ? 'bg-red-500' : 'bg-cyan-500'} hardware-accelerated`}></div>
                  <div className={`relative w-40 h-40 rounded-full border-4 flex items-center justify-center bg-black/50 backdrop-blur-sm ${gpaFailed ? 'border-red-500/50' : 'border-cyan-500/50'} hardware-accelerated`}>
                    <div className="text-center">
                      <span className={`text-5xl font-black block ${gpaFailed ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-purple-400'}`}>
                        {gpa.toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-sm font-medium">GPA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Total Credits</span>
                  <span className="text-white font-bold">{subjects.reduce((sum, sub) => sum + (Number(sub.credits) || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Percentage Eqv.</span>
                  <span className="text-white font-bold">{(gpa * 10).toFixed(1)}%</span>
                </div>
                
                {gpaFailed && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-red-400 font-semibold flex items-center justify-center gap-2">
                      <Activity size={18} /> Arrear / Failed Subject Detected
                    </p>
                  </div>
                )}
                {!gpaFailed && gpa >= 9.0 && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
                      <Award size={18} /> Excellent Academic Standing!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cgpa" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-2xl border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="text-cyan-400" size={24} /> All Semesters
              </h2>
              <button onClick={resetCGPA} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full transition-colors">
                <RotateCcw size={14} /> Reset
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {semesters.map((sem, index) => (
                <div key={sem.id} className="flex flex-col md:flex-row gap-4 bg-black/40 p-4 rounded-xl border border-white/5 items-center hover:border-white/10 transition-colors">
                  <div className="w-full md:w-1/2 relative">
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-r-md hidden md:block"></span>
                    <input 
                      type="text" 
                      value={sem.name}
                      onChange={(e) => updateSemester(sem.id, "name", e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 pb-1 text-white outline-none focus:border-cyan-400 transition-colors"
                      placeholder={`Semester ${index + 1}`}
                    />
                  </div>
                  <div className="w-full md:w-1/2 flex items-center gap-4">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">GPA:</span>
                      <input 
                        type="number" 
                        step="0.01" min="0" max="10"
                        value={sem.gpa}
                        onChange={(e) => updateSemester(sem.id, "gpa", Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-3 py-2 text-white outline-none focus:border-purple-400 font-semibold"
                      />
                    </div>
                    <button 
                      onClick={() => removeSemester(sem.id)}
                      disabled={semesters.length === 1}
                      className="text-gray-500 hover:text-red-400 disabled:opacity-30 transition-colors p-2 rounded-full hover:bg-white/5 flex-shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={addSemester}
              className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} /> Add Another Semester
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="glass-panel p-8 rounded-2xl border-t-4 border-t-cyan-500 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="text-cyan-400" /> Final CGPA
              </h3>
              
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <div className="hidden md:block absolute inset-0 bg-cyan-500 blur-2xl opacity-40 rounded-full hardware-accelerated"></div>
                  <div className="relative w-40 h-40 rounded-full border-4 border-cyan-500/50 flex items-center justify-center bg-black/50 backdrop-blur-sm hardware-accelerated">
                    <div className="text-center">
                      <span className="text-5xl font-black block text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-400">
                        {cgpa.toFixed(2)}
                      </span>
                      <span className="text-gray-400 text-sm font-medium">CGPA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Total Semesters</span>
                  <span className="text-white font-bold">{semesters.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-gray-400">Percentage Eqv.</span>
                  <span className="text-white font-bold">{(cgpa * 10).toFixed(1)}%</span>
                </div>
                
                {cgpa >= 9.0 && (
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-center">
                    <p className="text-cyan-400 font-semibold flex items-center justify-center gap-2">
                      <Award size={18} /> First Class with Distinction!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === "semester" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
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
                    value={semesterMark}
                    onChange={(e) => setSemesterMark(e.target.value)}
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
          <div className={`glass-panel p-8 rounded-2xl border-t border-white/10 flex flex-col justify-center relative overflow-hidden transition-opacity duration-500 ${isSemValid ? 'opacity-100' : 'opacity-40'}`}>
            {!isSemValid && (
              <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                <p className="text-gray-300 font-medium bg-black/60 px-6 py-3 rounded-full">Enter marks to see result</p>
              </div>
            )}

            <h2 className="text-2xl font-semibold text-white mb-8">Calculation Result</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Percent size={20} className="text-purple-400" />
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
                  <Calculator size={20} className="text-purple-400" />
                  <span className="text-gray-300">Final Total Mark</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white">{finalTotal.toFixed(2)}</span>
                  <span className="text-sm text-gray-500 ml-1">/ 100</span>
                </div>
              </div>

              <div className={`mt-6 p-6 rounded-xl border border-white/10 text-center flex flex-col items-center gap-2 ${semGradeInfo.bg}`}>
                <Award size={32} className={semGradeInfo.color} />
                <span className="text-gray-300 font-medium">Final Grade</span>
                <span className={`text-5xl font-black ${semGradeInfo.color} drop-shadow-lg`}>{semGradeInfo.grade}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
