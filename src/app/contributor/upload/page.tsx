"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Award, Sparkles, BookOpen, Plus, Info } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";
import { uploadToDriveDirect } from "@/lib/driveUpload";
import { notifyAdmins } from "@/lib/notifications";
import CreateCourseModal from "@/components/CreateCourseModal";

export default function ContributorUploadPage() {
  const { user } = useAuth();
  const { departments, subjects: dynamicSubjects, loading: contextLoading } = useSubjects();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  // Suggest course modal trigger
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);

  // Filter approved departments only
  const approvedDepts = departments.filter(d => d.status === "approved");

  const [formData, setFormData] = useState({
    department: "",
    semester: "1",
    subject: "",
    title: "",
    category: "pyq",
  });

  useEffect(() => {
    if (approvedDepts.length > 0 && !formData.department) {
      const firstDeptId = approvedDepts[0].id;
      const firstSubId = dynamicSubjects[firstDeptId]?.["1"]?.[0]?.id || "";
      setFormData(prev => ({
        ...prev,
        department: firstDeptId,
        semester: "1",
        subject: firstSubId
      }));
    }
  }, [approvedDepts, dynamicSubjects, formData.department]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      setMessage("Please select a file to upload and ensure you are logged in.");
      return;
    }
    if (!formData.department || !formData.subject) {
      setMessage("Please ensure department and subject are selected.");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      const result = await uploadToDriveDirect(file, formData.semester, formData.subject);

      await addDoc(collection(db, "materials"), {
        departmentId: formData.department,
        semesterId: formData.semester,
        subjectId: formData.subject,
        title: formData.title,
        category: formData.category,
        fileId: result.fileId,
        fileName: file.name,
        uploaderId: user.uid,
        uploaderName: user.displayName || "Contributor",
        uploadedBy: "contributor",
        status: "pending",
        createdAt: Date.now()
      });

      // Notify admins
      await notifyAdmins(
        db,
        "New Material Uploaded 📤",
        `New material uploaded by ${user.displayName || user.email || "a contributor"} and is waiting for review.`,
        "material_uploaded"
      );

      setMessage("Material uploaded successfully! Thank you for contributing.");
      setFormData(prev => ({ ...prev, title: "" }));
      setFile(null);
      setLoading(false);
      
    } catch (error: any) {
      console.error("Error saving material:", error);
      setMessage(error.message || "Error saving material. Check console.");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "department") {
      const firstSubId = dynamicSubjects[value]?.["1"]?.[0]?.id || "";
      setFormData({ 
        ...formData, 
        department: value, 
        semester: "1", 
        subject: firstSubId 
      });
    } else if (name === "semester") {
      const firstSubId = dynamicSubjects[formData.department]?.[value]?.[0]?.id || "";
      setFormData({ 
        ...formData, 
        semester: value, 
        subject: firstSubId 
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  if (contextLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mb-4" />
        <p className="text-gray-400">Syncing course options...</p>
      </div>
    );
  }

  const selectedDeptObj = approvedDepts.find(d => d.id === formData.department);
  const semCount = selectedDeptObj?.totalSemesters || 8;
  const currentSubjects = (dynamicSubjects[formData.department]?.[formData.semester] || []).filter(s => s.status !== "pending");

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Contribution Center</h1>
        <p className="text-gray-400">Share notes, question papers, or suggest new department listings to help SRM students succeed.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left / Middle: Upload Form */}
        <div className="lg:col-span-2 glass-panel p-8 rounded-3xl border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="text-fuchsia-400" size={20} /> Share Study Material
          </h2>
          
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Department</label>
                <select name="department" value={formData.department} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
                  {approvedDepts.map(d => (
                    <option key={d.id} value={d.id} className="bg-[#0a0714] text-white">{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Semester</label>
                <select name="semester" value={formData.semester} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
                  {Array.from({ length: semCount }, (_, i) => i + 1).map(sem => (
                    <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Subject</label>
                <select name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
                  {currentSubjects.map(sub => (
                    <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Material Title</label>
              <input name="title" value={formData.title} onChange={handleChange} type="text" placeholder="e.g., Unit 1 Syllabus Handwritten Notes" required className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
                <option value="pyq" className="bg-[#0a0714] text-white">Previous Year Question Papers</option>
                <option value="notes" className="bg-[#0a0714] text-white">Study Notes</option>
                <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">File Upload</label>
              <div className={`border-2 border-dashed ${file ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/10 hover:border-fuchsia-500/40'} rounded-2xl p-8 text-center transition-all cursor-pointer`} onClick={() => document.getElementById("fileUploadPage")?.click()}>
                <Upload className={`mx-auto mb-3 ${file ? 'text-fuchsia-400 animate-bounce' : 'text-gray-500'}`} size={36} />
                <p className="text-gray-300 text-sm font-semibold mb-2">
                  {file ? file.name : "Select a document to contribute"}
                </p>
                <p className="text-[10px] text-gray-500 mb-4">PDF, DOCX, JPG or PNG. Max size 20MB.</p>
                <input type="file" onChange={handleFileChange} className="hidden" id="fileUploadPage" accept=".pdf,.doc,.docx,.jpg,.png" />
                {!file && (
                  <span className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-semibold transition-colors">
                    Browse Files
                  </span>
                )}
              </div>
            </div>

            {message && <div className={`p-4 rounded-xl text-sm ${message.includes("Error") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>{message}</div>}

            <button disabled={loading || !formData.title || !file || !formData.subject} type="submit" className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.2)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Upload Material"}
            </button>
          </form>
        </div>

        {/* Right Sidebar: Suggestions, Rewards & Guidelines */}
        <div className="space-y-6">
          
          {/* Suggest Course Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-fuchsia-500/5 to-transparent space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="text-fuchsia-400" size={18} /> Suggest Listings
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Don't see your department, subject, or course list? Suggest additions to the academic catalog.
            </p>
            <button 
              onClick={() => setIsSuggestModalOpen(true)}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all"
            >
              Suggest Department / Subject
            </button>
          </div>

          {/* Reward System Highlights */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="text-yellow-400" size={18} /> Reward System
            </h3>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Approved Upload</span>
                <span className="text-emerald-400 font-bold">+10 Points</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Approved Suggestion</span>
                <span className="text-emerald-400 font-bold">+15 Points</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Every 100 Downloads</span>
                <span className="text-emerald-400 font-bold">+5 Points</span>
              </div>
            </div>
            
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5 space-y-2">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> Premium Benefits
              </p>
              <ul className="text-[10px] text-gray-400 space-y-1 list-disc list-inside">
                <li>5 Approved Uploads = 10 Days Premium</li>
                <li>10 Approved Uploads = 10 Days Premium</li>
                <li>15 Approved Uploads = 10 Days Premium</li>
                <li>20 Approved Uploads = 30 Days Premium</li>
                <li>Unlocks 1000 daily credits on AI Tools</li>
              </ul>
            </div>
          </div>

          {/* Guidelines */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="text-cyan-400" size={18} /> Guidelines
            </h3>
            <ul className="text-xs text-gray-400 space-y-2.5 list-none">
              <li className="flex gap-2">
                <span className="text-fuchsia-400 font-bold">1.</span>
                <span>Ensure documents are high resolution and legible.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-400 font-bold">2.</span>
                <span>Avoid uploading duplicate files for the same course units.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-400 font-bold">3.</span>
                <span>Enter clear titles (e.g., "Unit 1 Lecture Slides" instead of "Notes").</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      <CreateCourseModal isOpen={isSuggestModalOpen} onClose={() => setIsSuggestModalOpen(false)} />
    </div>
  );
}
