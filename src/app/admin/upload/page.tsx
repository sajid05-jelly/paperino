"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSubjects } from "@/context/SubjectsContext";
import { uploadToDriveDirect } from "@/lib/driveUpload";

export default function AdminUploadPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const { departments, subjects: dynamicSubjects, loading: contextLoading } = useSubjects();

  // Show all departments (or approved for safety)
  const approvedDepts = departments.filter(d => d.status === "approved");

  const [formData, setFormData] = useState({
    department: "",
    semester: "1",
    subject: "",
    title: "",
    category: "pyq",
  });

  // Set default values when approved departments load
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
    if (!file) {
      setMessage("Please select a file to upload.");
      return;
    }
    if (!formData.department || !formData.subject) {
      setMessage("Please ensure department and subject are selected.");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      // 1. Upload file directly to Google Drive
      const result = await uploadToDriveDirect(file, formData.semester, formData.subject);

      // 2. Save metadata to Firestore — store fileId only, NOT the Drive viewer URL
      await addDoc(collection(db, "materials"), {
        departmentId: formData.department,
        semesterId: formData.semester,
        subjectId: formData.subject,
        title: formData.title,
        category: formData.category,
        fileId: result.fileId,
        fileName: file.name,
        status: "approved",
        createdAt: Date.now()
      });

      setMessage("Material uploaded to Google Drive & saved successfully!");
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
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
        <p className="text-gray-400">Syncing course options...</p>
      </div>
    );
  }

  const selectedDeptObj = approvedDepts.find(d => d.id === formData.department);
  const semCount = selectedDeptObj?.totalSemesters || 8;
  const currentSubjects = (dynamicSubjects[formData.department]?.[formData.semester] || []).filter(s => s.status !== "pending");

  return (
    <div className="glass-panel p-8 rounded-2xl w-full">
      <h1 className="text-3xl font-bold text-white mb-6">Upload Material (Google Drive)</h1>
      <p className="text-gray-400 mb-8">Add new study materials for students. Select the structure and upload the file.</p>
      
      <form onSubmit={handleUpload} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
            <select name="department" value={formData.department} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 cursor-pointer">
              {approvedDepts.map(d => (
                <option key={d.id} value={d.id} className="bg-[#0a0714] text-white">{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Semester</label>
            <select name="semester" value={formData.semester} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 cursor-pointer">
              {Array.from({ length: semCount }, (_, i) => i + 1).map(sem => (
                <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
            <select name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 cursor-pointer">
              {currentSubjects.map(sub => (
                <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Material Title</label>
          <input name="title" value={formData.title} onChange={handleChange} type="text" placeholder="e.g., Unit 1 Handwritten Notes" required className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 cursor-pointer">
            <option value="pyq" className="bg-[#0a0714] text-white">Previous Year Question Papers</option>
            <option value="notes" className="bg-[#0a0714] text-white">Study Notes</option>
            <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">File Upload (PDF, DOCX, Images)</label>
          <div className={`border-2 border-dashed ${file ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-purple-500/50'} rounded-xl p-8 text-center transition-colors cursor-pointer`} onClick={() => document.getElementById("fileUpload")?.click()}>
            <Upload className={`mx-auto mb-3 ${file ? 'text-purple-400' : 'text-gray-400'}`} size={32} />
            <p className="text-gray-400 text-sm mb-2">
              {file ? file.name : "Drag and drop your file here, or click to browse"}
            </p>
            <input type="file" onChange={handleFileChange} className="hidden" id="fileUpload" accept=".pdf,.doc,.docx,.jpg,.png" />
            {!file && (
              <span className="mt-2 inline-block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
                Browse Files
              </span>
            )}
          </div>
        </div>

        {message && <div className={`p-4 rounded-xl text-sm ${message.includes("Error") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"}`}>{message}</div>}

        <button disabled={loading || !formData.title || !file || !formData.subject} type="submit" className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? "Uploading to Google Drive..." : "Publish Material"}
        </button>
      </form>
    </div>
  );
}
