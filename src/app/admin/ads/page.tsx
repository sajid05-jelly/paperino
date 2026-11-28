"use client";

import { useEffect, useState, useCallback, useId, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  AD_PLACEMENTS,
  AdCampaign,
  AdPlacementId,
  AdsGlobalConfig,
  AdCampaignStatus,
} from "@/lib/adTypes";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Upload,
  X,
  FileUp,
} from "lucide-react";

export default function AdminAdsPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [globalConfig, setGlobalConfig] = useState<AdsGlobalConfig | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Simplified Form Fields — only essentials
  const [formTitle, setFormTitle] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPlacement, setFormPlacement] = useState<AdPlacementId>("home_top");
  const [formMediaType, setFormMediaType] = useState<"image" | "video">("image");
  const [formDesktopUrl, setFormDesktopUrl] = useState("");
  const [formMobileUrl, setFormMobileUrl] = useState("");
  const [formPosterUrl, setFormPosterUrl] = useState("");
  const [formDestUrl, setFormDestUrl] = useState("");
  const [formAlt, setFormAlt] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formExpire, setFormExpire] = useState("");
  const [formPriority, setFormPriority] = useState(50);

  // File upload states
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Drag states
  const [draggingDesktop, setDraggingDesktop] = useState(false);
  const [draggingMobile, setDraggingMobile] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Desktop file name display
  const [desktopFileName, setDesktopFileName] = useState<string | null>(null);
  const [mobileFileName, setMobileFileName] = useState<string | null>(null);

  // Current timestamp for schedule comparison
  const [currentTime] = useState(() => Date.now());

  // Unique accessible IDs
  const titleInputId = useId();
  const brandInputId = useId();
  const placementSelectId = useId();
  const mediaTypeSelectId = useId();
  const destUrlInputId = useId();
  const altDescInputId = useId();
  const startAtInputId = useId();
  const expireAtInputId = useId();
  const priorityInputId = useId();

  // Helper to fetch admin authorization token
  const getAuthToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }, []);

  // Fetch all ads data
  const loadAdsData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/admin/ads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load campaigns");

      setGlobalConfig(data.config);
      setCampaigns(data.campaigns || []);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load campaigns";
      setFeedback({ type: "error", message: errorMsg });
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const token = await getAuthToken();
        if (!token) {
          if (!ignore) setLoading(false);
          return;
        }

        const res = await fetch("/api/admin/ads", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load campaigns");

        if (!ignore) {
          setGlobalConfig(data.config);
          setCampaigns(data.campaigns || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const errorMsg = err instanceof Error ? err.message : "Failed to load campaigns";
          setFeedback({ type: "error", message: errorMsg });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      ignore = true;
    };
  }, [getAuthToken]);

  // Toggle Global Kill Switch
  const toggleGlobalKillSwitch = async () => {
    if (!globalConfig) return;
    const nextState = !globalConfig.enabled;
    const actionLabel = nextState ? "ENABLE" : "DISABLE (KILL SWITCH)";

    if (!confirm(`Are you sure you want to ${actionLabel} the Paperino Ads system globally?`)) {
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ globalEnabled: nextState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle kill switch");

      setGlobalConfig((prev) => (prev ? { ...prev, enabled: nextState } : null));
      setFeedback({ type: "success", message: data.message });
      loadAdsData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to toggle kill switch";
      setFeedback({ type: "error", message: errorMsg });
    }
  };

  // Open Create Modal
  const openCreateModal = (prefillPlacement?: AdPlacementId) => {
    setEditingCampaign(null);
    setFormTitle("");
    setFormBrand("");
    setFormPlacement(prefillPlacement || "home_top");
    setFormMediaType("image");
    setFormDesktopUrl("");
    setFormMobileUrl("");
    setFormPosterUrl("");
    setFormDestUrl("https://");
    setFormAlt("");
    
    const now = new Date();
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setFormStart(now.toISOString().slice(0, 16));
    setFormExpire(future.toISOString().slice(0, 16));

    setFormPriority(50);
    setUploadFeedback(null);
    setModalError(null);
    setDesktopFileName(null);
    setMobileFileName(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (campaign: AdCampaign) => {
    setEditingCampaign(campaign);
    setModalError(null);
    setFormTitle(campaign.title);
    setFormBrand(campaign.brandName);
    setFormPlacement(campaign.placementId);
    setFormMediaType(campaign.mediaType);
    setFormDesktopUrl(campaign.desktopCreativeUrl);
    setFormMobileUrl(campaign.mobileCreativeUrl || "");
    setFormPosterUrl(campaign.videoPosterUrl || "");
    setFormDestUrl(campaign.destinationUrl);
    setFormAlt(campaign.accessibleDescription || "");
    setFormStart(campaign.startAt ? new Date(campaign.startAt).toISOString().slice(0, 16) : "");
    setFormExpire(campaign.expiresAt ? new Date(campaign.expiresAt).toISOString().slice(0, 16) : "");
    setFormPriority(campaign.priority || 50);
    setUploadFeedback(null);
    setDesktopFileName(null);
    setMobileFileName(null);
    setIsModalOpen(true);
  };

  // Handle Save Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    setModalError(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication missing");

      const payload: Record<string, unknown> = {
        title: formTitle.trim(),
        brandName: formBrand.trim(),
        contactEmail: "",
        contactPhone: "",
        placementId: formPlacement,
        mediaType: formMediaType,
        desktopCreativeUrl: formDesktopUrl.trim(),
        destinationUrl: formDestUrl.trim(),
        accessibleDescription: formAlt.trim() || `Ad by ${formBrand.trim()}`,
        startAt: new Date(formStart).toISOString(),
        expiresAt: new Date(formExpire).toISOString(),
        priority: Number(formPriority) || 50,
        targetAudience: { userTier: "all" as const },
        revenue: {
          amountInr: 0,
          amountReceivedInr: 0,
          paymentStatus: "pending" as const,
          paymentReference: "",
          internalNotes: "",
        },
        status: "published" as AdCampaignStatus,
      };

      if (formMobileUrl && formMobileUrl.trim()) {
        payload.mobileCreativeUrl = formMobileUrl.trim();
      } else if (editingCampaign && editingCampaign.mobileCreativeUrl) {
        payload.removeMobileCreative = true;
      }

      if (formPosterUrl && formPosterUrl.trim()) {
        payload.videoPosterUrl = formPosterUrl.trim();
      } else if (editingCampaign && editingCampaign.videoPosterUrl && formMediaType !== "video") {
        payload.removeVideoPoster = true;
      }

      let res;
      if (editingCampaign) {
        res = await fetch("/api/admin/ads", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ campaignId: editingCampaign.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/ads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save campaign");

      setFeedback({ type: "success", message: editingCampaign ? "Campaign updated ✓" : "Campaign published ✓" });
      setModalError(null);
      setIsModalOpen(false);
      loadAdsData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save campaign";
      setModalError(errorMsg);
      setFeedback({ type: "error", message: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Campaign
  const handleDeleteCampaign = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/ads?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setFeedback({ type: "success", message: "Campaign deleted ✓" });
      loadAdsData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete campaign";
      setFeedback({ type: "error", message: errorMsg });
    }
  };

  // Handle Pause / Resume toggle
  const toggleCampaignStatus = async (campaign: AdCampaign) => {
    const nextStatus: AdCampaignStatus = campaign.status === "published" ? "disabled" : "published";
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ campaignId: campaign.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change status");

      setFeedback({ type: "success", message: `Campaign ${nextStatus === "published" ? "activated" : "paused"} ✓` });
      loadAdsData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update";
      setFeedback({ type: "error", message: errorMsg });
    }
  };

  // ── Unified File Upload Handler (server-side direct upload, zero CORS / ad-blocker issues) ──
  const handleFileUpload = async (file: File, targetField: "desktop" | "mobile" | "poster") => {
    if (!file) return;

    const setUploading = targetField === "desktop" ? setUploadingDesktop : targetField === "mobile" ? setUploadingMobile : setUploadingPoster;
    setUploading(true);
    setUploadFeedback(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated. Please sign in as admin.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetField", targetField);
      formData.append("placementId", formPlacement);
      formData.append("mediaType", formMediaType);

      // Primary: Post directly to our resilient server-side media upload endpoint
      let uploadedUrl: string | null = null;
      let autoPosterUrl: string | undefined = undefined;

      try {
        const uploadRes = await fetch("/api/admin/media-upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.success && uploadData.url) {
          uploadedUrl = uploadData.url;
          autoPosterUrl = uploadData.posterUrl;
        } else {
          throw new Error(uploadData.error || `Server upload returned status ${uploadRes.status}`);
        }
      } catch (serverErr: any) {
        console.warn("Server direct upload attempt had an issue, trying ticket route fallback:", serverErr);
        // Fallback: If media-upload endpoint had a transient issue, try upload-ticket
        const ticketRes = await fetch("/api/admin/ads/upload-ticket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
            placementId: formPlacement,
            mediaType: formMediaType,
          }),
        });

        const ticketData = await ticketRes.json();
        if (!ticketRes.ok) throw new Error(ticketData.error || serverErr.message || "Upload failed");

        if (ticketData.storageProvider === "cloudinary") {
          const cFormData = new FormData();
          cFormData.append("file", file);
          cFormData.append("api_key", ticketData.apiKey);
          cFormData.append("timestamp", String(ticketData.timestamp));
          cFormData.append("signature", ticketData.signature);
          cFormData.append("folder", ticketData.folder);
          cFormData.append("public_id", ticketData.publicId);

          const cRes = await fetch(ticketData.uploadEndpoint, {
            method: "POST",
            body: cFormData,
          });
          const cJson = await cRes.json();
          if (!cRes.ok || !cJson.secure_url) throw new Error(cJson?.error?.message || "Cloudinary upload failed");
          uploadedUrl = cJson.secure_url;
        } else if (ticketData.storageProvider === "r2") {
          const putRes = await fetch(ticketData.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!putRes.ok) throw new Error(`R2 upload failed (${putRes.status})`);
          uploadedUrl = ticketData.publicUrl;
        }
      }

      if (!uploadedUrl) {
        throw new Error("Unable to obtain uploaded media URL.");
      }

      if (targetField === "desktop") {
        setFormDesktopUrl(uploadedUrl);
        setDesktopFileName(file.name);
      }
      if (targetField === "mobile") {
        setFormMobileUrl(uploadedUrl);
        setMobileFileName(file.name);
      }
      if (targetField === "poster") {
        setFormPosterUrl(uploadedUrl);
      }

      // Auto-generate poster for video uploads
      if (formMediaType === "video" && targetField === "desktop" && !formPosterUrl) {
        setFormPosterUrl(autoPosterUrl || uploadedUrl.replace(/\.[^/.]+$/, ".jpg"));
      }

      setUploadFeedback(`✓ ${file.name} uploaded successfully`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setUploadFeedback(`❌ ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, target: "desktop" | "mobile" | "poster") => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, target);
  };

  const handleDrop = (e: React.DragEvent, target: "desktop" | "mobile") => {
    e.preventDefault();
    if (target === "desktop") setDraggingDesktop(false);
    if (target === "mobile") setDraggingMobile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file, target);
  };

  // Compute stats locally
  const activeCampaigns = campaigns.filter((c) => {
    if (c.status !== "published") return false;
    const s = new Date(c.startAt).getTime();
    const exp = new Date(c.expiresAt).getTime();
    return currentTime >= s && currentTime <= exp;
  });

  if (!user || !isAdmin) {
    return <div className="p-8 text-center text-white">Unauthorized access.</div>;
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs uppercase tracking-wider font-semibold">Loading Paperino Ads...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto pb-16">
      {/* ── Header & Kill Switch ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Megaphone size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Paperino Ads</h1>
            <p className="text-[11px] text-gray-400">
              {campaigns.length} campaigns · {activeCampaigns.length} active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${globalConfig?.enabled ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className={`text-xs font-bold ${globalConfig?.enabled ? "text-emerald-300" : "text-red-400"}`}>
              {globalConfig?.enabled ? "LIVE" : "OFF"}
            </span>
          </div>

          <button
            onClick={toggleGlobalKillSwitch}
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              globalConfig?.enabled
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {globalConfig?.enabled ? "Kill All Ads" : "Enable Ads"}
          </button>

          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>New Ad</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Placement Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(AD_PLACEMENTS).map((slot) => {
          const assignedCampaigns = campaigns.filter((c) => c.placementId === slot.id && c.status === "published");
          const activeNow = assignedCampaigns.find((c) => {
            const s = new Date(c.startAt).getTime();
            const e = new Date(c.expiresAt).getTime();
            return currentTime >= s && currentTime <= e;
          });

          return (
            <div
              key={slot.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">{slot.id}</span>
                    <h3 className="text-sm font-bold text-white">{slot.name}</h3>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      activeNow
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-white/5 text-gray-500 border-white/10"
                    }`}
                  >
                    {activeNow ? "LIVE" : "EMPTY"}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 mb-3">{slot.locationDescription}</p>

                {/* Creative Preview */}
                <div className="w-full h-28 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center mb-3">
                  {activeNow ? (
                    activeNow.mediaType === "video" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {activeNow.videoPosterUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={activeNow.videoPosterUrl} alt="Poster" className="w-full h-full object-cover opacity-60" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video size={24} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeNow.desktopCreativeUrl}
                        alt={activeNow.accessibleDescription || "Ad"}
                        className="w-full h-full object-contain p-2"
                      />
                    )
                  ) : (
                    <div className="text-center p-3">
                      <ImageIcon size={20} className="mx-auto text-gray-600 mb-1" />
                      <span className="text-[10px] text-gray-500 block">No ad assigned</span>
                    </div>
                  )}
                </div>


                <div className="flex justify-between text-[10px] text-gray-500 mb-3">
                  <span>{slot.recommendedRatio}</span>
                  <span className="uppercase font-bold">{slot.supportedMedia.join(" & ")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openCreateModal(slot.id)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer text-center"
                >
                  {activeNow ? "Replace" : "+ Assign"}
                </button>
                {activeNow && (
                  <button
                    onClick={() => openEditModal(activeNow)}
                    title="Edit"
                    className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── All Campaigns List ── */}
      {campaigns.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-sm font-bold text-white">All Campaigns ({campaigns.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase font-black tracking-wider">
                <tr>
                  <th className="p-3">Brand & Title</th>
                  <th className="p-3">Placement</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Analytics</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white text-sm">{c.brandName}</div>
                      <div className="text-gray-400">{c.title}</div>
                      <a
                        href={c.destinationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 mt-0.5"
                      >
                        <span className="max-w-[120px] truncate">{c.destinationUrl}</span>
                        <ExternalLink size={9} />
                      </a>
                    </td>
                    <td className="p-3 text-gray-300 font-mono text-[10px]">{c.placementId}</td>
                    <td className="p-3 text-gray-300">
                      <div className="text-[10px]">{new Date(c.startAt).toLocaleDateString("en-IN")}</div>
                      <div className="text-gray-500 text-[10px]">{new Date(c.expiresAt).toLocaleDateString("en-IN")}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`uppercase text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          c.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : c.status === "disabled"
                            ? "bg-red-500/20 text-red-300 border-red-500/30"
                            : "bg-white/10 text-gray-400 border-white/10"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-white font-semibold">{(c.impressions || 0).toLocaleString()} <span className="text-[9px] text-gray-500">imp</span></div>
                      <div className="text-teal-400 text-[10px]">{(c.clicks || 0).toLocaleString()} <span className="text-gray-500">clicks</span></div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleCampaignStatus(c)}
                          title={c.status === "published" ? "Pause" : "Activate"}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                        >
                          {c.status === "published" ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          title="Edit"
                          className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(c.id, c.title)}
                          title="Delete"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c0817] border border-white/10 rounded-3xl shadow-2xl overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
              <div>
                <h2 className="text-lg font-black text-white">
                  {editingCampaign ? "Edit Ad" : "New Advertisement"}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Fill in details and upload your creative media.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-5 text-xs">
              {/* Modal Inline Error Alert */}
              {modalError && (
                <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/15 text-red-300 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                    <span>{modalError}</span>
                  </div>
                  <button type="button" onClick={() => setModalError(null)} className="p-1 text-red-400 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Brand & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={brandInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Brand / Company *
                  </label>
                  <input
                    id={brandInputId}
                    required
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Acme Edutech"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor={titleInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Campaign Title *
                  </label>
                  <input
                    id={titleInputId}
                    required
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Winter Internship Drive"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Placement & Media Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={placementSelectId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Placement *
                  </label>
                  <select
                    id={placementSelectId}
                    value={formPlacement}
                    onChange={(e) => setFormPlacement(e.target.value as AdPlacementId)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {Object.values(AD_PLACEMENTS).map((p) => (
                      <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={mediaTypeSelectId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Media Format *
                  </label>
                  <select
                    id={mediaTypeSelectId}
                    value={formMediaType}
                    onChange={(e) => setFormMediaType(e.target.value as "image" | "video")}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="image" className="bg-gray-900 text-white">Image (WebP / PNG / JPEG)</option>
                    <option value="video" className="bg-gray-900 text-white">Video (MP4 ≤ 30s)</option>
                  </select>
                </div>
              </div>

              {/* ── Creative Upload — Drag & Drop Zone ── */}
              <div className="space-y-3">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Upload Creative *</span>
                
                {/* Desktop Creative — Drag & Drop */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDraggingDesktop(true); }}
                  onDragLeave={() => setDraggingDesktop(false)}
                  onDrop={(e) => handleDrop(e, "desktop")}
                  onClick={() => desktopInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    draggingDesktop
                      ? "border-purple-400 bg-purple-500/10"
                      : formDesktopUrl
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-white/15 hover:border-purple-500/40 hover:bg-white/[0.02]"
                  }`}
                >
                  <input
                    ref={desktopInputRef}
                    type="file"
                    accept={formMediaType === "video" ? "video/mp4" : "image/webp,image/png,image/jpeg"}
                    className="hidden"
                    onChange={(e) => handleInputChange(e, "desktop")}
                    disabled={uploadingDesktop}
                  />

                  {uploadingDesktop ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-purple-300 text-xs">Uploading...</span>
                    </div>
                  ) : formDesktopUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                      <span className="text-emerald-300 font-semibold text-xs">{desktopFileName || "Creative uploaded"}</span>
                      <span className="text-gray-500 text-[10px]">Click or drag to replace</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileUp size={28} className="text-gray-500" />
                      <span className="text-gray-300 font-semibold">Click or drag & drop file</span>
                      <span className="text-gray-500 text-[10px]">
                        {formMediaType === "video" ? "MP4 (Max 3MB)" : "WebP, PNG, JPEG (Max 2MB)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Direct URL display & fallback */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                  {formDesktopUrl ? (
                    <span className="truncate max-w-[260px] font-mono text-[10px] text-purple-300" title={formDesktopUrl}>
                      {formDesktopUrl}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500">Auto-stored on Cloudinary CDN</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const inputUrl = prompt("Enter media HTTPS URL (e.g. from CDN or Cloudinary):", formDesktopUrl || "https://");
                      if (inputUrl && inputUrl.trim() && inputUrl.trim() !== "https://") {
                        setFormDesktopUrl(inputUrl.trim());
                        setDesktopFileName("Direct URL linked");
                      }
                    }}
                    className="text-purple-400 hover:text-purple-300 underline text-[10px] cursor-pointer"
                  >
                    {formDesktopUrl ? "Change URL" : "Or paste URL"}
                  </button>
                </div>

                {/* Optional Mobile Creative */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDraggingMobile(true); }}
                  onDragLeave={() => setDraggingMobile(false)}
                  onDrop={(e) => handleDrop(e, "mobile")}
                  onClick={() => mobileInputRef.current?.click()}
                  className={`relative border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    draggingMobile
                      ? "border-purple-400 bg-purple-500/10"
                      : formMobileUrl
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept={formMediaType === "video" ? "video/mp4" : "image/webp,image/png,image/jpeg"}
                    className="hidden"
                    onChange={(e) => handleInputChange(e, "mobile")}
                    disabled={uploadingMobile}
                  />

                  {uploadingMobile ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-purple-300 text-[11px]">Uploading mobile variant...</span>
                    </div>
                  ) : formMobileUrl ? (
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-emerald-300 text-[11px] truncate">{mobileFileName || "Mobile variant uploaded"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormMobileUrl("");
                          setMobileFileName(null);
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-500/10 cursor-pointer ml-2 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Upload size={14} />
                      <span className="text-[11px]">Optional: Upload mobile variant (uses desktop if omitted)</span>
                    </div>
                  )}
                </div>


                {/* Video Poster Upload (only for video) */}
                {formMediaType === "video" && (
                  <div
                    onClick={() => posterInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      formPosterUrl
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <input
                      ref={posterInputRef}
                      type="file"
                      accept="image/webp,image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => handleInputChange(e, "poster")}
                      disabled={uploadingPoster}
                    />
                    {uploadingPoster ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-purple-300 text-[11px]">Uploading poster...</span>
                      </div>
                    ) : formPosterUrl ? (
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          <span className="text-emerald-300 text-[11px] truncate">Video poster uploaded</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormPosterUrl("");
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded border border-red-500/30 hover:bg-red-500/10 cursor-pointer ml-2 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-gray-500">
                        <ImageIcon size={14} />
                        <span className="text-[11px]">Upload video poster image *</span>
                      </div>
                    )}
                  </div>
                )}

                {uploadFeedback && (
                  <p className={`text-[11px] p-2 rounded-lg border ${
                    uploadFeedback.startsWith("✓")
                      ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                      : uploadFeedback.startsWith("⚠")
                      ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                      : "text-red-300 bg-red-500/10 border-red-500/20"
                  }`}>
                    {uploadFeedback}
                  </p>
                )}
              </div>

              {/* Destination URL & Alt Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={destUrlInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Destination URL *
                  </label>
                  <input
                    id={destUrlInputId}
                    required
                    type="url"
                    value={formDestUrl}
                    onChange={(e) => setFormDestUrl(e.target.value)}
                    placeholder="https://brand.com/apply"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none font-mono text-xs focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor={altDescInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Alt Text (Optional)
                  </label>
                  <input
                    id={altDescInputId}
                    type="text"
                    value={formAlt}
                    onChange={(e) => setFormAlt(e.target.value)}
                    placeholder="e.g. Register for Summer Hackathon"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Schedule & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor={startAtInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Start Date *
                  </label>
                  <input
                    id={startAtInputId}
                    required
                    type="datetime-local"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor={expireAtInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Expiry Date *
                  </label>
                  <input
                    id={expireAtInputId}
                    required
                    type="datetime-local"
                    value={formExpire}
                    onChange={(e) => setFormExpire(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor={priorityInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Priority (1-100)
                  </label>
                  <input
                    id={priorityInputId}
                    type="number"
                    min="1"
                    max="100"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formDesktopUrl}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCampaign ? "Update Campaign" : "Publish Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
