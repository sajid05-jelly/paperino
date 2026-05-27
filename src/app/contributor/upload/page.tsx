"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";

export default function ContributorUploadPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const { subjects: dynamicSubjects } = useSubjects();
  const [formData, setFormData] = useState({
    semester: "1",
    subject: "calc",
    title: "",
    category: "pyq",
  });

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
    
    setLoading(true);
    setMessage("");
    
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("semester", formData.semester);
      uploadData.append("subject", formData.subject);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to upload to Google Drive");
      }

      await addDoc(collection(db, "materials"), {
        semesterId: formData.semester,
        subjectId: formData.subject,
        title: formData.title,
        category: formData.category,
        fileUrl: result.webViewLink,
        fileId: result.fileId,
        fileName: file.name,
        uploaderId: user.uid,
        uploaderName: user.displayName || "Contributor",
        uploadedBy: "contributor",
        status: "pending",
        createdAt: Date.now()
      });

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
    if (name === "semester") {
      setFormData({ ...formData, semester: value, subject: dynamicSubjects[value]?.[0]?.id || "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const currentSubjects = dynamicSubjects[formData.semester] || [];

  return (
    <div className="glass-panel p-8 rounded-2xl w-full border border-white/5">
      <h1 className="text-3xl font-bold text-white mb-2">Upload Material</h1>
      <p className="text-gray-400 mb-8">Share resources with the community. Please ensure documents are high quality and clearly titled.</p>
      
      <form onSubmit={handleUpload} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Semester</label>
            <select name="semester" value={formData.semester} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
              {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                <option key={sem} value={sem.toString()} className="bg-[#0a0714] text-white">Semester {sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
            <select name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
              {currentSubjects.map(sub => (
                <option key={sub.id} value={sub.id} className="bg-[#0a0714] text-white">{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Material Title</label>
          <input name="title" value={formData.title} onChange={handleChange} type="text" placeholder="e.g., Unit 1 Handwritten Notes" required className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-fuchsia-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-fuchsia-500 cursor-pointer">
            <option value="pyq" className="bg-[#0a0714] text-white">Previous Year Question Papers</option>
            <option value="notes" className="bg-[#0a0714] text-white">Study Notes</option>
            <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">File Upload (PDF, DOCX, Images)</label>
          <div className={`border-2 border-dashed ${file ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-white/20 hover:border-fuchsia-500/50'} rounded-xl p-8 text-center transition-colors cursor-pointer`} onClick={() => document.getElementById("fileUpload")?.click()}>
            <Upload className={`mx-auto mb-3 ${file ? 'text-fuchsia-400' : 'text-gray-400'}`} size={32} />
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

        <button disabled={loading || !formData.title || !file} type="submit" className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? "Uploading to Google Drive..." : "Publish Material"}
        </button>
      </form>
    </div>
  );
}
