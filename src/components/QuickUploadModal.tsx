"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, CheckCircle2, FileText } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSound } from "@/hooks/useSound";
import { useAuth } from "@/context/AuthContext";
import { uploadToDriveDirect } from "@/lib/driveUpload";
import { notifyAdmins } from "@/lib/notifications";


interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesterId: string;
  subjectId: string;
  departmentId?: string;
  category: "pyq" | "notes" | "questions";
  existingMaterials?: any[];
  isContributor?: boolean;
  onSuccess: (newMaterial: any) => void;
}

export default function QuickUploadModal({
  isOpen,
  onClose,
  semesterId,
  subjectId,
  departmentId = "btech",
  category,
  existingMaterials = [],
  isContributor = false,
  onSuccess
}: QuickUploadModalProps) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [autoFillGlow, setAutoFillGlow] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playSuccess } = useSound();

  const processAutoTitle = (selectedFile: File) => {
    if (category !== "notes" && category !== "questions") return;
    
    let generatedTitle = "";
    const suffix = category === "notes" ? "Notes" : "Important Questions";
    
    // 1. Try Regex from filename
    const unitMatch = selectedFile.name.match(/unit[\s_-]*(\d+)/i);
    if (unitMatch && unitMatch[1]) {
      generatedTitle = `Unit ${unitMatch[1]} ${suffix}`;
    } else {
      // 2. Fallback to sequence using existing materials
      const categoryMats = existingMaterials.filter((m: any) => m.category === category);
      let maxUnit = 0;
      categoryMats.forEach((m: any) => {
        const match = m.title.match(/Unit (\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1]);
          if (num > maxUnit) maxUnit = num;
        }
      });
      generatedTitle = `Unit ${maxUnit + 1} ${suffix}`;
    }

    setTitle(generatedTitle);
    setAutoFillGlow(true);
    setTimeout(() => setAutoFillGlow(false), 2000);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTitle("");
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      processAutoTitle(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processAutoTitle(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // 1. Upload file directly to Google Drive
      const result = await uploadToDriveDirect(file, semesterId, subjectId);

      const newMaterial = {
        departmentId,
        semesterId,
        subjectId,
        title,
        category,
        fileId: result.fileId,
        fileName: file.name,
        status: isAdmin ? "approved" : "pending",
        uploaderId: user?.uid || null,
        uploaderName: user?.displayName || "Contributor",
        uploadedBy: isAdmin ? "admin" : "contributor",
        createdAt: Date.now()
      };

      // 2. Save metadata to Firestore using the Google Drive link
      const docRef = await addDoc(collection(db, "materials"), newMaterial);

      // 3. Notify admins if the material is pending review (contributor upload)
      if (!isAdmin) {
        await notifyAdmins(
          db,
          "New Material Uploaded",
          `New material uploaded by ${user?.displayName || user?.email || "a contributor"} and is waiting for review.`,
          "material_uploaded"
        );
      }

      setSuccess(true);
      playSuccess();
      
      // Pass the new material back to the parent to update UI instantly
      setTimeout(() => {
        onSuccess({ id: docRef.id, ...newMaterial });
        onClose();
      }, 1500); // Wait a bit to show success animation
      
    } catch (err: any) {
      console.error("Error saving material:", err);
      setError(err.message || "Error saving material. Check console.");
      setLoading(false);
    }
  };

  const getCategoryName = () => {
    if (category === "pyq") return "Previous Year Question";
    if (category === "notes") return "Study Notes";
    if (category === "questions") return "Important Questions";
    return "Material";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined}></div>
      
      <div className="relative w-full max-w-lg bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="text-[color:var(--primary-400)]" /> Upload {getCategoryName()}
            </h2>
          </div>
          <button onClick={!loading ? onClose : undefined} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={40} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {isAdmin ? "Upload Successful!" : "Submission Successful!"}
              </h3>
              <p className="text-emerald-400 text-center">
                {isAdmin 
                  ? `File has been added to ${getCategoryName()}.` 
                  : "File has been submitted and is awaiting administrator review."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Material Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g., Unit 1 Handwritten Notes" 
                  required 
                  disabled={loading}
                  className={`w-full bg-white/5 border rounded-xl p-3 text-white outline-none focus:bg-white/10 transition-all duration-500 ${
                    autoFillGlow 
                      ? 'border-[color:var(--primary-400)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' 
                      : 'border-white/10 focus:border-[color:var(--primary-400)]'
                  }`} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">File Upload</label>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-[color:var(--primary-400)] bg-[color:var(--primary-500)]/10' 
                      : file 
                        ? 'border-[color:var(--primary-500)]/50 bg-[color:var(--primary-500)]/5' 
                        : 'border-white/20 hover:border-[color:var(--primary-400)]/50 hover:bg-white/5'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange} 
                    className="hidden" 
                    disabled={loading}
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-[color:var(--primary-500)]/20 rounded-full mb-3 text-[color:var(--primary-300)]">
                        <FileText size={32} />
                      </div>
                      <p className="text-white font-medium mb-1 truncate max-w-xs">{file.name}</p>
                      <p className="text-gray-400 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-[color:var(--primary-400)]' : 'text-gray-400'}`} size={32} />
                      <p className="text-gray-300 font-medium mb-1">
                        Drag and drop your file here
                      </p>
                      <p className="text-gray-500 text-sm">
                        or click to browse from your computer
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm bg-red-500/20 text-red-400 border border-red-500/50">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || !title || !file} 
                className="w-full bg-[color:var(--primary-600)] hover:bg-[color:var(--primary-500)] text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  "Upload Material"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
