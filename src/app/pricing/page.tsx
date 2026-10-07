"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  Check, 
  X, 
  Sparkles, 
  Heart, 
  ShieldCheck, 
  Crown, 
  Zap, 
  Gift, 
  ArrowRight,
  HelpCircle,
  Clock,
  Layers
} from "lucide-react";
import { PlanType } from "@/lib/subscription";

interface PlanItem {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  badge?: string;
  tagline: string;
  popular?: boolean;
  features: { name: string; enabled: boolean; highlight?: boolean }[];
  cta: string;
}

let razorpayPromise: Promise<boolean> | null = null;

export default function PricingPage() {
  const { user, plan, isContributorPlus, uploads } = useAuth();
  const [billingNotice, setBillingNotice] = useState<string | null>(null);

  const plans: PlanItem[] = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      period: "forever",
      tagline: "Essential study tools and unlimited material uploads for every student.",
      features: [
        { name: "Downloads: 5 per month", enabled: true },
        { name: "GPA Calculator", enabled: true },
        { name: "CGPA Calculator", enabled: true },
        { name: "Challenges & Weekly Leaderboards", enabled: true },
        { name: "Paperino Pulse", enabled: true },
        { name: "Attendance Shield (Paperino Labs)", enabled: true },
        { name: "Upload Materials: UNLIMITED", enabled: true },
        { name: "Free Class Finder", enabled: true },
        { name: "ATS Resume Checker: 2 uses/month", enabled: true },
        { name: "GitHub Intelligence: 2 uses/month", enabled: true },
        { name: "In-browser PDF Preview", enabled: false },
        { name: "PYQ Analyzer", enabled: false },
        { name: "Exam Emergency Mode", enabled: false },
        { name: "Senior Insights", enabled: false },
        { name: "Career DNA", enabled: false },
      ],
      cta: plan === "free" ? "Current Plan" : "Included",
    },
    {
      id: "plus",
      name: "Paperino Plus",
      price: "₹29",
      period: "per month",
      badge: isContributorPlus ? "FREE FOR YOU (10+ UPLOADS)" : undefined,
      tagline: "Expanded study capacity with PDF preview, Senior Insights, and Semester targets.",
      features: [
        { name: "Downloads: 10 per month", enabled: true, highlight: true },
        { name: "PDF Preview: ENABLED", enabled: true, highlight: true },
        { name: "Senior Insights: ENABLED", enabled: true, highlight: true },
        { name: "Semester Calculator: ENABLED", enabled: true, highlight: true },
        { name: "PYQ Analyzer: 4 uses/month", enabled: true, highlight: true },
        { name: "ATS Resume Checker: 4 uses/month", enabled: true },
        { name: "GitHub Intelligence: 4 uses/month", enabled: true },
        { name: "Custom Avatar Change: ENABLED", enabled: true },
        { name: "Plus Avatar Badge: ENABLED", enabled: true },
        { name: "GPA & CGPA Calculator", enabled: true },
        { name: "Weekly Challenges & Pulse", enabled: true },
        { name: "Attendance Shield & Free Class Finder", enabled: true },
        { name: "Upload Materials: UNLIMITED", enabled: true },
        { name: "Exam Emergency Mode", enabled: false },
        { name: "Career DNA", enabled: false },
      ],
      cta: isContributorPlus
        ? "Active via Contributor Benefit"
        : plan === "plus"
        ? "Current Plan"
        : "Choose Plus",
    },
    {
      id: "pro",
      name: "Paperino Pro",
      price: "₹59",
      period: "per month",
      badge: "MOST POPULAR",
      popular: true,
      tagline: "Unlimited downloads, Career DNA, Exam Emergency, and 11 monthly power uses.",
      features: [
        { name: "Downloads: UNLIMITED", enabled: true, highlight: true },
        { name: "Career DNA: ENABLED", enabled: true, highlight: true },
        { name: "Exam Emergency: 11 uses/month", enabled: true, highlight: true },
        { name: "PYQ Analyzer: 11 uses/month", enabled: true, highlight: true },
        { name: "ATS Resume Checker: 11 uses/month", enabled: true },
        { name: "GitHub Intelligence: 11 uses/month", enabled: true },
        { name: "Profile Frames: ENABLED", enabled: true },
        { name: "Changeable Color Theme: ENABLED", enabled: true },
        { name: "Pro Avatar Badge: ENABLED", enabled: true },
        { name: "Everything included in Paperino Plus", enabled: true, highlight: true },
        { name: "Profile Companions", enabled: false },
        { name: "Premium Avatar Badges", enabled: false },
      ],
      cta: plan === "pro" ? "Current Plan" : "Choose Pro",
    },
    {
      id: "premium",
      name: "Paperino Premium",
      price: "₹99",
      period: "per month",
      badge: "ALL UNLOCKED",
      tagline: "The complete Paperino experience with zero limits on all features.",
      features: [
        { name: "ALL Features UNLOCKED", enabled: true, highlight: true },
        { name: "ALL Usage Limits UNLIMITED", enabled: true, highlight: true },
        { name: "Downloads: UNLIMITED", enabled: true },
        { name: "PYQ Analyzer: UNLIMITED", enabled: true },
        { name: "ATS Resume Checker: UNLIMITED", enabled: true },
        { name: "Exam Emergency: UNLIMITED", enabled: true },
        { name: "GitHub Intelligence: UNLIMITED", enabled: true },
        { name: "Career DNA: UNLIMITED", enabled: true },
        { name: "Profile Companions: ENABLED", enabled: true, highlight: true },
        { name: "Premium Avatar Badges: ENABLED", enabled: true, highlight: true },
        { name: "Profile Frames & Themes: UNLOCKED", enabled: true },
        { name: "Priority Support & Early Access", enabled: true },
      ],
      cta: plan === "premium" ? "Current Plan" : "Choose Premium",
    },
  ];

  const [isLoadingPlan, setIsLoadingPlan] = useState<string | null>(null);
  const loadRazorpay = () => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      return Promise.resolve(true);
    }
    
    if (razorpayPromise) {
      return razorpayPromise;
    }

    razorpayPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayPromise = null; // allow retrying if it fails
        resolve(false);
      };
      document.body.appendChild(script);
    });

    return razorpayPromise;
  };

  const handlePlanClick = async (selectedPlan: PlanItem) => {
    if (isLoadingPlan !== null) {
      console.log("Already loading a plan");
      return;
    }
    if (selectedPlan.id === plan) {
      setBillingNotice("You are already on this plan!");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (selectedPlan.id === "plus" && isContributorPlus) {
      setBillingNotice("You already have Plus features for free as a Contributor!");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (selectedPlan.id === "free") return; // cannot subscribe to free

    if (!user) {
      setBillingNotice("Please login to subscribe to a plan.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsLoadingPlan(selectedPlan.id);
    setBillingNotice(null);

    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        setBillingNotice("Failed to load Razorpay SDK. Please check your connection.");
        setIsLoadingPlan(null);
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/razorpay/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ plan: selectedPlan.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Paperino",
        description: selectedPlan.name,
        image: "https://paperino-eta.vercel.app/logo-final.png",
        handler: async function (response: any) {
          setBillingNotice(`Payment successful! Activating your ${selectedPlan.name} plan... Please wait.`);
          try {
            const idToken = await user.getIdToken();
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id || data.subscriptionId,
                razorpay_signature: response.razorpay_signature,
                plan: selectedPlan.id
              })
            });
            // Force refresh token to get latest claims if Firestore failed
            await user.getIdToken(true);
            
            if (verifyRes.ok) {
              setBillingNotice(`Activation complete! Welcome to Paperino ${selectedPlan.name}.`);
            } else {
               setBillingNotice(`Activation verified. Reloading...`);
            }
          } catch(e) {
             console.error("Verification error", e);
          }
          setTimeout(() => window.location.reload(), 2000);
        },
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
          contact: user.phoneNumber || "",
        },
        theme: {
          color: "#8b5cf6"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setBillingNotice("Payment failed or was cancelled. Please try again.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      rzp.open();
    } catch (err: any) {
      console.error("Subscription Error:", err);
      const msg = err.message || "Something went wrong.";
      setBillingNotice(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#06030e] text-white pt-24 pb-20 px-4 sm:px-6 relative overflow-hidden selection:bg-purple-500/30">
      {/* Background Ambient Streaks */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[20%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[700px] h-[700px] bg-pink-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-16">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-bold shadow-md">
            <Sparkles size={14} className="text-purple-400" />
            <span>Transparent, Student-Friendly Plans</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-purple-300 tracking-tight">
            Supercharge Your Academic Journey
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Choose a plan that fits your semester. Free forever for essential tools, or upgrade for higher limits, career tools, and emergency exam assistance.
          </p>

          {user && (
            <div className="pt-2">
              <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full inline-flex items-center gap-2">
                <span>Signed in as <strong className="text-white">{user.email}</strong></span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="capitalize text-purple-300 font-bold">Current: {plan}</span>
                {isContributorPlus && (
                  <span className="text-emerald-400 font-semibold">(Free Plus Contributor)</span>
                )}
              </span>
            </div>
          )}
        </div>

        {billingNotice && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-sm text-center shadow-lg animate-in fade-in duration-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 mx-auto">
              <Clock size={16} className="text-purple-400 shrink-0" />
              <span>{billingNotice}</span>
            </div>
            <button
              onClick={() => setBillingNotice(null)}
              className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-white/5 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = plan === p.id && (!isContributorPlus || p.id === "plus");
            const isContribPlusCard = p.id === "plus" && isContributorPlus;

            return (
              <div
                key={p.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  p.popular
                    ? "bg-gradient-to-b from-[#180f2d] to-[#0c0817] border-2 border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.2)] lg:-translate-y-2"
                    : "bg-[#0c0817]/90 border border-white/10 hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                }`}
              >
                {/* Plan Badge */}
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md ${
                        isContribPlusCard
                          ? "bg-emerald-500 text-black font-bold"
                          : p.popular
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-white/10 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                    <p className="text-xs text-gray-400 min-h-[32px] leading-relaxed">{p.tagline}</p>
                  </div>

                  <div className="mb-6 flex items-baseline gap-1.5 pb-6 border-b border-white/10">
                    <span className="text-4xl font-black text-white tracking-tight">{p.price}</span>
                    <span className="text-xs text-gray-400 font-medium">/{p.period}</span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 mb-8 text-xs">
                    {p.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-2.5 ${
                          feat.enabled
                            ? feat.highlight
                              ? "text-purple-200 font-semibold"
                              : "text-gray-300"
                            : "text-gray-600 line-through"
                        }`}
                      >
                        {feat.enabled ? (
                          <div className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/5 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                            <X size={11} />
                          </div>
                        )}
                        <span>{feat.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <button
                    onClick={() => handlePlanClick(p)}
                    disabled={isCurrent || isContribPlusCard || isLoadingPlan !== null}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isCurrent || isContribPlusCard || isLoadingPlan !== null
                        ? "bg-white/10 text-gray-400 cursor-default border border-white/10"
                        : p.popular
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.35)] hover:scale-[1.02]"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {isLoadingPlan === p.id ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Processing...</span>
                      </>
                    ) : isCurrent ? (
                      <>
                        <ShieldCheck size={14} className="text-purple-400" />
                        <span>Current Plan</span>
                      </>
                    ) : isContribPlusCard ? (
                      <>
                        <Gift size={14} className="text-emerald-400" />
                        <span>Active (Contributor)</span>
                      </>
                    ) : (
                      <>
                        <span>{p.cta}</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CONTRIBUTOR BENEFIT & HEARTFELT MESSAGE CARD ── */}
        <div className="relative rounded-[2.5rem] p-8 sm:p-12 overflow-hidden border border-purple-500/25 bg-gradient-to-br from-[#120a22]/90 via-[#0d0718]/90 to-[#07040d]/90 shadow-[0_0_60px_rgba(168,85,247,0.12)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto text-pink-400 shadow-md">
              <Heart size={26} className="fill-pink-500/30" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              A Personal Note from the Paperino Team ❤️
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed font-normal text-left sm:text-center">
              <p>
                “Please don’t think of Paperino as just another paid platform ❤️
              </p>
              <p>
                We work day and night to build and maintain Paperino for you. We constantly search for useful study materials, collect them, verify them, and organize them so that you can access the resources you need every day.
              </p>
              <p>
                Plus at just ₹29, Pro at ₹59, and Premium at ₹99 — we’ve kept our plans student-friendly so that you can unlock more powerful features without spending too much.
              </p>
              <p className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-200 font-semibold">
                And for our contributors: Share 10+ genuine and approved materials with the Paperino community and get the Plus plan FREE 🎁
              </p>
              <p className="text-xs text-gray-400">
                Fake or low-quality materials won’t count — only genuine, useful contributions will qualify.
              </p>
              <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-base sm:text-lg pt-2">
                Study. Share. Grow. — Paperino ❤️”
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contributor/upload"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <Gift size={15} /> Upload Materials & Earn Free Plus
              </Link>
              <Link
                href="/contributor"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-medium text-xs transition-all text-center"
              >
                View My Contributions ({uploads} Approved)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
