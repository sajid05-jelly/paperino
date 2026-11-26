"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  AD_PLACEMENTS,
  AdCampaign,
  AdPlacementId,
  AdsGlobalConfig,
  AdPaymentStatus,
  AdCampaignStatus,
  AdUserTierTarget,
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
  Cloud,
  X,
} from "lucide-react";

interface AdsStats {
  totalCampaigns: number;
  active: number;
  scheduled: number;
  expired: number;
  disabled: number;
  totalImpressions?: number;
  totalClicks?: number;
  ctr?: number;
  revenue: {
    totalInr: number;
    receivedInr: number;
    outstandingInr: number;
  };
}

export default function AdminAdsPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [globalConfig, setGlobalConfig] = useState<AdsGlobalConfig | null>(null);
  const [stats, setStats] = useState<AdsStats | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [activeTab, setActiveTab] = useState<"placements" | "campaigns" | "revenue" | "r2setup">("placements");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal / Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
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
  const [formTier, setFormTier] = useState<AdUserTierTarget>("all");
  const [formAmountInr, setFormAmountInr] = useState(0);
  const [formReceivedInr, setFormReceivedInr] = useState(0);
  const [formPaymentStatus, setFormPaymentStatus] = useState<AdPaymentStatus>("pending");
  const [formPaymentRef, setFormPaymentRef] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<AdCampaignStatus>("draft");

  // Local file upload states
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Current timestamp for schedule comparison
  const [currentTime] = useState(() => Date.now());

  // Unique accessible IDs for form fields
  const titleInputId = useId();
  const brandInputId = useId();
  const emailInputId = useId();
  const phoneInputId = useId();
  const placementSelectId = useId();
  const mediaTypeSelectId = useId();
  const destUrlInputId = useId();
  const altDescInputId = useId();
  const startAtInputId = useId();
  const expireAtInputId = useId();
  const priorityInputId = useId();
  const tierSelectId = useId();
  const amountInputId = useId();
  const receivedInputId = useId();
  const paymentStatusSelectId = useId();
  const paymentRefInputId = useId();
  const notesTextareaId = useId();
  const statusSelectId = useId();

  // Helper to fetch admin authorization token
  const getAuthToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }, []);

  // Fetch all ads data on manual refresh / action completion
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
      setStats(data.stats);
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
          setStats(data.stats);
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
    setFormEmail("");
    setFormPhone("");
    setFormPlacement(prefillPlacement || "home_top");
    setFormMediaType("image");
    setFormDesktopUrl("");
    setFormMobileUrl("");
    setFormPosterUrl("");
    setFormDestUrl("https://");
    setFormAlt("");
    
    // Default: 30 days campaign duration starting now
    const now = new Date();
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setFormStart(now.toISOString().slice(0, 16));
    setFormExpire(future.toISOString().slice(0, 16));

    setFormPriority(50);
    setFormTier("all");
    setFormAmountInr(0);
    setFormReceivedInr(0);
    setFormPaymentStatus("pending");
    setFormPaymentRef("");
    setFormNotes("");
    setFormStatus("draft");
    setUploadFeedback(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (campaign: AdCampaign) => {
    setEditingCampaign(campaign);
    setFormTitle(campaign.title);
    setFormBrand(campaign.brandName);
    setFormEmail(campaign.contactEmail || "");
    setFormPhone(campaign.contactPhone || "");
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
    setFormTier(campaign.targetAudience?.userTier || "all");
    setFormAmountInr(campaign.revenue?.amountInr || 0);
    setFormReceivedInr(campaign.revenue?.amountReceivedInr || 0);
    setFormPaymentStatus(campaign.revenue?.paymentStatus || "pending");
    setFormPaymentRef(campaign.revenue?.paymentReference || "");
    setFormNotes(campaign.revenue?.internalNotes || "");
    setFormStatus(campaign.status);
    setUploadFeedback(null);
    setIsModalOpen(true);
  };

  // Handle Save Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication missing");

      const payload = {
        title: formTitle,
        brandName: formBrand,
        contactEmail: formEmail,
        contactPhone: formPhone,
        placementId: formPlacement,
        mediaType: formMediaType,
        desktopCreativeUrl: formDesktopUrl,
        mobileCreativeUrl: formMobileUrl || undefined,
        videoPosterUrl: formPosterUrl || undefined,
        destinationUrl: formDestUrl,
        accessibleDescription: formAlt,
        startAt: new Date(formStart).toISOString(),
        expiresAt: new Date(formExpire).toISOString(),
        priority: Number(formPriority) || 50,
        targetAudience: { userTier: formTier },
        revenue: {
          amountInr: Number(formAmountInr) || 0,
          amountReceivedInr: Number(formReceivedInr) || 0,
          paymentStatus: formPaymentStatus,
          paymentReference: formPaymentRef,
          internalNotes: formNotes,
        },
        status: formStatus,
      };

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

      setFeedback({ type: "success", message: editingCampaign ? "Campaign updated successfully" : "Campaign created successfully" });
      setIsModalOpen(false);
      loadAdsData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save campaign";
      setFeedback({ type: "error", message: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Campaign
  const handleDeleteCampaign = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/ads?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete campaign");

      setFeedback({ type: "success", message: "Campaign deleted successfully" });
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
      if (!res.ok) throw new Error(data.error || "Failed to change campaign status");

      setFeedback({ type: "success", message: `Campaign marked as ${nextStatus}` });
      loadAdsData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to delete campaign";
      setFeedback({ type: "error", message: errorMsg });
    }
  };

  // Handle Media File Selection & Upload Ticket
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "desktop" | "mobile" | "poster") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setUploadFeedback(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication missing");

      // Request presigned upload ticket from backend
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
      if (!ticketRes.ok) throw new Error(ticketData.error || "Failed to generate upload ticket");

      if (!ticketData.configured) {
        setUploadFeedback(
          "⚠️ Media storage credentials (Cloudinary or Cloudflare R2) are not yet configured in .env.local. You can enter public media URLs directly below."
        );
        return;
      }

      // Handler for Cloudinary Direct Upload
      if (ticketData.storageProvider === "cloudinary") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", ticketData.apiKey);
        formData.append("timestamp", String(ticketData.timestamp));
        formData.append("signature", ticketData.signature);
        formData.append("folder", ticketData.folder);
        formData.append("public_id", ticketData.publicId);

        const cloudRes = await fetch(ticketData.uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!cloudRes.ok) {
          const errData = await cloudRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Cloudinary upload failed with status ${cloudRes.status}`);
        }

        const cloudJson = await cloudRes.json();
        const uploadedUrl = cloudJson.secure_url;

        // Assign uploaded URL
        if (targetField === "desktop") setFormDesktopUrl(uploadedUrl);
        if (targetField === "mobile") setFormMobileUrl(uploadedUrl);
        if (targetField === "poster") setFormPosterUrl(uploadedUrl);

        // For video ads: Cloudinary automatically provides an instant video poster
        if (formMediaType === "video" && targetField === "desktop" && !formPosterUrl) {
          const autoPoster = uploadedUrl.replace(/\.[^/.]+$/, ".jpg");
          setFormPosterUrl(autoPoster);
        }

        setUploadFeedback(`✓ Uploaded successfully to Cloudinary: ${file.name}`);
        return;
      }

      // Handler for Cloudflare R2 Direct Upload
      if (ticketData.storageProvider === "r2") {
        const putRes = await fetch(ticketData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putRes.ok) throw new Error(`Cloudflare R2 direct upload failed with status ${putRes.status}`);

        // Assign uploaded URL
        if (targetField === "desktop") setFormDesktopUrl(ticketData.publicUrl);
        if (targetField === "mobile") setFormMobileUrl(ticketData.publicUrl);
        if (targetField === "poster") setFormPosterUrl(ticketData.publicUrl);

        setUploadFeedback(`✓ Uploaded successfully to R2: ${file.name}`);
        return;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload error";
      setUploadFeedback(`Upload error: ${errorMsg}`);
    } finally {
      setUploadingMedia(false);
    }
  };

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
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16">
      {/* ── Top Header & Global Kill Switch Banner ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md">
            <Megaphone size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Paperino Ads</h1>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Direct Ad Manager
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Admin-controlled direct advertising engine with zero-empty-box guarantee.
            </p>
          </div>
        </div>

        {/* Global Kill Switch Controller */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-black/40 p-3 rounded-2xl border border-white/10">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">System Kill Switch</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${globalConfig?.enabled ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-red-400 shadow-[0_0_8px_#f87171]"}`} />
              <span className={`text-xs font-black uppercase ${globalConfig?.enabled ? "text-emerald-300" : "text-red-400"}`}>
                {globalConfig?.enabled ? "ADS ACTIVE (ONLINE)" : "ADS GLOBALLY DISABLED (OFF)"}
              </span>
            </div>
          </div>

          <button
            onClick={toggleGlobalKillSwitch}
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
              globalConfig?.enabled
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {globalConfig?.enabled ? "Kill All Ads" : "Enable System"}
          </button>
        </div>
      </div>

      {/* ── Status Feedback Banner ─────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/15 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Overview Statistics Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-gray-400">Total Ads</span>
          <span className="text-xl font-black text-white mt-1">{stats?.totalCampaigns || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Active</span>
          <span className="text-xl font-black text-emerald-300 mt-1">{stats?.active || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-cyan-400">Scheduled</span>
          <span className="text-xl font-black text-cyan-300 mt-1">{stats?.scheduled || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-amber-400">Expired</span>
          <span className="text-xl font-black text-amber-300 mt-1">{stats?.expired || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-blue-500/[0.04] border border-blue-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-blue-400">Impressions</span>
          <span className="text-xl font-black text-blue-300 mt-1">{stats?.totalImpressions?.toLocaleString() || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-teal-500/[0.04] border border-teal-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-teal-400">Valid Clicks</span>
          <span className="text-xl font-black text-teal-300 mt-1">{stats?.totalClicks?.toLocaleString() || 0}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-indigo-500/[0.04] border border-indigo-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-indigo-400">CTR</span>
          <span className="text-xl font-black text-indigo-300 mt-1">{stats?.ctr || 0}%</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-500/[0.04] border border-purple-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-purple-400">Revenue</span>
          <span className="text-xl font-black text-purple-300 mt-1">₹{stats?.revenue.totalInr?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("placements")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "placements"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            Visual Placement Manager
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "campaigns"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            All Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab("revenue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "revenue"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            Revenue & Payments
          </button>
          <button
            onClick={() => setActiveTab("r2setup")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "r2setup"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Cloud size={14} />
            <span>Cloudflare R2 Setup Guide</span>
          </button>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>New Advertisement</span>
        </button>
      </div>

      {/* ── TAB 1: Visual Placement Manager ────────────────────────────────────────── */}
      {activeTab === "placements" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all group"
                >
                  <div>
                    {/* Header: Placement ID & Name */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">
                          {slot.id}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                          {slot.name}
                        </h3>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          activeNow
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-white/5 text-gray-400 border-white/10"
                        }`}
                      >
                        {activeNow ? "LIVE NOW" : "EMPTY"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed mb-4">{slot.locationDescription}</p>

                    {/* Creative Thumbnail / Placeholder */}
                    <div className="w-full h-32 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center relative mb-4">
                      {activeNow ? (
                        activeNow.mediaType === "video" ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-black">
                            {activeNow.videoPosterUrl && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={activeNow.videoPosterUrl}
                                alt="Poster"
                                className="w-full h-full object-cover opacity-60"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Video size={28} className="text-white drop-shadow-md" />
                            </div>
                            <span className="absolute bottom-2 left-2 text-[9px] font-black uppercase bg-black/70 px-2 py-0.5 rounded text-white border border-white/20">
                              Video (H.264)
                            </span>
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
                        <div className="text-center p-4">
                          <ImageIcon size={24} className="mx-auto text-gray-600 mb-1" />
                          <span className="text-[11px] text-gray-500 block">No creative assigned</span>
                          <span className="text-[9px] text-gray-600">Zero-box: Collapsed on website</span>
                        </div>
                      )}
                    </div>

                    {/* Specs & Dimensions */}
                    <div className="space-y-1.5 text-[11px] text-gray-400 border-t border-white/5 pt-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ratio:</span>
                        <span className="text-gray-300 font-semibold">{slot.recommendedRatio}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dimensions:</span>
                        <span className="text-gray-300 font-mono text-[10px]">{slot.dimensionsDescription}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Media:</span>
                        <span className="text-gray-300 uppercase text-[10px] font-bold">
                          {slot.supportedMedia.join(" & ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Placement Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => openCreateModal(slot.id)}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer text-center"
                    >
                      {activeNow ? "Replace Ad" : "+ Assign Ad"}
                    </button>
                    {activeNow && (
                      <button
                        onClick={() => openEditModal(activeNow)}
                        title="Edit Campaign"
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
        </div>
      )}

      {/* ── TAB 2: All Campaigns List ──────────────────────────────────────────────── */}
      {activeTab === "campaigns" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              No advertisement campaigns created yet. Click &quot;+ New Advertisement&quot; to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase font-black tracking-wider">
                  <tr>
                    <th className="p-4">Brand & Title</th>
                    <th className="p-4">Placement</th>
                    <th className="p-4">Format</th>
                    <th className="p-4">Schedule</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Analytics</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{c.brandName}</div>
                        <div className="text-gray-400 text-xs">{c.title}</div>
                        <a
                          href={c.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 mt-1"
                        >
                          <span className="max-w-[150px] truncate">{c.destinationUrl}</span>
                          <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="p-4 font-mono text-gray-300">{c.placementId}</td>
                      <td className="p-4">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                          {c.mediaType}
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">
                        <div>From: {new Date(c.startAt).toLocaleDateString("en-IN")}</div>
                        <div className="text-gray-500">To: {new Date(c.expiresAt).toLocaleDateString("en-IN")}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`uppercase text-[10px] font-black px-2.5 py-1 rounded-full border ${
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
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {(c.impressions || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">imp</span>
                        </div>
                        <div className="text-[11px] text-teal-400">
                          {(c.clicks || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">clicks</span>
                          <span className="ml-1 text-gray-400 font-mono">
                            ({c.impressions && c.impressions > 0 ? (((c.clicks || 0) / c.impressions) * 100).toFixed(1) : "0"}%)
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">₹{c.revenue?.amountInr?.toLocaleString() || 0}</div>
                        <span className="text-[10px] text-gray-400 capitalize">{c.revenue?.paymentStatus}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleCampaignStatus(c)}
                            title={c.status === "published" ? "Pause Ad" : "Activate Ad"}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                          >
                            {c.status === "published" ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            title="Edit Campaign"
                            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(c.id, c.title)}
                            title="Delete Campaign"
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Revenue & Payments ─────────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
              <span className="text-xs uppercase font-bold text-gray-400">Total Contracted Revenue</span>
              <div className="text-3xl font-black text-white mt-1">₹{stats?.revenue.totalInr?.toLocaleString() || 0}</div>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
              <span className="text-xs uppercase font-bold text-emerald-400">Collected Amount</span>
              <div className="text-3xl font-black text-emerald-300 mt-1">₹{stats?.revenue.receivedInr?.toLocaleString() || 0}</div>
            </div>
            <div className="p-5 rounded-2xl bg-rose-500/[0.05] border border-rose-500/20">
              <span className="text-xs uppercase font-bold text-rose-400">Pending / Outstanding</span>
              <div className="text-3xl font-black text-rose-300 mt-1">₹{stats?.revenue.outstandingInr?.toLocaleString() || 0}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Manual Payment Records</h3>
            <p className="text-xs text-gray-400">
              Advertising payments are arranged directly with brands via bank transfer or direct invoice. Record receipts manually here.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase font-black">
                  <tr>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Campaign</th>
                    <th className="p-3">Total (₹)</th>
                    <th className="p-3">Received (₹)</th>
                    <th className="p-3">Outstanding (₹)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-white">{c.brandName}</td>
                      <td className="p-3 text-gray-300">{c.title}</td>
                      <td className="p-3 font-semibold text-white">₹{c.revenue?.amountInr?.toLocaleString() || 0}</td>
                      <td className="p-3 text-emerald-400">₹{c.revenue?.amountReceivedInr?.toLocaleString() || 0}</td>
                      <td className="p-3 text-rose-400">₹{c.revenue?.outstandingInr?.toLocaleString() || 0}</td>
                      <td className="p-3">
                        <span className="uppercase text-[9px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                          {c.revenue?.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-[11px]">
                        {c.revenue?.paymentReference && <div>Ref: {c.revenue.paymentReference}</div>}
                        {c.revenue?.internalNotes && <div className="italic">{c.revenue.internalNotes}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Cloudflare R2 Setup Guide ───────────────────────────────────────── */}
      {activeTab === "r2setup" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cloudflare R2 Account & Bucket Setup Instructions</h2>
              <p className="text-xs text-gray-400">
                Follow these exact steps to activate zero-egress media storage for image & video advertisements.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="font-bold text-white text-sm block">Step 1: Create Cloudflare R2 Bucket</span>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Log in to your Cloudflare Dashboard (<a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">dash.cloudflare.com</a>).</li>
                <li>In the sidebar, navigate to <strong>R2 Object Storage</strong>.</li>
                <li>Click <strong>Create Bucket</strong>. Name your bucket (e.g., <code className="text-purple-300">paperino-ads</code>).</li>
                <li>Leave default region as <strong>Automatic</strong> and click <strong>Create Bucket</strong>.</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="font-bold text-white text-sm block">Step 2: Generate API Tokens (Access Keys)</span>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>In the R2 overview page, click <strong>Manage R2 API Tokens</strong> on the right-hand panel.</li>
                <li>Click <strong>Create API Token</strong>.</li>
                <li>Permissions: Select <strong>Object Read & Write</strong>. Specify your bucket <code className="text-purple-300">paperino-ads</code>.</li>
                <li>Click <strong>Create API Token</strong>. Securely copy the <strong>Access Key ID</strong> and <strong>Secret Access Key</strong>.</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="font-bold text-white text-sm block">Step 3: Enable Public Media Delivery</span>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Inside your bucket settings, under <strong>Public Access</strong>, click <strong>Connect Domain</strong> (recommended: e.g., <code className="text-purple-300">cdn.paperino.site</code>) or enable <strong>R2.dev subdomain</strong>.</li>
                <li>Under <strong>CORS Policy</strong>, add:</li>
              </ol>
              <pre className="p-3 bg-black/80 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto">
{`[
  {
    "AllowedOrigins": ["https://www.paperino.site", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]`}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <span className="font-bold text-white text-sm block">Step 4: Add Environment Variables to .env.local</span>
              <p className="text-gray-400">Add the following keys to your server environment (Vercel & local <code className="text-purple-300">.env.local</code>):</p>
              <pre className="p-3 bg-black/80 rounded-lg text-[11px] font-mono text-purple-300 overflow-x-auto">
{`R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=paperino-ads
R2_PUBLIC_URL=https://cdn.paperino.site`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT CAMPAIGN MODAL DRAWER ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c0817] border border-white/10 rounded-3xl shadow-2xl overflow-y-auto p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <h2 className="text-xl font-black text-white">
                  {editingCampaign ? "Edit Advertisement Campaign" : "New Advertisement Campaign"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Configure creative assets, placement schedule, and payment details.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-6 text-xs">
              {/* Row 1: Brand & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={brandInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Brand / Company Name *
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
                    placeholder="e.g. Winter Internship Drive 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Row 1b: Sponsor Contact Info (Private/Internal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={emailInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Sponsor Contact Email (Internal)
                  </label>
                  <input
                    id={emailInputId}
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sponsor@brand.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor={phoneInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Sponsor Contact Phone (Internal)
                  </label>
                  <input
                    id={phoneInputId}
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Row 2: Placement & Media Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={placementSelectId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Placement Target *
                  </label>
                  <select
                    id={placementSelectId}
                    value={formPlacement}
                    onChange={(e) => setFormPlacement(e.target.value as AdPlacementId)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {Object.values(AD_PLACEMENTS).map((p) => (
                      <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                        {p.name} ({p.recommendedRatio})
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
                    <option value="video" className="bg-gray-900 text-white">Video (MP4 H.264 &lt;= 30s)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Direct Media Uploader & URLs */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <span className="font-bold text-white text-xs block">Creative Media Assets</span>

                {/* Desktop Upload */}
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Desktop Creative URL *</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="url"
                      value={formDesktopUrl}
                      onChange={(e) => setFormDesktopUrl(e.target.value)}
                      placeholder="https://cdn.paperino.site/ads/..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none font-mono text-[11px]"
                    />
                    <label className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Upload size={14} />
                      <span>{uploadingMedia ? "Uploading..." : "Upload File"}</span>
                      <input
                        type="file"
                        accept={formMediaType === "video" ? "video/mp4" : "image/webp,image/png,image/jpeg"}
                        className="hidden"
                        onChange={(e) => handleMediaUpload(e, "desktop")}
                        disabled={uploadingMedia}
                      />
                    </label>
                  </div>
                </div>

                {/* Optional Mobile Upload */}
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Optional Mobile Creative URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formMobileUrl}
                      onChange={(e) => setFormMobileUrl(e.target.value)}
                      placeholder="Optional mobile variant URL"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none font-mono text-[11px]"
                    />
                    <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
                      <Upload size={14} />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept={formMediaType === "video" ? "video/mp4" : "image/webp,image/png,image/jpeg"}
                        className="hidden"
                        onChange={(e) => handleMediaUpload(e, "mobile")}
                        disabled={uploadingMedia}
                      />
                    </label>
                  </div>
                </div>

                {/* Video Poster URL (Mandatory if video) */}
                {formMediaType === "video" && (
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Video Poster Image URL (Mandatory) *</label>
                    <div className="flex gap-2">
                      <input
                        required={formMediaType === "video"}
                        type="url"
                        value={formPosterUrl}
                        onChange={(e) => setFormPosterUrl(e.target.value)}
                        placeholder="https://cdn.paperino.site/ads/image/poster.webp"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none font-mono text-[11px]"
                      />
                      <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
                        <Upload size={14} />
                        <span>Upload Poster</span>
                        <input
                          type="file"
                          accept="image/webp,image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => handleMediaUpload(e, "poster")}
                          disabled={uploadingMedia}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {uploadFeedback && (
                  <p className="text-[11px] text-purple-300 bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
                    {uploadFeedback}
                  </p>
                )}
              </div>

              {/* Row 4: Destination URL & Accessibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor={destUrlInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Destination HTTPS URL *
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
                    Accessible Description (Alt Text)
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

              {/* Row 5: Schedule Dates, Priority & Targeting */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor={startAtInputId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Start Date & Time (UTC) *
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
                    Expiry Date & Time (UTC) *
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
                <div>
                  <label htmlFor={tierSelectId} className="block text-gray-400 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    Audience Tier
                  </label>
                  <select
                    id={tierSelectId}
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as AdUserTierTarget)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-gray-900 text-white">All Users</option>
                    <option value="free" className="bg-gray-900 text-white">Free Users Only</option>
                    <option value="premium" className="bg-gray-900 text-white">Premium Users Only</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Revenue & Status */}
              <div className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor={amountInputId} className="block text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Amount (₹)
                    </label>
                    <input
                      id={amountInputId}
                      type="number"
                      value={formAmountInr}
                      onChange={(e) => setFormAmountInr(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor={receivedInputId} className="block text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Received (₹)
                    </label>
                    <input
                      id={receivedInputId}
                      type="number"
                      value={formReceivedInr}
                      onChange={(e) => setFormReceivedInr(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor={paymentStatusSelectId} className="block text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Payment Status
                    </label>
                    <select
                      id={paymentStatusSelectId}
                      value={formPaymentStatus}
                      onChange={(e) => setFormPaymentStatus(e.target.value as AdPaymentStatus)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none cursor-pointer"
                    >
                      <option value="pending" className="bg-gray-900 text-white">Pending</option>
                      <option value="partially_paid" className="bg-gray-900 text-white">Partially Paid</option>
                      <option value="paid" className="bg-gray-900 text-white">Paid</option>
                      <option value="refunded" className="bg-gray-900 text-white">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={statusSelectId} className="block text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Campaign Status *
                    </label>
                    <select
                      id={statusSelectId}
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as AdCampaignStatus)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none cursor-pointer font-bold"
                    >
                      <option value="draft" className="bg-gray-900 text-white">Draft (Unpublished)</option>
                      <option value="published" className="bg-gray-900 text-emerald-400 font-bold">Published (Active)</option>
                      <option value="disabled" className="bg-gray-900 text-rose-400">Disabled (Paused)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div>
                    <label htmlFor={paymentRefInputId} className="block text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Payment Reference / UTR (Internal)
                    </label>
                    <input
                      id={paymentRefInputId}
                      type="text"
                      value={formPaymentRef}
                      onChange={(e) => setFormPaymentRef(e.target.value)}
                      placeholder="e.g. UTR / NEFT #9876543210"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor={notesTextareaId} className="block text-gray-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Internal Notes (Private)
                    </label>
                    <input
                      id={notesTextareaId}
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="e.g. Approved by Lead Admin, Invoice sent on 26 Nov"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
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
                  disabled={saving}
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
