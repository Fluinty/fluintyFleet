// Supabase (PostgREST) zwraca najwyżej 1000 wierszy na jedno zapytanie (ustawienie db-max-rows)
// i nie mówi, że obciął wynik. Każde zapytanie o zamówienia albo pozycje, które może urosnąć
// ponad tysiąc wierszy, idzie przez ten pomocnik: dociąga kolejne strony, aż dostanie niepełną.
//
// Zasady użycia:
// - zapytanie budujemy od nowa w fabryce (makeQuery), bo każda strona dostaje inny .range();
// - na końcu zawsze .order(...) po kolumnie unikalnej (np. id) — bez stałej kolejności strony
//   mogłyby się nakładać albo gubić wiersze między sobą;
// - pętla kończy się dopiero na PUSTEJ stronie, a nie na "krótszej niż 1000": gdyby ktoś obniżył
//   "Max rows" w ustawieniach Supabase, krótsza strona nie oznaczałaby końca danych. Koszt to jedno
//   dodatkowe, puste zapytanie, gdy ostatnia strona jest pełna;
// - błąd zapytania rzuca wyjątek zamiast zwracać część danych, żeby strona pokazała błąd
//   (app/error.tsx), a nie zaniżoną sumę;
// - stronicowanie po offsecie: wiersz wstawiony albo usunięty w trakcie dociągania może
//   przesunąć granicę strony o jeden. Przy renderowaniu serwerowym to pomijalne.

const PAGE_SIZE = 1000

type PageResult<T> = { data: T[] | null; error: { message: string } | null }
type PageQuery<T> = { range(from: number, to: number): PromiseLike<PageResult<T>> }

export async function fetchAll<T = any>(makeQuery: () => PageQuery<T>): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await makeQuery().range(from, from + PAGE_SIZE - 1)
        if (error) {
            throw new Error(`fetchAll: zapytanie nie powiodło się (od wiersza ${from}): ${error.message}`)
        }
        if (!data || data.length === 0) break
        rows.push(...data)
    }
    return rows
}
