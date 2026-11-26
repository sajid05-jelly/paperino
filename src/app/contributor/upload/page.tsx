"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  Info, 
  Zap, 
  Users, 
  Gift, 
  Clock, 
  HelpCircle, 
  Trash2,
  X
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useSubjects } from "@/context/SubjectsContext";
import { uploadToDriveDirect } from "@/lib/driveUpload";
import { notifyAdmins } from "@/lib/notifications";
import { sendEmailVerification } from "firebase/auth";
import { useToast } from "@/components/Toast";

type MaterialCategory = "pyq" | "notes" | "questions";

export default function ContributorUploadPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { departments, allSubjectsList, loading: contextLoading } = useSubjects();

  const [selectedDeptId, setSelectedDeptId] = useState("btech");
  const [customDeptName, setCustomDeptName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory>("notes");
  const [materialTitle, setMaterialTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default department
  useEffect(() => {
    if (departments.length > 0 && selectedDeptId === "btech") {
      const btechExists = departments.some(d => d.id === "btech");
      if (!btechExists) {
        setSelectedDeptId(departments[0].id);
      }
    }
  }, [departments, selectedDeptId]);

  // Check if subject already exists
  const existingSubject = (allSubjectsList || []).find((s) => {
    const nameMatch = (s.name || "").trim().toLowerCase() === subjectName.trim().toLowerCase();
    const codeMatch = Boolean(
      subjectCode.trim() && s.code && s.code.trim().toLowerCase() === subjectCode.trim().toLowerCase()
    );
    return nameMatch || codeMatch;
  });

  const isDuplicate = subjectName.trim().length > 0 && Boolean(existingSubject);

  const getCategoryLabel = (cat: MaterialCategory) => {
    switch (cat) {
      case "pyq":
        return "Question Papers";
      case "notes":
        return "Notes";
      case "questions":
        return "Important Questions";
    }
  };

  const autoGenerateMaterialTitle = (selectedFile: File, cat: MaterialCategory, subName: string) => {
    const cleanSubName = subName.trim() || "Subject";
    const catLabel = getCategoryLabel(cat);

    // Try detecting unit from filename
    const unitMatch = selectedFile.name.match(/unit[\s_-]*(\d+)/i);
    if (unitMatch && unitMatch[1]) {
      return `${cleanSubName} - Unit ${unitMatch[1]} ${catLabel}`;
    }

    // Try detecting year for PYQs
    if (cat === "pyq") {
      const yearMatch = selectedFile.name.match(/(20\d{2})/);
      if (yearMatch && yearMatch[1]) {
        return `${cleanSubName} - ${yearMatch[1]} Question Paper`;
      }
      return `${cleanSubName} - Past Question Paper`;
    }

    return `${cleanSubName} - ${catLabel}`;
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");

    if (!materialTitle.trim()) {
      setMaterialTitle(autoGenerateMaterialTitle(selectedFile, selectedCategory, subjectName));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Please sign in to upload study materials.");
      return;
    }

    if (!subjectName.trim()) {
      setError("Subject Name is required.");
      return;
    }

    if (selectedDeptId === "new" && !customDeptName.trim()) {
      setError("Please specify the Department name.");
      return;
    }

    if (!file) {
      setError("Study material file is strictly required. Please attach a PDF or document.");
      return;
    }

    if (!materialTitle.trim()) {
      setError("Material Title is required.");
      return;
    }

    if (user && !user.emailVerified && user.providerData.some((p) => p.providerId === "password")) {
      setError("Please verify your email to submit study materials. We are resending a verification link.");
      try {
        await sendEmailVerification(user);
        showToast("Verification email sent! Please check your inbox.", "info");
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }
      return;
    }

    setLoading(true);
    setError("");
    setUploadStatus("Uploading study material to Google Drive...");

    try {
      // Resolve department info
      let targetDeptId = selectedDeptId;
      let targetDeptName = "Bachelor of Technology";

      if (selectedDeptId === "new") {
        targetDeptName = customDeptName.trim();
        targetDeptId = targetDeptName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      } else {
        const foundDept = departments.find((d) => d.id === selectedDeptId);
        if (foundDept) {
          targetDeptName = foundDept.name;
        } else if (selectedDeptId === "btech") {
          targetDeptName = "Bachelor of Technology";
        } else {
          targetDeptName = selectedDeptId.toUpperCase();
        }
      }

      const generatedSubId = existingSubject
        ? existingSubject.id
        : subjectCode.trim()
        ? subjectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
        : subjectName.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");

      const targetSemId = existingSubject?.semesterId || "1";

      // 1. Upload file to Google Drive
      const uploadResult = await uploadToDriveDirect(file, targetSemId, generatedSubId);

      setUploadStatus("Submitting study material for review...");

      // 2. Submit material record to Server API (/api/materials)
      const newMaterialRecord = {
        departmentId: targetDeptId,
        departmentName: targetDeptName,
        semesterId: targetSemId,
        subjectId: generatedSubId,
        subjectName: subjectName.trim(),
        subjectCode: subjectCode.trim(),
        title: materialTitle.trim(),
        category: selectedCategory,
        fileId: uploadResult.fileId,
        fileName: file.name,
        fileUrl: uploadResult.webViewLink || "",
        status: "pending",
        isContributor: true,
        uploaderId: user.uid,
        uploaderName: user.displayName || user.email || "Contributor",
        uploaderEmail: user.email ? user.email.toLowerCase().trim() : null,
        isNewSubjectRequest: !existingSubject,
        newSubjectData: !existingSubject ? {
          name: subjectName.trim(),
          code: subjectCode.trim(),
          departmentId: targetDeptId,
          semesterId: targetSemId,
        } : undefined,
        createdAt: Date.now(),
      };

      let serverSaved = false;
      try {
        const token = await user.getIdToken(true);
        if (token) {
          const apiRes = await fetch("/api/materials", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(newMaterialRecord)
          });

          if (apiRes.ok) {
            serverSaved = true;
          } else {
            const apiErr = await apiRes.json().catch(() => ({}));
            if (apiErr.error) {
              throw new Error(apiErr.error);
            }
          }
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes("Failed to fetch")) {
          throw apiErr;
        }
        console.warn("[ContributorUploadPage] Server API notice, falling back to client SDK:", apiErr);
      }

      if (!serverSaved) {
        await addDoc(collection(db, "materials"), newMaterialRecord);
      }

      // 3. Notify admins in real-time
      await notifyAdmins(
        db,
        "New Material Uploaded",
        `New material uploaded by ${user.displayName || user.email || "a contributor"} and is waiting for review.`,
        "material_uploaded"
      );

      setSuccess(true);
      showToast("Subject & study material submitted for admin review!", "success");

    } catch (err: any) {
      console.error("Failed to submit subject and material:", err);
      const errMsg = err?.message || "";
      if (errMsg.includes("insufficient permissions") || errMsg.includes("permission-denied")) {
        setError("Account authorization required. Please sign in again or refresh to complete upload.");
      } else {
        setError(errMsg || "Something went wrong while uploading. Please try again.");
      }
    } finally {
      setLoading(false);
      setUploadStatus("");
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

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Contribution Center</h1>
        <p className="text-gray-400">Share notes, question papers, or suggest new department listings to help SRM students succeed.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left / Middle: Upload Form (Image 1 Format) */}
        <div 
          className="lg:col-span-2 rounded-3xl border border-white/10 p-6 md:p-8 shadow-[0_20px_60px_rgba(139,92,246,0.15)] relative overflow-hidden text-left"
          style={{ background: "rgba(12,8,24,0.95)" }}
        >
          {/* Decorative glow orb */}
          <div className="absolute -right-24 -top-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add New Subject</h2>
              <p className="text-xs text-gray-400">Upload study material to establish this subject in Paperino</p>
            </div>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-4 animate-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] mb-2">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-bold text-white">Subject & Material Submitted!</h3>
              <p className="text-gray-400 text-sm max-w-sm">
                Thank you! Your study material has been submitted to admin review. Once verified, it will be published live and count toward your Free Plus plan!
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setSubjectName("");
                  setSubjectCode("");
                  setMaterialTitle("");
                  setFile(null);
                  setError("");
                }}
                className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-white text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                Upload Another Material
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* SUBJECT NAME */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  SUBJECT NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Theory of Computation"
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    if (file && !materialTitle.trim()) {
                      setMaterialTitle(autoGenerateMaterialTitle(file, selectedCategory, e.target.value));
                    }
                  }}
                  required
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 focus:border-purple-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
                />
                {isDuplicate && (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-1.5 px-0.5">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span>This subject already exists in Paperino. Material will be added to it.</span>
                  </p>
                )}
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  DEPARTMENT <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#18112c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/60 transition-colors cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="bg-[#18112c] text-white">
                      {dept.name} ({dept.code || dept.id.toUpperCase()})
                    </option>
                  ))}
                  {!departments.some((d) => d.id === "btech") && (
                    <option value="btech" className="bg-[#18112c] text-white">
                      Bachelor of Technology (B.Tech)
                    </option>
                  )}
                  <option value="new" className="bg-[#18112c] text-purple-300 font-medium">
                    + Add / Specify New Department
                  </option>
                </select>

                {selectedDeptId === "new" && (
                  <div className="mt-2.5 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Enter Department Name (e.g. Master of Computer Applications / MCA)"
                      value={customDeptName}
                      onChange={(e) => setCustomDeptName(e.target.value)}
                      required={selectedDeptId === "new"}
                      disabled={loading}
                      className="w-full bg-white/5 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* SUBJECT CODE (OPTIONAL) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  SUBJECT CODE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="E.G. 21CSC201J"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors uppercase"
                />
              </div>

              {/* CHOOSE MATERIAL SECTION TO UPLOAD */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-purple-300 mb-2.5">
                  CHOOSE MATERIAL SECTION TO UPLOAD <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSelectedCategory("pyq");
                      if (file) setMaterialTitle(autoGenerateMaterialTitle(file, "pyq", subjectName));
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedCategory === "pyq"
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-500"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Question Papers
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSelectedCategory("notes");
                      if (file) setMaterialTitle(autoGenerateMaterialTitle(file, "notes", subjectName));
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedCategory === "notes"
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-500"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    Notes
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSelectedCategory("questions");
                      if (file) setMaterialTitle(autoGenerateMaterialTitle(file, "questions", subjectName));
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      selectedCategory === "questions"
                        ? "bg-purple-600/30 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-500"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    Important Questions
                  </button>
                </div>
              </div>

              {/* MATERIAL TITLE */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  MATERIAL TITLE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit 1 Notes"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                />
              </div>

              {/* UPLOAD DOCUMENT / PDF (REQUIRED) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                  UPLOAD DOCUMENT / PDF <span className="text-rose-500">* (REQUIRED)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip"
                  disabled={loading}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {!file ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      isDragging
                        ? "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                        : "border-white/10 hover:border-purple-500/40 bg-white/[0.02]"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-3 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                      <Upload size={20} />
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">
                      Click to browse or drag &amp; drop file
                    </p>
                    <p className="text-xs text-gray-400 mb-2">
                      PDF, Word, PPT or Image (Max 20MB)
                    </p>
                    <p className="text-[10px] text-purple-300 font-medium">
                      * You must attach a study material to establish this subject.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-purple-500/30 rounded-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="truncate text-left">
                        <p className="text-xs font-bold text-white truncate max-w-[280px]">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="p-2 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              {uploadStatus && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2.5 text-purple-300 text-xs font-medium animate-in fade-in">
                  <Loader2 size={14} className="animate-spin text-purple-400 shrink-0" />
                  <span>{uploadStatus}</span>
                </div>
              )}

              {/* Error Box */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs leading-relaxed animate-in fade-in">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSubjectName("");
                    setSubjectCode("");
                    setMaterialTitle("");
                    setFile(null);
                    setError("");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !subjectName.trim() || !file || !materialTitle.trim()}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  SUBMIT SUBJECT &amp; MATERIAL
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Right Column: Benefits & Guidelines */}
        <div className="space-y-6">

          {/* Help Expand Box */}
          <div className="glass-panel p-6 rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/[0.02] to-transparent space-y-5 shadow-[0_0_30px_rgba(217,70,239,0.08)] relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2 tracking-tight">
              Help Expand Paperino
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed font-light">
              Add any missing SRM subject or study material and help thousands of students prepare for examinations.
            </p>
            
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-fuchsia-300">
                <div className="w-5 h-5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                  <Zap size={12} />
                </div>
                Earn Contributor Points
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-amber-300">
                <div className="w-5 h-5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles size={12} />
                </div>
                Unlock Free Plus Plan
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-cyan-300">
                <div className="w-5 h-5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users size={12} />
                </div>
                Help Future Students
              </div>
            </div>
          </div>

          {/* Special Contributor Reward Box */}
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Gift className="text-fuchsia-400" size={18} /> Free Plus Plan Offer
            </h3>
            
            <div className="rounded-2xl bg-purple-500/15 border border-purple-500/30 p-3.5 space-y-2">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🎁 Upload 10+ Materials = Plus Plan FREE!</span>
              </p>
              <p className="text-[11px] text-purple-200/80 leading-relaxed">
                When 10 of your uploaded semester materials or PYQs are verified and approved by admin, your account automatically unlocks Paperino Plus Plan (Worth ₹29/mo) completely free!
              </p>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <p className="font-semibold text-gray-200">Perks Included:</p>
              <ul className="space-y-1.5 text-[11px] text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>10 Monthly PDF Downloads (2x free limit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Personalized PDF Watermarks</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>SRM Study Hub &amp; PYQ Predictor Access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Exclusive Plus Badge on Profile</span>
                </li>
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
                <span>Enter clear titles (e.g., &quot;Unit 1 Lecture Slides&quot; instead of &quot;Notes&quot;).</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
