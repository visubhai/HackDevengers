"use client";

import { useState, useEffect, useRef } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { authService } from "@/frontend/services/authService";
import { LoadingSpinner } from "@/frontend/components/ui/LoadingSpinner";
import { ArrowRight, Package, Truck, ShieldCheck, Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowLeft } from "lucide-react";

type LoginStep = 'credentials' | 'otp';

export function LoginPage() {
    const { setCurrentUser } = useBranchStore();
    const [step, setStep] = useState<LoginStep>('credentials');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [animate, setAnimate] = useState(false);
    const otpRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setAnimate(true);
    }, []);

    useEffect(() => {
        if (step === 'otp') {
            setTimeout(() => otpRef.current?.focus(), 100);
        }
    }, [step]);

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        // Check credentials and detect 2FA requirement before creating NextAuth session
        try {
            const checkRes = await fetch('/api/login-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password }),
            });
            const checkData = await checkRes.json();

            if (checkRes.status === 403 && checkData.error === '2FA_REQUIRED') {
                setStep('otp');
                setIsLoading(false);
                return;
            }

            if (!checkRes.ok) {
                setError("Invalid credentials. Please check your details.");
                setIsLoading(false);
                return;
            }
        } catch {
            setError("Network error. Please try again.");
            setIsLoading(false);
            return;
        }

        // Credentials valid — create NextAuth session
        const { error } = await authService.login(email, password);
        if (error) {
            setError("Sign in failed. Please try again.");
            setIsLoading(false);
            return;
        }

        const user = await authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        } else {
            setError("User profile not found.");
        }
        setIsLoading(false);
    };

    const handleOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const { error } = await authService.login(email, password, otp);

        if (error) {
            setError("Invalid or expired code. Try again.");
            setIsLoading(false);
            return;
        }

        const user = await authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        } else {
            setError("User profile not found.");
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex overflow-hidden font-sans text-foreground">
            {/* Left Side: Brand & Visuals */}
            <div className={`
                hidden lg:flex w-1/2 bg-premium-sidebar text-white relative flex-col justify-between p-16
                transition-transform duration-1000 ease-out
                ${animate ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}
            `}>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
                    <div className="absolute top-1/2 left-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05)_0%,_transparent_70%)] -translate-x-1/2 -translate-y-1/2" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Truck className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">ABCD Logistics</span>
                    </div>

                    <h1 className="text-5xl font-bold leading-tight mb-6 text-white">
                        Seamless delivery <br />
                        <span className="text-blue-500">solutions</span> for your <br />
                        business.
                    </h1>

                    <p className="text-slate-300 text-lg max-w-md leading-relaxed">
                        Manage parcels, track shipments, and optimize your supply chain with our next-generation logistics platform.
                    </p>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-8 mt-12">
                    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                        <Package className="w-8 h-8 text-blue-400 mb-3" />
                        <h3 className="font-semibold text-lg mb-1 text-white">Real-time Tracking</h3>
                        <p className="text-sm text-slate-300">Monitor every step of the journey.</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                        <ShieldCheck className="w-8 h-8 text-blue-400 mb-3" />
                        <h3 className="font-semibold text-lg mb-1 text-white">Secure Delivery</h3>
                        <p className="text-sm text-slate-300">Trusted by thousands of businesses.</p>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-slate-400 mt-12">
                    © 2024 ABCD Logistics System. All rights reserved.
                </div>
            </div>

            {/* Right Side */}
            <div className={`
                w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16
                transition-all duration-1000 delay-300 ease-out
                ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
            `}>
                <div className="w-full max-w-md space-y-8">

                    {step === 'credentials' ? (
                        <>
                            <div className="space-y-2 text-center lg:text-left">
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
                                <p className="text-muted-foreground">Please enter your details to sign in.</p>
                            </div>

                            <form onSubmit={handleCredentials} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground ml-1">Username</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="block w-full pl-11 pr-4 py-3.5 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:bg-background focus:border-primary focus:ring-4 focus:ring-ring/10 transition-all duration-200 outline-none font-medium"
                                                placeholder="Enter your email/username"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-sm font-semibold text-foreground">Password</label>
                                            <button type="button" className="text-sm font-medium text-primary hover:text-primary transition-colors">
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                            </div>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="block w-full pl-11 pr-12 py-3.5 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground focus:bg-background focus:border-primary focus:ring-4 focus:ring-ring/10 transition-all duration-200 outline-none font-medium"
                                                placeholder="Enter your password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-slate-900/20 shadow-xl shadow-slate-900/20 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <LoadingSpinner size={20} className="border-white/30 border-t-white" />
                                    ) : (
                                        <>Sign In <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </button>
                            </form>

                            <div className="pt-6 border-t border-premium-border">
                                <p className="text-center text-sm text-muted-foreground">
                                    Don't have an account?{" "}
                                    <span className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors">Contact Support</span>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* OTP Step */}
                            <div className="space-y-2 text-center lg:text-left">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                                        <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">Two-factor auth</h2>
                                <p className="text-muted-foreground">
                                    Open your authenticator app and enter the 6-digit code for this account.
                                </p>
                            </div>

                            <form onSubmit={handleOtp} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-foreground ml-1">Authenticator Code</label>
                                    <input
                                        ref={otpRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="block w-full px-4 py-4 bg-background border border-input rounded-xl text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/10 transition-all duration-200 outline-none"
                                        placeholder="000000"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || otp.length !== 6}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-slate-900/20 shadow-xl shadow-slate-900/20 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <LoadingSpinner size={20} className="border-white/30 border-t-white" />
                                    ) : (
                                        <>Verify &amp; Sign In <ArrowRight className="w-5 h-5" /></>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
