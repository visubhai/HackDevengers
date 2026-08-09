"use client";

import { useEffect, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { Lock, ArrowRight, Eye, EyeOff, Mail, ShieldAlert, ArrowLeft, Truck } from "lucide-react";
import { LoadingSpinner } from "@/frontend/components/ui/LoadingSpinner";

type LoginStep = 'credentials' | 'otp';

export default function LoginPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState<LoginStep>('credentials');
    const [otp, setOtp] = useState("");
    const otpRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    useEffect(() => { setLoading(false); }, []);

    useEffect(() => {
        if (step === 'otp') setTimeout(() => otpRef.current?.focus(), 100);
    }, [step]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        if (!formData.username || !formData.password) {
            setError("Please fill in both fields");
            setSubmitting(false);
            return;
        }

        try {
            // Step 1: Check credentials and detect 2FA before creating session
            const checkRes = await fetch('/api/login-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: formData.username, password: formData.password }),
            });
            const checkData = await checkRes.json();

            if (checkRes.status === 403 && checkData.error === '2FA_REQUIRED') {
                setStep('otp');
                setSubmitting(false);
                return;
            }

            if (!checkRes.ok) {
                setError("Invalid username or password");
                setSubmitting(false);
                return;
            }

            // Credentials valid — create NextAuth session
            const res = await signIn("credentials", {
                redirect: false,
                email: formData.username,
                password: formData.password,
            });

            if (res?.error) {
                setError("Invalid username or password");
                setSubmitting(false);
            } else {
                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get("callbackUrl") || "/";
                window.location.href = callbackUrl;
            }
        } catch {
            setError("Connection error. Please try again.");
            setSubmitting(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email: formData.username,
                password: formData.password,
                otp,
            });

            if (res?.error) {
                setError("Invalid or expired code. Try again.");
                setSubmitting(false);
            } else {
                const params = new URLSearchParams(window.location.search);
                const callbackUrl = params.get("callbackUrl") || "/";
                window.location.href = callbackUrl;
            }
        } catch {
            setError("Connection error. Please try again.");
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center font-sans overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 bg-slate-950">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a2e1f]/60 via-slate-950 to-[#103a27]/60" />
                <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-green-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[10%] right-[15%] w-96 h-96 bg-lime-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

            <div className="relative z-10 w-full max-w-[440px] px-6 py-8">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[32px] p-8 lg:p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 border border-green-500/20 rounded-[32px] pointer-events-none group-hover:border-green-500/40 transition-colors duration-500" />

                    {step === 'credentials' ? (
                        <>
                            {/* Branding */}
                            <div className="text-center mb-10 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center shadow-xl shadow-green-500/20 border border-white/20 mb-4">
                                    <Truck className="w-10 h-10 text-slate-950 stroke-[2.5]" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Secure Logistics Portal</h2>
                                <p className="text-green-100/60 text-sm">Manage your shipments efficiently</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                                {error && (
                                    <div className="p-3 text-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
                                        {error}
                                    </div>
                                )}

                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-green-400 transition-colors">
                                        <Mail size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Username or Email"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none transition-all text-white placeholder-white/40 text-sm"
                                        required
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-green-400 transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none transition-all text-white placeholder-white/40 text-sm"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                <div className="flex justify-end text-xs px-1">
                                    <a href="#" className="text-green-400 hover:text-green-300 transition-colors font-medium">Forgot password?</a>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting || loading}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-lime-400 hover:from-green-400 hover:to-lime-300 text-[#05110c] font-bold rounded-2xl shadow-lg shadow-green-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base uppercase tracking-wider"
                                    >
                                        {submitting ? <><LoadingSpinner size={20} /> Verifying...</> : <>Login <ArrowRight className="w-5 h-5" /></>}
                                    </button>

                                    {/* Evaluator Quick Access */}
                                    <div className="mt-6 pt-6 border-t border-white/10">
                                        <div className="text-center mb-3">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full shadow-sm inline-flex items-center gap-1.5">
                                                ⚡ Evaluator Demo Credentials
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={() => {
                                                    setFormData({ username: 'logiopen', password: '95008' });
                                                }}
                                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-emerald-500/30 hover:border-emerald-400/80 hover:bg-emerald-500/10 text-white transition-all shadow-md group text-left"
                                            >
                                                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">👑 Super Admin</span>
                                                <span className="text-[11px] text-slate-300 font-mono mt-0.5">logiopen / 95008</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={submitting}
                                                onClick={() => {
                                                    setFormData({ username: 'mumbai-borivali', password: 'admin3456' });
                                                }}
                                                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-blue-500/30 hover:border-blue-400/80 hover:bg-blue-500/10 text-white transition-all shadow-md group text-left"
                                            >
                                                <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300">🏢 Branch Admin</span>
                                                <span className="text-[11px] text-slate-300 font-mono mt-0.5">mumbai-borivali / admin3456</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </>
                    ) : (
                        <>
                            {/* OTP Step */}
                            <div className="text-center mb-8 flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-4">
                                    <ShieldAlert className="w-8 h-8 text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Two-Factor Auth</h2>
                                <p className="text-green-100/60 text-sm">Enter the 6-digit code from your authenticator app</p>
                            </div>

                            <form onSubmit={handleOtpSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-3 text-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
                                        {error}
                                    </div>
                                )}

                                <input
                                    ref={otpRef}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full px-4 py-5 bg-white/5 border border-white/10 rounded-2xl focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none transition-all text-white placeholder-white/20 text-center text-3xl font-mono tracking-[0.6em]"
                                    required
                                />

                                <button
                                    type="submit"
                                    disabled={submitting || otp.length !== 6}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-lime-400 hover:from-green-400 hover:to-lime-300 text-[#05110c] font-bold rounded-2xl shadow-lg shadow-green-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base uppercase tracking-wider"
                                >
                                    {submitting ? <><LoadingSpinner size={20} /> Verifying...</> : <>Verify &amp; Login <ArrowRight className="w-5 h-5" /></>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors py-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to login
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-white/30 text-[10px] uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} LOGIOPEN LOGISTICS • ALL RIGHTS RESERVED
                    </p>
                </div>
            </div>
        </div>
    );
}
