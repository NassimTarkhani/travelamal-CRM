import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    label: string;
    files: File[];
    onChange: (files: File[]) => void;
    multiple?: boolean;
    maxFiles?: number;
    hint?: string;
    accept?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    label,
    files,
    onChange,
    multiple = false,
    maxFiles = 10,
    hint,
    accept = 'image/*',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Generate object URLs for image previews
    const previews = useMemo(
        () => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)),
        [files]
    );

    useEffect(() => {
        return () => {
            previews.forEach((url) => { if (url) URL.revokeObjectURL(url); });
        };
    }, [previews]);

    const addFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;
        const arr = Array.from(newFiles);
        const combined = multiple
            ? [...files, ...arr].slice(0, maxFiles)
            : arr.slice(0, 1);
        onChange(combined);
        // Reset input so same file can be re-selected after removal
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        onChange(files.filter((_, i) => i !== index));
    };

    const canAdd = files.length < maxFiles;

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {hint && <p className="text-[11px] text-gray-400">{hint}</p>}

            {canAdd && (
                <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors select-none',
                        dragOver
                            ? 'border-blue bg-blue/5'
                            : 'border-gray-200 hover:border-blue/50 hover:bg-gray-50'
                    )}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        addFiles(e.dataTransfer.files);
                    }}
                >
                    <Upload className="h-5 w-5 text-gray-400" />
                    <p className="text-xs text-gray-500 text-center">
                        Glissez-déposez ou{' '}
                        <span className="text-blue font-semibold">parcourir</span>
                    </p>
                    {multiple && (
                        <p className="text-[10px] text-gray-400">
                            {files.length}/{maxFiles} fichier{maxFiles > 1 ? 's' : ''}
                        </p>
                    )}
                    <input
                        ref={inputRef}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        className="hidden"
                        onChange={(e) => addFiles(e.target.files)}
                    />
                </div>
            )}

            {files.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                    {files.map((file, i) => (
                        <div key={i} className="relative group">
                            {previews[i] ? (
                                <img
                                    src={previews[i]!}
                                    alt={file.name}
                                    className="h-20 w-20 rounded-lg object-cover border border-gray-200 shadow-sm"
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-lg border border-gray-200 shadow-sm bg-gray-50 flex flex-col items-center justify-center gap-1">
                                    <FileText className="h-6 w-6 text-gray-400" />
                                    <span className="text-[9px] text-gray-400 uppercase">
                                        {file.name.split('.').pop()}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red text-white opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            >
                                <X className="h-3 w-3" />
                            </button>
                            <p className="mt-0.5 text-[9px] text-gray-400 truncate max-w-[80px] text-center">
                                {file.name}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
