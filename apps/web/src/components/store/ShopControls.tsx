"use client";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CloseIcon, SlidersIcon } from "../icons";
import { useOverlay } from "./brands/shared";

export interface ShopControlsProps {
  sort: string;
  sorts: [string, string][];
  cat?: string;
  min?: number;
  max?: number;
  stock: boolean;
  floor: number;
  ceil: number;
  clearHref: string;
  labels: {
    sortBy: string;
    sortFilter: string;
    filters: string;
    priceRange: string;
    minPrice: string;
    maxPrice: string;
    inStockOnly: string;
    apply: string;
    clear: string;
    close: string;
  };
}

/**
 * Desktop: sort select + "Filters" button (dialog). Phones: one "Sort & filter" icon button; the bottom
 * sheet holds sort, price and stock, so the sticky toolbar stays a single row. Plain GET form (works
 * without JS); with JS the URL is built clean (no empty or default values).
 */
export function ShopControls({
  sort,
  sorts,
  cat,
  min,
  max,
  stock,
  floor,
  ceil,
  clearHref,
  labels,
}: ShopControlsProps) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOverlay(open, close, panel);
  const active =
    (min !== undefined ? 1 : 0) + (max !== undefined ? 1 : 0) + (stock ? 1 : 0);

  const setSort = (v: string) => {
    const u = new URLSearchParams(sp.toString());
    if (v === "popular") u.delete("sort");
    else u.set("sort", v);
    u.delete("n");
    const q = u.toString();
    router.push(q ? `${path}?${q}` : path, { scroll: false });
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const u = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      // Prices are shown with thousands separators; the URL carries plain digits.
      const val = k === "min" || k === "max" ? String(v).replace(/\D/g, "") : String(v).trim();
      if (val && !(k === "sort" && val === "popular")) u.set(k, val);
    });
    setOpen(false);
    const q = u.toString();
    router.push(q ? `${path}?${q}` : path, { scroll: false });
  };

  return (
    <div className="shop-ctl">
      <label className="shop-sort">
        <span className="sr-only">{labels.sortBy}</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label={labels.sortBy}
        >
          {sorts.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={`shop-fbtn ${active ? "on" : ""}`}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="shop-sheet"
        aria-label={labels.sortFilter}
        data-testid="shop-filter-btn"
      >
        <SlidersIcon size={18} />
        <span className="shop-fbtn-l">{labels.filters}</span>
        {active > 0 && <span className="shop-fcount">{active}</span>}
      </button>
      {open &&
        createPortal(
          <div className="shop-sheet-wrap">
            <div className="shop-scrim" onClick={close} aria-hidden="true" />
            <div
              className="shop-sheet"
              id="shop-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-sheet-title"
              ref={panel}
            >
              <div className="shop-sheet-head">
                <b id="shop-sheet-title">
                  <span className="shop-t-d">{labels.filters}</span>
                  <span className="shop-t-m">{labels.sortFilter}</span>
                </b>
                <button
                  type="button"
                  onClick={close}
                  aria-label={labels.close}
                  className="shop-sheet-x"
                  data-autofocus
                >
                  <CloseIcon size={20} />
                </button>
              </div>
              <form
                method="get"
                action={path}
                className="shop-form"
                onSubmit={submit}
              >
                {cat && <input type="hidden" name="cat" value={cat} />}
                {/* Phones choose the order here; on desktop this set is hidden (the select sorts) and just carries the current value. */}
                <fieldset className="shop-sortset">
                  <legend>{labels.sortBy}</legend>
                  {sorts.map(([v, l]) => (
                    <label key={v} className="shop-check">
                      <input type="radio" name="sort" value={v} defaultChecked={v === sort} /> {l}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>{labels.priceRange}</legend>
                  <label>
                    <span>{labels.minPrice}</span>
                    <input
                      className="input"
                      type="text"
                      name="min"
                      inputMode="numeric"
                      autoComplete="off"
                      defaultValue={min !== undefined ? groupDigits(String(min)) : undefined}
                      onChange={(e) => (e.currentTarget.value = groupDigits(e.currentTarget.value))}
                      placeholder={groupDigits(String(floor))}
                    />
                  </label>
                  <label>
                    <span>{labels.maxPrice}</span>
                    <input
                      className="input"
                      type="text"
                      name="max"
                      inputMode="numeric"
                      autoComplete="off"
                      defaultValue={max !== undefined ? groupDigits(String(max)) : undefined}
                      onChange={(e) => (e.currentTarget.value = groupDigits(e.currentTarget.value))}
                      placeholder={groupDigits(String(ceil))}
                    />
                  </label>
                </fieldset>
                <label className="shop-check">
                  <input
                    type="checkbox"
                    name="stock"
                    value="1"
                    defaultChecked={stock}
                  />{" "}
                  {labels.inStockOnly}
                </label>
                <div className="shop-form-btns">
                  <Link
                    href={clearHref}
                    className="shop-clear"
                    onClick={close}
                    scroll={false}
                  >
                    {labels.clear}
                  </Link>
                  <button className="shop-apply">{labels.apply}</button>
                </div>
              </form>
            </div>
          </div>,
          document.querySelector(".brand-root") ?? document.body,
        )}
    </div>
  );
}

/** "2040000" -> "2,040,000" (display only). */
function groupDigits(v: string): string {
  const d = v.replace(/\D/g, "");
  return d ? Number(d).toLocaleString("en-US") : "";
}
