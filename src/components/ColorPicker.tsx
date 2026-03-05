import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Some preset beautiful colors
    const presets = [
        '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf',
        '#38bdf8', '#818cf8', '#a78bfa', '#e879f9', '#f472b6', '#fb7185',
        '#ffffff', '#f1f5f9', '#94a3b8', '#334155', '#0f172a', '#000000'
    ];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={popoverRef}>
            {label && <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>}

            <div
                className="flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-emerald-300 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div
                    className="w-10 h-10 rounded-lg shadow-inner border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: color }}
                />
                <div className="flex-1 font-mono text-sm text-slate-600 uppercase">
                    {color}
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 top-full mt-2 left-0 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 min-w-[240px] animate-in fade-in slide-in-from-top-2">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">تخصيص اللون</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full h-10 rounded-lg cursor-pointer bg-slate-50 border border-slate-200 p-1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-2 block">ألوان مقترحة</label>
                        <div className="grid grid-cols-6 gap-2">
                            {presets.map(preset => (
                                <button
                                    key={preset}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onChange(preset);
                                        setIsOpen(false);
                                    }}
                                    className="w-8 h-8 rounded-full border border-black/10 shadow-sm hover:scale-110 transition-transform"
                                    style={{ backgroundColor: preset }}
                                    title={preset}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
