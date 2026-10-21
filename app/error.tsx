"use client"

// Granica błędów dla całego panelu. Bez niej wyjątek ze strony serwerowej (np. padnięte
// zapytanie do Supabase w fetchAll) kończył się domyślnym, anglojęzycznym ekranem Next.js.

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Błąd strony:", error)
    }, [error])

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Nie udało się wczytać tej strony</h2>
            <p className="max-w-md text-sm text-slate-500">
                Dane nie przyszły z bazy w całości, więc nie pokazujemy ich wcale, żeby nie wprowadzać w błąd.
                Spróbuj ponownie, a jeśli błąd wraca, daj znać administratorowi.
            </p>
            {error.digest && (
                <p className="text-xs text-slate-400">Kod zgłoszenia: {error.digest}</p>
            )}
            <Button onClick={reset} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Spróbuj ponownie
            </Button>
        </div>
    )
}
