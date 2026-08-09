import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useBranchStore } from "@/frontend/lib/store";
import { useBranches } from "@/frontend/hooks/useBranches";
import { parcelService } from "@/frontend/services/parcelService";
import { useToast } from "@/frontend/components/ui/toast";
import { mutate } from "swr";
import { openWhatsApp } from "@/frontend/lib/whatsapp";
import { Booking, Parcel, PaymentStatus } from "@/shared/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useBookingSession() {
    const { currentUser, setBookingLrNumber } = useBranchStore();
    const [fromBranch, setFromBranch] = useState<string>("");

    // Fetch branch objects filtered by fromBranch if it's set
    const { branchObjects } = useBranches(undefined, fromBranch);
    // All branches (unfiltered) to look up the current branch's settings
    const { branchObjects: allBranchObjects } = useBranches("all");
    const { addToast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lrNumber, setLrNumber] = useState("Loading...");
    const [isLocked, setIsLocked] = useState(false);
    const [toBranch, setToBranch] = useState<string>("");
    const [sender, setSender] = useState({ name: "", mobile: "" });
    const [receiver, setReceiver] = useState({ name: "", mobile: "" });
    const [parcels, setParcels] = useState<Parcel[]>([
        { id: generateId(), quantity: '', itemType: "", rate: '' }
    ]);
    const [costs, setCosts] = useState({
        freight: 0,
        handling: 10,
        hamali: 0,
        total: 10
    });
    const [paymentType, setPaymentType] = useState<PaymentStatus>("To Pay");
    const [remarks, setRemarks] = useState("");
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [systemSettings, setSystemSettings] = useState<any[]>([]);

    // Sync Global LR
    useEffect(() => {
        setBookingLrNumber(lrNumber);
        return () => setBookingLrNumber("");
    }, [lrNumber, setBookingLrNumber]);


    // Guard against concurrent init calls across strict-mode double-invocations
    const initInFlight = useRef(false);

    // Initialize Dashboard Data - ONLY ON MOUNT or when user changes
    useEffect(() => {
        const initData = async () => {
            if (initInFlight.current) return;
            initInFlight.current = true;
            setIsInitializing(true);
            const { data, error } = await parcelService.initDashboard();
            if (!error && data) {
                setRecentBookings(data.recentBookings || []);
                setSystemSettings(data.settings || []);
                // Only set if not already loaded by the fast fetch
                setLrNumber(prev => prev === "Loading..." && data.nextLR ? data.nextLR : prev);
            }
            setIsInitializing(false);
            initInFlight.current = false;
        };
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.branchId]); // Remove isLocked dependency to avoid re-fetching after every save

    // Reliably set fromBranch from currentUser or fallback to first available
    useEffect(() => {
        if (!fromBranch) {
            if (currentUser?.branchId) {
                setFromBranch(currentUser.branchId);
            } else if (allBranchObjects?.length > 0) {
                setFromBranch(allBranchObjects[0]._id);
            }
        }
    }, [currentUser?.branchId, fromBranch, allBranchObjects]);

    // Fast independent fetch for LR number on page load and branch change
    useEffect(() => {
        if (fromBranch && !isLocked) {
            setLrNumber("Loading...");
            parcelService.getNextLR(fromBranch).then(res => {
                if (!res.error && res.data?.nextLR) {
                    setLrNumber(res.data.nextLR);
                } else {
                    setLrNumber("N/A");
                }
            });
        }
    }, [fromBranch]); // Purposefully not including isLocked so it doesn't re-run on save


    // Auto-calculate Freight & Total
    useEffect(() => {
        if (isLocked) return;
        const totalFreight = parcels.reduce((sum, p) => sum + (Number(p.quantity || 0) * Number(p.rate || 0)), 0);
        const newTotal = (totalFreight + costs.handling + costs.hamali);

        if (Math.abs(costs.freight - totalFreight) > 0.01 || Math.abs(costs.total - newTotal) > 0.01) {
            setCosts(prev => ({
                ...prev,
                freight: totalFreight,
                total: newTotal
            }));
        }
    }, [parcels, isLocked, costs.freight, costs.handling, costs.hamali]);

    const handleReset = useCallback(() => {
        setIsLocked(false);
        setShowSuccess(false);
        setToBranch("");
        setSender({ name: "", mobile: "" });
        setReceiver({ name: "", mobile: "" });
        setParcels([{ id: generateId(), quantity: '', itemType: "", rate: '' }]);
        setCosts({ freight: 0, handling: 10, hamali: 0, total: 10 });
        setPaymentType("To Pay");
        setLrNumber("Loading...");
        setRemarks("");
        
        if (fromBranch) {
            parcelService.getNextLR(fromBranch).then(res => {
                if (!res.error && res.data?.nextLR) {
                    setLrNumber(res.data.nextLR);
                } else {
                    setLrNumber("N/A");
                }
            });
        }
        
        setTimeout(() => document.getElementById('destination-select')?.focus(), 100);
    }, [fromBranch]);

    // When the source branch changes, enforce its allowed payment types
    useEffect(() => {
        if (!fromBranch || isLocked || !allBranchObjects.length) return;
        const branch = allBranchObjects.find(b => b._id === fromBranch);
        const allowed = branch?.allowedPaymentTypes;
        if (allowed && allowed.length > 0) {
            setPaymentType(prev => allowed.includes(prev) ? prev : (allowed[0] as any));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromBranch, allBranchObjects]);

    const handleSave = useCallback(async () => {
        // Recompute costs fresh from parcels here to avoid a React timing bug:
        // parcels state updates synchronously but costs is updated by a useEffect
        // that runs asynchronously after the render. If Save is clicked right after
        // the last digit is typed, costs.total may still hold the intermediate value
        // (e.g. 34 for rate="24") even though parcels already has rate=240.
        const totalFreight = parcels.reduce((sum, p) => sum + (Number(p.quantity || 0) * Number(p.rate || 0)), 0);
        const freshCosts = {
            freight: totalFreight,
            handling: costs.handling,
            hamali: costs.hamali,
            total: totalFreight + costs.handling + costs.hamali
        };

        if (!fromBranch) {
            addToast("Please select a Source Branch before saving.", "error");
            return;
        }

        if (!toBranch) {
            addToast("Please select a Destination Branch.", "error");
            return;
        }

        if (freshCosts.total <= 0 || !sender.name || !receiver.name) {
            addToast("Please fill in sender, receiver, and at least one item.", "error");
            return;
        }
        setIsSubmitting(true);
        const bookingData: Booking = {
            id: generateId(),
            lrNumber: "GENERATING...",
            fromBranch,
            toBranch,
            date: new Date().toISOString(),
            sender,
            receiver,
            parcels,
            costs: freshCosts,
            paymentType,
            remarks,
            status: "PENDING"
        };

        const { data: createdParcel, error } = await parcelService.createBooking(bookingData, currentUser?.id || '') as any;

        if (error) {
            setIsSubmitting(false);
            addToast("Booking Failed: " + error.message, "error");
            return;
        }

        if (createdParcel) {
            setLrNumber(createdParcel.lr_number);
            setIsLocked(true);
            setIsSubmitting(false);
            setShowSuccess(true);
            addToast("Booking Created Successfully!", "success");

            // Optimization: Defer the heavy mutate call so it doesn't block the UI/Print response
            setTimeout(() => {
                mutate(key => Array.isArray(key) && (key[0].includes('reports') || key[0].includes('ledger')));
            }, 3000); 
            setTimeout(() => {
                // 1. Check & Trigger WhatsApp if enabled
                const waSetting = systemSettings?.find((s: any) => s.key === 'WHATSAPP_NOTIFICATIONS');
                // Global Toggle
                const globalEnabled = waSetting ? waSetting.value === true : true;
                
                // Branch Toggle (Check current user's branch)
                const currentBranch = branchObjects.find((b: any) => b._id === fromBranch);
                const branchEnabled = currentBranch?.whatsappNotificationsEnabled !== false;
                
                const autoWhatsApp = globalEnabled && branchEnabled;
                
                if (autoWhatsApp) {
                    const fromBranchName = branchObjects.find((b: any) => b._id === fromBranch)?.name || "";
                    const toBranchName = branchObjects.find((b: any) => b._id === toBranch)?.name || "";
                    openWhatsApp({
                        mobile: sender.mobile,
                        lrNumber: createdParcel.lr_number,
                        status: "Booked & Outbound",
                        fromBranch: fromBranchName,
                        toBranch: toBranchName,
                        senderName: sender.name,
                        receiverName: receiver.name,
                        amount: freshCosts.total,
                        paymentStatus: paymentType
                    }, addToast);
                }

                // 2. Check & Trigger Auto-Print
                const autoPrint = systemSettings?.find((s: any) => s.key === 'AUTO_PRINT')?.value !== false;
                if (autoPrint) {
                    document.body.classList.add('print-builty-only');
                    window.print();
                    document.body.classList.remove('print-builty-only');
                }

                setTimeout(() => handleReset(), 1000);
            }, 50); // Fast transition
        }
    }, [costs.handling, costs.hamali, sender, receiver, fromBranch, toBranch, parcels, paymentType, remarks, currentUser?.id, addToast, systemSettings, branchObjects, handleReset]);

    // Stable callbacks: functional setState means no stale closure — safe to use [] deps
    const handleSenderChange = useCallback((field: string, val: any) => {
        setSender(prev => ({ ...prev, [field]: val }));
    }, []);

    const handleReceiverChange = useCallback((field: string, val: any) => {
        setReceiver(prev => ({ ...prev, [field]: val }));
    }, []);

    const memoizedActions = useMemo(() => ({
        setFromBranch: (val: string) => setFromBranch(val),
        setToBranch: (val: string) => setToBranch(val),
        setSender: (val: any) => setSender(val),
        setReceiver: (val: any) => setReceiver(val),
        handleSenderChange,
        handleReceiverChange,
        setParcels: (val: any) => setParcels(val),
        setCosts: (val: any) => setCosts(val),
        handleCostsChange: (field: string, val: any) => setCosts(prev => ({ ...prev, [field]: val })),
        setPaymentType: (val: any) => setPaymentType(val),
        setRemarks: (val: string) => setRemarks(val),
        handleReset,
        handleSave,
        handleAddParcel: () => setParcels(p => [...p, { id: generateId(), quantity: '', itemType: "", rate: '' }]),
        handleRemoveParcel: (id: string) => setParcels(p => p.filter(item => item.id !== id)),
        handleParcelChange: (id: string, field: keyof Parcel, value: any) =>
            setParcels(p => p.map(item => item.id === id ? { ...item, [field]: value } : item))
    }), [handleReset, handleSave, handleSenderChange, handleReceiverChange]);

    const currentBranchAllowedPaymentTypes = (() => {
        if (!fromBranch || !allBranchObjects.length) return ['Paid', 'To Pay'];
        const branch = allBranchObjects.find(b => b._id === fromBranch);
        return branch?.allowedPaymentTypes?.length ? branch.allowedPaymentTypes : ['Paid', 'To Pay'];
    })();

    return {
        state: {
            lrNumber, isLocked, isSubmitting, isInitializing, showSuccess, fromBranch, toBranch,
            sender, receiver, parcels, costs, paymentType, remarks, recentBookings,
            branchObjects, systemSettings,
            allowedPaymentTypes: currentBranchAllowedPaymentTypes
        },
        actions: memoizedActions
    };
}
