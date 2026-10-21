// Supabase (PostgREST) zwraca najwyżej 1000 wierszy na jedno zapytanie (ustawienie db-max-rows)
// i nie mówi, że obciął wynik. Każde zapytanie o zamówienia albo pozycje, które może urosnąć
// ponad tysiąc wierszy, idzie przez ten pomocnik: dociąga kolejne strony, aż dostanie niepełną.
//
// Zasady użycia:
// - zapytanie budujemy od nowa w fabryce (makeQuery), bo każda strona dostaje inny .range();
// - na końcu zawsze .order(...) po kolumnie unikalnej (np. id) — bez stałej kolejności strony
//   mogłyby się nakładać albo gubić wiersze między sobą;
// - błąd zapytania rzuca wyjątek zamiast zwracać część danych, żeby strona pokazała błąd,
//   a nie zaniżoną sumę.

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
        if (data.length < PAGE_SIZE) break
    }
    return rows
}
