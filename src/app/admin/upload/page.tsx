"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Plus } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSubjects } from "@/context/SubjectsContext";
import { uploadToDriveDirect } from "@/lib/driveUpload";

interface FileEntry {
  id: string;
  file: File;
  title: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export default function AdminUploadPage() {
  const [loading, setLoading] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { departments, subjects: dynamicSubjects, loading: contextLoading } = useSubjects();
  const approvedDepts = departments.filter(d => d.status === "approved");

  const [formData, setFormData] = useState({
    department: "",
    semester: "1",
    subject: "",
    category: "pyq",
  });

  useEffect(() => {
    if (approvedDepts.length > 0 && !formData.department) {
      const firstDeptId = approvedDepts[0].id;
      const firstSubId = dynamicSubjects[firstDeptId]?.["1"]?.[0]?.id || "";
      setFormData(prev => ({ ...prev, department: firstDeptId, semester: "1", subject: firstSubId }));
    }
  }, [approvedDepts, dynamicSubjects, formData.department]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newEntries: FileEntry[] = Array.from(e.target.files).map(f => ({
      id: `${f.name}_${Date.now()}_${Math.random()}`,
      file: f,
      title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
      status: "pending",
    }));
    setFileEntries(prev => [...prev, ...newEntries]);
    // Reset input so same files can be re-added if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setFileEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleTitleChange = (id: string, title: string) => {
    setFileEntries(prev => prev.map(e => e.id === id ? { ...e, title } : e));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "department") {
      const firstSubId = dynamicSubjects[value]?.["1"]?.[0]?.id || "";
      setFormData({ ...formData, department: value, semester: "1", subject: firstSubId });
    } else if (name === "semester") {
      const firstSubId = dynamicSubjects[formData.department]?.[value]?.[0]?.id || "";
      setFormData({ ...formData, semester: value, subject: firstSubId });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const pendingEntries = fileEntries.filter(f => f.status === "pending");
    if (pendingEntries.length === 0) return;
    if (!formData.department || !formData.subject) return;

    setLoading(true);
    setSuccessCount(0);
    let successTotal = 0;

    for (const entry of pendingEntries) {
      // Mark as uploading
      setFileEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "uploading" } : e));

      try {
        const result = await uploadToDriveDirect(entry.file, formData.semester, formData.subject);

        await addDoc(collection(db, "materials"), {
          departmentId: formData.department,
          semesterId: formData.semester,
          subjectId: formData.subject,
          title: entry.title.trim() || entry.file.name,
          category: formData.category,
          fileId: result.fileId,
          fileName: entry.file.name,
          status: "approved",
          createdAt: Date.now(),
        });

        setFileEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "done" } : e));
        successTotal++;
        setSuccessCount(successTotal);
      } catch (err: any) {
        setFileEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, status: "error", error: err.message || "Upload failed" } : e
        ));
      }
    }

    setLoading(false);
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
  const pendingCount = fileEntries.filter(f => f.status === "pending").length;
  const doneCount = fileEntries.filter(f => f.status === "done").length;
  const errorCount = fileEntries.filter(f => f.status === "error").length;

  return (
    <div className="glass-panel p-8 rounded-2xl w-full">
      <h1 className="text-3xl font-bold text-white mb-2">Upload Materials (Google Drive)</h1>
      <p className="text-gray-400 mb-8">Select multiple files at once. Each file uploads sequentially to Google Drive and is saved to Firestore.</p>

      <form onSubmit={handleUpload} className="space-y-6 max-w-3xl">
        {/* Department / Semester / Subject */}
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

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category (applies to all files)</label>
          <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-purple-500 cursor-pointer">
            <option value="pyq" className="bg-[#0a0714] text-white">Previous Year Question Papers</option>
            <option value="notes" className="bg-[#0a0714] text-white">Study Notes</option>
            <option value="questions" className="bg-[#0a0714] text-white">Important Questions</option>
          </select>
        </div>

        {/* File Drop Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Files (select multiple)</label>
          <div
            className="border-2 border-dashed border-white/20 hover:border-purple-500/60 rounded-xl p-8 text-center transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto mb-3 text-gray-400" size={32} />
            <p className="text-gray-400 text-sm mb-3">Click to browse or drag &amp; drop multiple files here</p>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm transition-colors">
              <Plus size={14} /> Add Files
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilesChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.png,.ppt,.pptx,.zip"
            />
          </div>
        </div>

        {/* File Queue */}
        {fileEntries.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-300">{fileEntries.length} file{fileEntries.length > 1 ? "s" : ""} queued</span>
              <div className="flex gap-3 text-xs">
                {doneCount > 0 && <span className="text-emerald-400">✓ {doneCount} done</span>}
                {errorCount > 0 && <span className="text-red-400">✗ {errorCount} failed</span>}
                {pendingCount > 0 && <span className="text-gray-400">{pendingCount} pending</span>}
              </div>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {fileEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    entry.status === "done" ? "bg-emerald-500/5 border-emerald-500/20" :
                    entry.status === "error" ? "bg-red-500/5 border-red-500/20" :
                    entry.status === "uploading" ? "bg-purple-500/10 border-purple-500/30" :
                    "bg-white/[0.03] border-white/10"
                  }`}
                >
                  {/* Status icon */}
                  <div className="shrink-0">
                    {entry.status === "done" && <CheckCircle2 size={18} className="text-emerald-400" />}
                    {entry.status === "error" && <AlertCircle size={18} className="text-red-400" />}
                    {entry.status === "uploading" && <Loader2 size={18} className="text-purple-400 animate-spin" />}
                    {entry.status === "pending" && <FileText size={18} className="text-gray-500" />}
                  </div>

                  {/* Title input */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={entry.title}
                      onChange={e => handleTitleChange(entry.id, e.target.value)}
                      disabled={entry.status !== "pending"}
                      placeholder="Material title..."
                      className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-60"
                    />
                    <p className="text-[10px] text-gray-600 truncate mt-0.5">{entry.file.name} · {(entry.file.size / 1024 / 1024).toFixed(1)}MB</p>
                    {entry.status === "error" && entry.error && (
                      <p className="text-[10px] text-red-400 mt-0.5">{entry.error}</p>
                    )}
                  </div>

                  {/* Remove button */}
                  {entry.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(entry.id)}
                      className="shrink-0 text-gray-600 hover:text-red-400 transition cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          disabled={loading || pendingCount === 0 || !formData.subject}
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Uploading {successCount + 1} of {pendingCount + successCount}...
            </>
          ) : (
            <>
              <Upload size={16} />
              {pendingCount > 0 ? `Publish ${pendingCount} Material${pendingCount > 1 ? "s" : ""}` : "All Files Uploaded"}
            </>
          )}
        </button>

        {doneCount > 0 && !loading && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            ✓ {doneCount} material{doneCount > 1 ? "s" : ""} uploaded to Google Drive &amp; saved successfully!
          </div>
        )}
      </form>
    </div>
  );
}
