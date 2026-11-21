"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  HelpCircle, 
  Loader2, 
  Upload, 
  FileText, 
  Trash2, 
  Plus, 
  Sparkles 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/components/Toast";
import { sendEmailVerification } from "firebase/auth";
import { notifyAdmins } from "@/lib/notifications";
import { useSubjects } from "@/context/SubjectsContext";
import { uploadToDriveDirect } from "@/lib/driveUpload";

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectName?: string;
}

type MaterialCategory = "notes" | "questions" | "pyq";

export default function AddSubjectModal({
  isOpen,
  onClose,
  initialSubjectName = ""
}: AddSubjectModalProps) {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { allSubjectsList, createSubject } = useSubjects();

  const [subjectName, setSubjectName] = useState(initialSubjectName);
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

  useEffect(() => {
    if (isOpen) {
      setSubjectName(initialSubjectName);
      setSubjectCode("");
      setSelectedCategory("notes");
      setMaterialTitle("");
      setFile(null);
      setError("");
      setUploadStatus("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen, initialSubjectName]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Duplicate subject detection in allSubjectsList
  const isDuplicate =
    subjectName.trim().length > 0 &&
    allSubjectsList.some((s) => {
      const nameMatch = (s.name || "").trim().toLowerCase() === subjectName.trim().toLowerCase();
      const codeMatch = Boolean(
        subjectCode.trim() && s.code && s.code.trim().toLowerCase() === subjectCode.trim().toLowerCase()
      );
      return nameMatch || codeMatch;
    });

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

    // Auto-fill material title if user hasn't typed one yet
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
      setError("Please sign in to add a subject with study materials.");
      return;
    }

    if (!subjectName.trim()) {
      setError("Subject Name is required.");
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

    if (isDuplicate) {
      setError(`A subject with this name or code already exists in Paperino.`);
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
      // 1. Generate clean subjectId
      const generatedSubId = subjectCode.trim()
        ? subjectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
        : subjectName.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");

      // 2. Upload file directly to Google Drive
      const uploadResult = await uploadToDriveDirect(file, "1", generatedSubId);

      setUploadStatus(isAdmin ? "Publishing subject and material..." : "Submitting to admin review queue...");

      // 3. Save new material record in 'materials' with pending status and isNewSubjectRequest flag
      const newMaterialRecord = {
        departmentId: "btech",
        departmentName: "Bachelor of Technology",
        semesterId: "1",
        subjectId: generatedSubId,
        subjectName: subjectName.trim(),
        subjectCode: subjectCode.trim(),
        title: materialTitle.trim(),
        category: selectedCategory,
        fileId: uploadResult.fileId,
        fileName: file.name,
        fileUrl: uploadResult.webViewLink || "",
        status: isAdmin ? "approved" : "pending",
        uploaderId: user.uid,
        uploaderName: user.displayName || user.email || "Contributor",
        uploaderEmail: user.email || null,
        isNewSubjectRequest: true,
        newSubjectData: {
          name: subjectName.trim(),
          code: subjectCode.trim(),
          departmentId: "btech",
          semesterId: "1",
        },
        createdAt: Date.now(),
      };

      await addDoc(collection(db, "materials"), newMaterialRecord);

      // If user is admin, immediately create subject in dynamic_subjects
      if (isAdmin) {
        await createSubject(
          "btech",
          "1",
          subjectName.trim(),
          subjectCode.trim(),
          false,
          user.uid,
          user.displayName || "Admin",
          [selectedCategory]
        );
      }

      // 4. Notify admins in real-time
      if (!isAdmin) {
        await notifyAdmins(
          db,
          "New Subject & Material Submitted",
          `${user.displayName || user.email || "A student"} submitted new subject "${subjectName.trim()}" with ${getCategoryLabel(selectedCategory)} ("${materialTitle.trim()}"). Awaiting approval in Reviews.`,
          "subject_suggested"
        );
      }

      setSuccess(true);
      showToast(
        isAdmin
          ? "Subject and study material created and published live!"
          : "Subject and study material submitted for admin review!",
        "success"
      );

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2200);
    } catch (err: any) {
      console.error("Failed to submit subject and material:", err);
      setError(err?.message || "Something went wrong while uploading. Please try again.");
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 p-6 md:p-8 shadow-[0_20px_60px_rgba(139,92,246,0.25)] overflow-hidden text-left my-8"
        style={{ background: "rgba(12,8,24,0.98)", backdropFilter: "blur(20px)" }}
      >
        {/* Decorative glow orb */}
        <div className="absolute -right-24 -top-24 w-48 h-48 bg-purple-500/15 blur-[80px] rounded-full pointer-events-none"></div>

        {/* Modal Close Button */}
        <button
          onClick={!loading ? onClose : undefined}
          disabled={loading}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center text-center py-10 space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] mb-2">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-white">Subject & Material Submitted!</h3>
            <p className="text-gray-400 text-sm max-w-sm">
              {isAdmin
                ? "Your new subject and attached study material are now published live on Paperino!"
                : "Thank you! Your new subject and attached study material have been submitted to admin review. Once verified, they will be published live!"
              }
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <BookOpen size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Add New Subject</h3>
                <p className="text-xs text-gray-400">Upload study material to establish this subject in Paperino</p>
              </div>
            </div>

            {/* Subject Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Subject Name <span className="text-rose-500">*</span>
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
                className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
                  isDuplicate ? "border-emerald-500/50 focus:border-emerald-500" : "border-white/10 focus:border-purple-500/50"
                }`}
              />
              {isDuplicate && (
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-1.5 px-0.5">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> <span>This subject already exists in Paperino.</span>
                </p>
              )}
            </div>

            {/* Subject Code */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Subject Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 21CSC201J"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors uppercase"
              />
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-purple-300 mb-2">
                Choose Material Section to Upload <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedCategory("pyq");
                    if (file) setMaterialTitle(autoGenerateMaterialTitle(file, "pyq", subjectName));
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
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

            {/* Material Title */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Material Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder={`e.g. ${subjectName ? subjectName + " " : ""}Unit 1 ${getCategoryLabel(selectedCategory)}`}
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Mandatory File Upload Dropzone */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                Upload Document / PDF <span className="text-rose-500">* (Required)</span>
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
                  onClick={() => !loading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-white/15 bg-white/[0.02] hover:border-purple-500/40 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-2 text-purple-400">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs font-semibold text-white mb-0.5">
                    Click to browse or drag & drop file
                  </p>
                  <p className="text-[10px] text-gray-400">
                    PDF, Word, PPT or Image (Max 20MB)
                  </p>
                  <p className="text-[10px] text-purple-400/80 mt-1 font-medium">
                    * You must attach a study material to establish this subject.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[220px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={loading}
                    className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl animate-shake">
                {error}
              </p>
            )}

            {uploadStatus && (
              <p className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-purple-400" />
                <span>{uploadStatus}</span>
              </p>
            )}

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isDuplicate || !file}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-purple-900/30"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                <span>Submit Subject & Material</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
