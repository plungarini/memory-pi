import { clsx, type ClassValue } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CloudUpload, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

interface FileDropzoneProps {
	onFileSelect: (file: File | null) => void;
	selectedFile: File | null;
	className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileSelect, selectedFile, className }) => {
	const [isDragging, setIsDragging] = useState(false);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) onFileSelect(file);
		},
		[onFileSelect],
	);

	const handleFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) onFileSelect(file);
		},
		[onFileSelect],
	);

	const removeFile = (e: React.MouseEvent) => {
		e.stopPropagation();
		onFileSelect(null);
	};

	return (
		<div
			className={cn(
				'relative transition-all duration-500 rounded-2xl overflow-hidden group',
				isDragging ? 'scale-[1.02]' : '',
				className,
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<input
				type="file"
				id="file-upload"
				className="hidden"
				onChange={handleFileInput}
				accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.json,.js,.ts,.html,.css"
			/>

			<label
				htmlFor="file-upload"
				className={cn(
					'flex items-center gap-4 p-4 cursor-pointer border border-dashed transition-all duration-300',
					isDragging
						? 'border-primary bg-primary/10'
						: 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20',
					selectedFile ? 'border-success/30 bg-success/5' : '',
				)}
			>
				<AnimatePresence mode="wait">
					{selectedFile ? (
						<motion.div
							key="selected"
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 10 }}
							className="flex items-center gap-3 w-full"
						>
							<div className="p-2 rounded-lg bg-success/20 text-success">
								<CheckCircle2 size={18} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-white font-medium text-sm truncate">{selectedFile.name}</p>
								<p className="text-slate-500 text-[10px]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
							</div>
							<button
								onClick={removeFile}
								className="p-1 px-2 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
							>
								<X size={14} />
							</button>
						</motion.div>
					) : (
						<motion.div
							key="empty"
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 10 }}
							className="flex items-center gap-3 w-full"
						>
							<div
								className={cn(
									'p-2 rounded-lg transition-colors',
									isDragging ? 'bg-primary text-white' : 'bg-white/10 text-slate-400 group-hover:text-slate-200',
								)}
							>
								<CloudUpload size={18} />
							</div>
							<div className="flex-1">
								<p className="text-white text-sm font-medium">Attach Knowledge</p>
								<p className="text-slate-500 text-[10px]">Text, PDF, or Images</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</label>
		</div>
	);
};
