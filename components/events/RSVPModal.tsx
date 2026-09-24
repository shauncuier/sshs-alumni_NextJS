"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Calendar, MapPin, CheckCircle2, Users, Plus, Minus, Sparkles } from "lucide-react";
import { EventItem } from "@/lib/data";

interface RSVPModalProps {
  event: EventItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPackage?: string;
}

export default function RSVPModal({ event, isOpen, onClose, onSuccess, initialPackage }: RSVPModalProps) {
  const { data: session } = useSession();

  const defaultPackage = initialPackage || event.packages?.[0]?.name || "General Alumnus Delegate";
  const [selectedPkg, setSelectedPkg] = useState(defaultPackage);
  const [extraAdults, setExtraAdults] = useState(0);
  const [childrenBelow12, setChildrenBelow12] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [trxId, setTrxId] = useState("");

  const [formData, setFormData] = useState({
    name: session?.user?.name || "Md. Jashedul Islam",
    batch: session?.user?.batchYear?.toString() || "2008",
    phone: "+880 1819-987654",
    tshirtSize: "L",
    dietary: "Standard",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || prev.name,
        batch: session.user.batchYear?.toString() || prev.batch,
      }));
    }
  }, [session]);

  useEffect(() => {
    if (initialPackage) {
      setSelectedPkg(initialPackage);
      if (initialPackage.includes("Spouse") || initialPackage.includes("Extra")) {
        setExtraAdults(1);
        setChildrenBelow12(0);
      } else if (initialPackage.includes("Family")) {
        setExtraAdults(1);
        setChildrenBelow12(1);
      } else if (initialPackage.includes("General")) {
        setExtraAdults(0);
        setChildrenBelow12(0);
      }
    }
  }, [initialPackage]);

  if (!isOpen) return null;

  // Calculate dynamic total
  const isMega = event.isMegaEvent || event.id === "evt-golden-jubilee-50";
  const isPatron = selectedPkg.includes("Patron") || selectedPkg.includes("Sponsor");
  
  const basePrice = isPatron ? 5000 : 1000;
  const extraAdultsCost = isPatron ? 0 : extraAdults * 500;
  const childrenCost = isPatron ? 0 : childrenBelow12 * 300;
  const totalAmount = isMega ? basePrice + extraAdultsCost + childrenCost : 0;

  const handleSelectPackage = (pkgName: string) => {
    setSelectedPkg(pkgName);
    if (pkgName.includes("Spouse") || pkgName.includes("Extra")) {
      setExtraAdults(1);
      setChildrenBelow12(0);
    } else if (pkgName.includes("Family")) {
      setExtraAdults(1);
      setChildrenBelow12(1);
    } else if (pkgName.includes("General")) {
      setExtraAdults(0);
      setChildrenBelow12(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onSuccess();
      }, 2800);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider mb-1.5">
              {event.isMegaEvent ? "50th Anniversary Golden Jubilee" : "Official Event Registration"}
            </div>
            <h3 className="text-base sm:text-lg font-bold leading-tight">
              {event.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-emerald-200 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Approx. Dec 30, 2026
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {event.locationCity}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full inline-block">
                Ticket &amp; Souvenir Voucher Reserved
              </span>
              <h4 className="text-xl font-extrabold text-slate-900">
                Registration Confirmed!
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Welcome to the landmark celebration, <strong>{formData.name}</strong>! Your registration pass for SSC Batch {formData.batch} is secured.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left text-xs space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Selected Tier:</span>
                <span className="font-bold text-slate-900">{selectedPkg}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Attendance:</span>
                <span className="font-bold text-slate-900">
                  1 Alumnus
                  {extraAdults > 0 && ` + ${extraAdults} Adult Guest(s)`}
                  {childrenBelow12 > 0 && ` + ${childrenBelow12} Child (<12yr)`}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Total Fee:</span>
                <span className="font-extrabold text-emerald-800 text-sm">
                  ৳{totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">T-Shirt Souvenir:</span>
                <span className="font-bold text-slate-900">Size {formData.tshirtSize} (Included)</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Approx Event Date:</span>
                <span className="font-bold text-slate-900">December 30, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registration ID:</span>
                <span className="font-mono font-bold text-emerald-800">SSGHS-50Y-{Date.now().toString().slice(-6)}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Packages Selector */}
            {event.packages && event.packages.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Select Delegate Tier / Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {event.packages.map((pkg) => {
                    const isSelected = selectedPkg === pkg.name;
                    return (
                      <div
                        key={pkg.name}
                        onClick={() => handleSelectPackage(pkg.name)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 line-clamp-1">{pkg.name}</span>
                          <span className="text-emerald-800">{pkg.price}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {pkg.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Guests & Children Calculator (For 50-Year Mega Event) */}
            {isMega && !isPatron && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Family &amp; Guest Attendees Calculator</span>
                  </span>
                  <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    ৳1,000 Base Included
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Extra Adult Guest */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Extra Adult Guest</span>
                      <span className="text-[11px] text-amber-700 font-medium">+৳500 each extra</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setExtraAdults(Math.max(0, extraAdults - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-extrabold text-sm text-slate-900">{extraAdults}</span>
                      <button
                        type="button"
                        onClick={() => setExtraAdults(extraAdults + 1)}
                        className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center font-bold text-emerald-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Child Below 12yr */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Child (Below 12yr)</span>
                      <span className="text-[11px] text-emerald-700 font-medium">+৳300 each</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setChildrenBelow12(Math.max(0, childrenBelow12 - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-extrabold text-sm text-slate-900">{childrenBelow12}</span>
                      <button
                        type="button"
                        onClick={() => setChildrenBelow12(childrenBelow12 + 1)}
                        className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center font-bold text-emerald-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Cost Breakdown Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600 block text-[11px]">Calculated Registration Total:</span>
                    <span className="text-[10px] text-slate-500">
                      Alumnus (৳1,000)
                      {extraAdults > 0 && ` + ${extraAdults} Extra (৳${extraAdults * 500})`}
                      {childrenBelow12 > 0 && ` + ${childrenBelow12} Child (৳${childrenBelow12 * 300})`}
                    </span>
                  </div>
                  <span className="text-base font-black text-emerald-900">
                    ৳{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SSC Batch Year
                </label>
                <input
                  type="text"
                  required
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  T-Shirt Size (Souvenir Kit)
                </label>
                <select
                  value={formData.tshirtSize}
                  onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                  <option value="XXL">Double XL (XXL)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grand Feast Meal Choice
                </label>
                <select
                  value={formData.dietary}
                  onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="Standard">Traditional Mezban Beef</option>
                  <option value="Chicken">Special Chicken Roast</option>
                  <option value="Vegetarian">Vegetarian Delight</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="bKash">bKash (Merchant: 01819-SSGHS1)</option>
                  <option value="Nagad">Nagad (Merchant: 01819-SSGHS2)</option>
                  <option value="Bank">Bank Deposit / Card</option>
                  <option value="Office">Pay at School Alumni Secretariat</option>
                </select>
              </div>
            </div>

            {paymentMethod !== "Office" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction ID / Reference (Optional for pre-booking)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9B8C7D6E5F"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase"
                />
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? "Processing..." : `Register Now (${isMega ? `৳${totalAmount.toLocaleString()}` : "Free"})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
