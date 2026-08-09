import { useState, useEffect } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { authService } from "@/frontend/services/authService";
import { User, Lock, Save, UserCircle, ShieldCheck, ShieldOff, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/frontend/lib/utils";

type TwoFASetupStep = 'idle' | 'loading' | 'qr' | 'verifying' | 'done';

export function ProfileSettings() {
    const { currentUser } = useBranchStore();
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // 2FA state
    const [twoFAEnabled, setTwoFAEnabled] = useState<boolean | null>(null);
    const [setupStep, setSetupStep] = useState<TwoFASetupStep>('idle');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [twoFAError, setTwoFAError] = useState('');

    useEffect(() => {
        if (currentUser?.role === 'SUPER_ADMIN') {
            authService.get2FAStatus().then(({ data }) => {
                if (data) setTwoFAEnabled(data.isTwoFactorEnabled);
            });
        }
    }, [currentUser?.role]);

    const handleSetup2FA = async () => {
        setSetupStep('loading');
        setTwoFAError('');
        const { data, error } = await authService.generate2FA();
        if (error || !data) {
            setTwoFAError(error?.message || 'Failed to start 2FA setup');
            setSetupStep('idle');
            return;
        }
        setQrCodeUrl(data.qrCodeUrl);
        setSecret(data.secret);
        setSetupStep('qr');
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setTwoFAError('');
        setSetupStep('verifying');
        const { error } = await authService.verify2FA(otpToken);
        if (error) {
            setTwoFAError(error.message);
            setSetupStep('qr');
            return;
        }
        setTwoFAEnabled(true);
        setSetupStep('done');
        setOtpToken('');
    };

    const handleDisable2FA = async () => {
        if (!confirm('Are you sure you want to disable 2FA? Your account will be less secure.')) return;
        const { error } = await authService.disable2FA();
        if (error) {
            setMessage({ type: 'error', text: error.message });
            return;
        }
        setTwoFAEnabled(false);
        setSetupStep('idle');
        setQrCodeUrl('');
        setSecret('');
        setMessage({ type: 'success', text: '2FA has been disabled.' });
    };

    if (!currentUser) return null;

    return (
        <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                    <UserCircle className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Profile</h2>
                    <p className="text-slate-500">Manage your personal details and security</p>
                </div>
            </div>

            {message && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center gap-3",
                    message.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Info */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        Personal Information
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Username (Read Only)</label>
                            <input
                                type="text"
                                value={currentUser.username}
                                disabled
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={currentUser.name || ''}
                                disabled
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                disabled
                                className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2FA Card - Super Admin Only */}
                {currentUser.role === 'SUPER_ADMIN' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-500" />
                            Two-Factor Authentication
                        </h3>

                        {/* Status badge */}
                        {twoFAEnabled !== null && setupStep !== 'done' && (
                            <div className={cn(
                                "flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg w-fit",
                                twoFAEnabled
                                    ? "bg-green-50 text-green-700"
                                    : "bg-amber-50 text-amber-700"
                            )}>
                                {twoFAEnabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                                {twoFAEnabled ? '2FA is enabled' : '2FA is not enabled'}
                            </div>
                        )}

                        {/* Idle: not enabled */}
                        {!twoFAEnabled && setupStep === 'idle' && (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    Protect your account with an authenticator app (Google Authenticator, Authy, etc.). Each login will require a 6-digit code.
                                </p>
                                <button
                                    onClick={handleSetup2FA}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Smartphone className="w-4 h-4" />
                                    Set Up 2FA
                                </button>
                            </div>
                        )}

                        {/* Loading */}
                        {setupStep === 'loading' && (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        )}

                        {/* QR Code step */}
                        {(setupStep === 'qr' || setupStep === 'verifying') && (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 font-medium">
                                    1. Scan this QR code with your authenticator app:
                                </p>
                                {qrCodeUrl && (
                                    <div className="flex justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44 rounded-xl border border-slate-200 p-2" />
                                    </div>
                                )}
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1 font-medium">Or enter this key manually:</p>
                                    <p className="text-xs font-mono text-slate-700 break-all select-all">{secret}</p>
                                </div>
                                <p className="text-sm text-slate-600 font-medium">
                                    2. Enter the 6-digit code shown in the app:
                                </p>
                                <form onSubmit={handleVerify2FA} className="space-y-3">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        value={otpToken}
                                        onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-xl font-mono tracking-[0.5em] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                        autoFocus
                                    />
                                    {twoFAError && (
                                        <p className="text-sm text-red-600 font-medium">{twoFAError}</p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={otpToken.length !== 6 || setupStep === 'verifying'}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {setupStep === 'verifying' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="w-4 h-4" />
                                        )}
                                        Verify &amp; Enable
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setSetupStep('idle'); setOtpToken(''); setTwoFAError(''); }}
                                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Success */}
                        {setupStep === 'done' && (
                            <div className="space-y-4">
                                <div className="flex flex-col items-center gap-3 py-4 text-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                                    <p className="font-bold text-slate-800">2FA is now active!</p>
                                    <p className="text-sm text-slate-500">You'll need your authenticator app code at every login.</p>
                                </div>
                            </div>
                        )}

                        {/* Enabled: show disable option */}
                        {twoFAEnabled && setupStep === 'idle' && (
                            <button
                                onClick={handleDisable2FA}
                                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                            >
                                <ShieldOff className="w-4 h-4" />
                                Disable 2FA
                            </button>
                        )}
                    </div>
                )}

                {/* Branch admin security note */}
                {currentUser.role !== 'SUPER_ADMIN' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-indigo-500" />
                            Security
                        </h3>
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                            Password changes are currently managed via Admin Dashboard.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
