"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Eye, ExternalLink } from "lucide-react"

interface DocumentPreviewButtonProps {
    // Adres podglądu w panelu (/api/vehicles/{id}/document?kind=...): panel sprawdza uprawnienia
    // i pobiera plik z Dysku przez n8n, więc Dysk nie musi być udostępniony linkiem
    src: string
    title: string
}

export function DocumentPreviewButton({ src, title }: DocumentPreviewButtonProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer transition-colors"
            >
                <Eye className="h-3.5 w-3.5" />
                Podgląd dokumentu
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Eye className="h-4 w-4 text-blue-500" />
                            {title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 px-6 pb-6">
                        {open && (
                            <iframe
                                src={src}
                                className="w-full h-full rounded-lg border"
                                title={title}
                            />
                        )}
                    </div>
                    <div className="absolute top-4 right-12">
                        <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            title="Otwórz w nowej karcie"
                        >
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
