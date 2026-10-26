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

/** Sort select and the filter panel (bottom sheet on phones, popover on desktop). Plain GET form, so it works without JS too. */
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
      >
        <SlidersIcon size={18} />
        <span>{labels.filters}</span>
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
              aria-label={labels.filters}
              ref={panel}
            >
              <div className="shop-sheet-head">
                <b>{labels.filters}</b>
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
                onSubmit={() => setOpen(false)}
              >
                {cat && <input type="hidden" name="cat" value={cat} />}
                {sort !== "popular" && (
                  <input type="hidden" name="sort" value={sort} />
                )}
                <fieldset>
                  <legend>{labels.priceRange}</legend>
                  <label>
                    <span>{labels.minPrice}</span>
                    <input
                      className="input"
                      type="number"
                      name="min"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      defaultValue={min}
                      placeholder={String(floor)}
                    />
                  </label>
                  <label>
                    <span>{labels.maxPrice}</span>
                    <input
                      className="input"
                      type="number"
                      name="max"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      defaultValue={max}
                      placeholder={String(ceil)}
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
