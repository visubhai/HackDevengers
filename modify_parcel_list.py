import re

with open("frontend/src/frontend/components/booking/ParcelList.tsx", "r") as f:
    code = f.read()

# 1. Update handleKeyDown
old_handle_keydown = """    const handleKeyDown = (e: React.KeyboardEvent, field: string, index: number = 0) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (field === "quantity") {
                document.getElementById(`parcel-rate-0`)?.focus();
            } else if (field === "rate") {
                document.getElementById(`remarks-input`)?.focus();
            } else if (field === "remarks") {
                onNext?.();
            }
        }
    };"""

new_handle_keydown = """    const handleKeyDown = (e: React.KeyboardEvent, field: string, index: number = 0) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (field === "quantity") {
                document.getElementById(`parcel-rate-${index}`)?.focus();
            } else if (field === "rate") {
                document.getElementById(`parcel-remarks-${index}`)?.focus();
            } else if (field === "remarks") {
                if (index < parcels.length - 1) {
                    document.getElementById(`parcel-type-${index + 1}`)?.focus();
                } else {
                    onNext?.();
                }
            }
        }
    };"""

code = code.replace(old_handle_keydown, new_handle_keydown)

# 2. Update Enterprise Variant
code = code.replace(
    """<div className="w-[15%] text-center border-r border-slate-300 h-full flex items-center justify-center">Qty</div>
                        <div className="w-[60%] px-3 border-r border-slate-300 h-full flex items-center">Item Description</div>
                        <div className="w-[25%] px-3 text-right h-full flex items-center justify-end">Rate (₹)</div>""",
    """<div className="w-[15%] text-center border-r border-slate-300 h-full flex items-center justify-center">Qty</div>
                        <div className="w-[45%] px-3 border-r border-slate-300 h-full flex items-center">Item Description</div>
                        <div className="w-[20%] px-3 border-r border-slate-300 text-right h-full flex items-center justify-end">Rate (₹)</div>
                        <div className="w-[20%] px-3 text-left h-full flex items-center">Remarks</div>"""
)

code = code.replace(
    """<div className="w-[60%] border-r border-slate-300 h-full p-0 relative">""",
    """<div className="w-[45%] border-r border-slate-300 h-full p-0 relative">"""
)

old_rate_enterprise = """                                <div className="w-[25%] h-full p-0 relative">
                                    <div className="relative h-full">
                                        <input
                                            type="number"
                                            min="0"
                                            id={`parcel-rate-${index}`}
                                            value={parcel.rate}
                                            disabled={disabled}
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                            onChange={(e) => onChange(parcel.id, "rate", parseFloat(e.target.value) || 0)}
                                            className="w-full h-full text-right pr-3 font-mono font-bold text-slate-900 bg-transparent focus:bg-sky-100 outline-none text-sm p-0 m-0 border-none focus:ring-inset focus:ring-2 focus:ring-blue-500 rounded-none transition-all"
                                            autoComplete="off"
                                        />
                                    </div>

                                    {parcels.length > 1 && (
                                        <button
                                            onClick={() => onRemove(parcel.id)}
                                            disabled={disabled}
                                            className="absolute right-0 top-0 bottom-0 text-slate-300 hover:text-red-600 hover:bg-red-50 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                                            tabIndex={-1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>"""

new_rate_enterprise = """                                <div className="w-[20%] border-r border-slate-300 h-full p-0 relative">
                                    <input
                                        type="number"
                                        min="0"
                                        id={`parcel-rate-${index}`}
                                        value={parcel.rate}
                                        disabled={disabled}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                        onChange={(e) => onChange(parcel.id, "rate", parseFloat(e.target.value) || 0)}
                                        className="w-full h-full text-right pr-3 font-mono font-bold text-slate-900 bg-transparent focus:bg-sky-100 outline-none text-sm p-0 m-0 border-none focus:ring-inset focus:ring-2 focus:ring-blue-500 rounded-none transition-all"
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="w-[20%] h-full p-0 relative">
                                    <input
                                        type="text"
                                        id={`parcel-remarks-${index}`}
                                        value={parcel.remarks || ''}
                                        disabled={disabled}
                                        onKeyDown={(e) => handleKeyDown(e, "remarks", index)}
                                        onChange={(e) => onChange(parcel.id, "remarks", e.target.value)}
                                        className="w-full h-full text-left pl-3 font-medium text-slate-900 bg-transparent focus:bg-sky-100 outline-none text-sm p-0 m-0 border-none focus:ring-inset focus:ring-2 focus:ring-blue-500 rounded-none transition-all"
                                        autoComplete="off"
                                        placeholder="Optional"
                                    />
                                    {parcels.length > 1 && (
                                        <button
                                            onClick={() => onRemove(parcel.id)}
                                            disabled={disabled}
                                            className="absolute right-0 top-0 bottom-0 text-slate-300 hover:text-red-600 hover:bg-red-50 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                                            tabIndex={-1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>"""

code = code.replace(old_rate_enterprise, new_rate_enterprise)

# 3. Update Fintech Variant
code = code.replace(
    """<div className="col-span-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty</div>
                    <div className="col-span-7 pl-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</div>
                    <div className="col-span-3 text-right pr-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rate</div>""",
    """<div className="col-span-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty</div>
                    <div className="col-span-5 pl-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</div>
                    <div className="col-span-2 text-right pr-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rate</div>
                    <div className="col-span-3 text-left pl-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remarks</div>"""
)

code = code.replace(
    """                            {/* Item */}
                            <div className="col-span-7">""",
    """                            {/* Item */}
                            <div className="col-span-5">"""
)

old_rate_fintech = """                            {/* Rate */}
                            <div className="col-span-3 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    id={`parcel-rate-${index}`}
                                    value={parcel.rate}
                                    disabled={disabled}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                    onChange={(e) => onChange(parcel.id, "rate", parseFloat(e.target.value) || 0)}
                                    className="w-full h-10 text-right pr-4 pl-6 font-bold text-slate-900 bg-slate-50 focus:bg-white border focus:border-blue-500 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-lg font-mono"
                                    autoComplete="off"
                                />
                            </div>

                            {/* Floating Delete - visible on hover */}
                            {parcels.length > 1 && (
                                <button
                                    onClick={() => onRemove(parcel.id)}
                                    disabled={disabled}
                                    className="absolute -right-3 -top-2 bg-white rounded-full p-1 shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10"
                                    tabIndex={-1}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}"""

new_rate_fintech = """                            {/* Rate */}
                            <div className="col-span-2 relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    id={`parcel-rate-${index}`}
                                    value={parcel.rate}
                                    disabled={disabled}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                    onChange={(e) => onChange(parcel.id, "rate", parseFloat(e.target.value) || 0)}
                                    className="w-full h-10 text-right pr-2 pl-5 font-bold text-slate-900 bg-slate-50 focus:bg-white border focus:border-blue-500 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-md font-mono"
                                    autoComplete="off"
                                />
                            </div>

                            {/* Remarks */}
                            <div className="col-span-3 relative">
                                <input
                                    type="text"
                                    id={`parcel-remarks-${index}`}
                                    value={parcel.remarks || ''}
                                    disabled={disabled}
                                    onKeyDown={(e) => handleKeyDown(e, "remarks", index)}
                                    onChange={(e) => onChange(parcel.id, "remarks", e.target.value)}
                                    className="w-full h-10 text-left px-3 font-medium text-slate-900 bg-slate-50 focus:bg-white border focus:border-blue-500 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    autoComplete="off"
                                    placeholder="Remarks"
                                />

                                {/* Floating Delete - visible on hover */}
                                {parcels.length > 1 && (
                                    <button
                                        onClick={() => onRemove(parcel.id)}
                                        disabled={disabled}
                                        className="absolute -right-3 -top-2 bg-white rounded-full p-1 shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-10"
                                        tabIndex={-1}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>"""

code = code.replace(old_rate_fintech, new_rate_fintech)

# 4. Update Modern Variant
code = code.replace(
    """<div className="col-span-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1"><Layers size={10} /> Qty</div>
                    <div className="col-span-7 pl-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><ShoppingBag size={10} /> Item Description</div>
                    <div className="col-span-3 text-right pr-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate (₹)</div>""",
    """<div className="col-span-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1"><Layers size={10} /> Qty</div>
                    <div className="col-span-5 pl-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><ShoppingBag size={10} /> Item Description</div>
                    <div className="col-span-2 text-right pr-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</div>
                    <div className="col-span-3 text-left pl-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remarks</div>"""
)

code = code.replace(
    """                            {/* Item */}
                            <div className="col-span-7">""",
    """                            {/* Item */}
                            <div className="col-span-5">"""
)

old_rate_modern = """                            {/* Rate */}
                            <div className="col-span-3 relative">
                                <input
                                    type="number"
                                    min="0"
                                    id={`parcel-rate-${index}`}
                                    value={parcel.rate}
                                    disabled={disabled}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                    onChange={(e) => onChange(parcel.id, "rate", parseFloat(e.target.value) || 0)}
                                    className="w-full h-10 text-right pr-4 font-bold text-slate-700 bg-slate-50 focus:bg-white border-0 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    autoComplete="off"
                                />
                            </div>

                            {/* Floating Delete */}
                            {parcels.length > 1 && (
                                <button
                                    onClick={() => onRemove(parcel.id)}
                                    disabled={disabled}
                                    className="absolute -right-2 -top-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-100 text-slate-300 hover:text-red-500 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 z-10"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}"""

new_rate_modern = """                            {/* Rate */}
                            <div className="col-span-2 relative">
                                <input
                                    type="number"
                                    min="0"
                                    id={`parcel-rate-${index}`}
                                    value={parcel.rate}
                                    disabled={disabled}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                    onChange={(e) => onChange(parcel.id, "rate", parseFloat(e.target.value) || 0)}
                                    className="w-full h-10 text-right pr-2 font-bold text-slate-700 bg-slate-50 focus:bg-white border-0 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    autoComplete="off"
                                />
                            </div>

                            {/* Remarks */}
                            <div className="col-span-3 relative">
                                <input
                                    type="text"
                                    id={`parcel-remarks-${index}`}
                                    value={parcel.remarks || ''}
                                    disabled={disabled}
                                    onKeyDown={(e) => handleKeyDown(e, "remarks", index)}
                                    onChange={(e) => onChange(parcel.id, "remarks", e.target.value)}
                                    className="w-full h-10 text-left px-3 font-medium text-slate-700 bg-slate-50 focus:bg-white border-0 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    autoComplete="off"
                                    placeholder="Remarks"
                                />

                                {/* Floating Delete */}
                                {parcels.length > 1 && (
                                    <button
                                        onClick={() => onRemove(parcel.id)}
                                        disabled={disabled}
                                        className="absolute -right-2 -top-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-100 text-slate-300 hover:text-red-500 hover:border-red-100 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 z-10"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>"""

code = code.replace(old_rate_modern, new_rate_modern)

# 5. Update Default Variant
old_default = """                            <div className="grid grid-cols-2 gap-4">
                                {/* Quantity */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">QUANTITY</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        id={`parcel-qty-${index}`}
                                        value={parcel.quantity}
                                        disabled={disabled}
                                        onChange={(e) => onChange(parcelId, "quantity", parseInt(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, "quantity", index)}
                                        className="h-9 text-sm font-medium border-gray-200 focus:border-blue-500 rounded-md shadow-none px-3"
                                        placeholder="Qty"
                                    />
                                </div>

                                {/* Rate */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RATE (₹)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        id={`parcel-rate-${index}`}
                                        value={parcel.rate}
                                        disabled={disabled}
                                        onChange={(e) => onChange(parcelId, "rate", parseFloat(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                        className="h-9 text-sm font-medium border-gray-200 focus:border-blue-500 rounded-md shadow-none px-3"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>"""

new_default = """                            <div className="grid grid-cols-3 gap-4">
                                {/* Quantity */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">QUANTITY</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        id={`parcel-qty-${index}`}
                                        value={parcel.quantity}
                                        disabled={disabled}
                                        onChange={(e) => onChange(parcelId, "quantity", parseInt(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, "quantity", index)}
                                        className="h-9 text-sm font-medium border-gray-200 focus:border-blue-500 rounded-md shadow-none px-3"
                                        placeholder="Qty"
                                    />
                                </div>

                                {/* Rate */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RATE (₹)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        id={`parcel-rate-${index}`}
                                        value={parcel.rate}
                                        disabled={disabled}
                                        onChange={(e) => onChange(parcelId, "rate", parseFloat(e.target.value) || 0)}
                                        onKeyDown={(e) => handleKeyDown(e, "rate", index)}
                                        className="h-9 text-sm font-medium border-gray-200 focus:border-blue-500 rounded-md shadow-none px-3"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Remarks */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">REMARKS</Label>
                                    <Input
                                        type="text"
                                        id={`parcel-remarks-${index}`}
                                        value={parcel.remarks || ''}
                                        disabled={disabled}
                                        onChange={(e) => onChange(parcelId, "remarks", e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, "remarks", index)}
                                        className="h-9 text-sm font-medium border-gray-200 focus:border-blue-500 rounded-md shadow-none px-3"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>"""

code = code.replace(old_default, new_default)

with open("frontend/src/frontend/components/booking/ParcelList.tsx", "w") as f:
    f.write(code)

