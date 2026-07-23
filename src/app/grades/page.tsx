import React from "react";

export default function GradesPage() {
  const gradesData = [
    { grade: "O", min: "91.00", max: "Above", result: "PASS" },
    { grade: "A+", min: "81.00", max: "Above", result: "PASS" },
    { grade: "A", min: "71.00", max: "Above", result: "PASS" },
    { grade: "B+", min: "61.00", max: "Above", result: "PASS" },
    { grade: "B", min: "56.00", max: "Above", result: "PASS" },
    { grade: "C", min: "50.00", max: "Above", result: "PASS" },
    { grade: "Ab", min: "0.00", max: "100.00", result: "INCOMPLETE" },
    { grade: "*", min: "0.00", max: "100.00", result: "WITHHELD" },
    { grade: "I", min: "0.00", max: "100.00", result: "FAIL" },
    { grade: "W", min: "0.00", max: "100.00", result: "FAIL" },
    { grade: "F", min: "0.00", max: "Below 50", result: "FAIL" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">Grading System</h1>
        <p className="text-gray-400 text-sm md:text-lg">Detailed breakdown of the university grading scale and criteria.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="py-4 px-3 sm:py-5 sm:px-6 font-semibold text-purple-400 text-sm sm:text-base md:text-lg">Grade</th>
                <th className="py-4 px-3 sm:py-5 sm:px-6 font-semibold text-purple-400 text-sm sm:text-base md:text-lg">Min.%</th>
                <th className="py-4 px-3 sm:py-5 sm:px-6 font-semibold text-purple-400 text-sm sm:text-base md:text-lg">Max%.</th>
                <th className="py-4 px-3 sm:py-5 sm:px-6 font-semibold text-purple-400 text-sm sm:text-base md:text-lg">Result</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 font-medium text-xs sm:text-sm md:text-base">
              {gradesData.map((row, index) => (
                <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 sm:py-4 sm:px-6 font-bold text-white">{row.grade}</td>
                  <td className="py-3 px-3 sm:py-4 sm:px-6">{row.min}</td>
                  <td className="py-3 px-3 sm:py-4 sm:px-6">{row.max}</td>
                  <td className="py-3 px-3 sm:py-4 sm:px-6">
                    <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
                      row.result === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' :
                      row.result === 'FAIL' ? 'bg-red-500/20 text-red-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {row.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
