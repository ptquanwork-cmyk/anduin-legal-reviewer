/**
 * Reads every row of a query. PostgREST returns at most 1000 rows per request, and long documents have more blocks and
 * annotations than that. `page` must order by a unique key so pages neither repeat nor skip rows.
 */
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, size = 1000) {
  const data: T[] = [];
  for (let from = 0; ; from += size) {
    const r = await page(from, from + size - 1);
    if (r.error) return { data: null, error: r.error };
    data.push(...(r.data ?? []));
    if ((r.data ?? []).length < size) return { data, error: null };
  }
}
