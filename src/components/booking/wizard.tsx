"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AvailabilitySearch, QuoteResult } from "@/lib/booking/service";
import { createReservationAction, quoteAction, searchAvailabilityAction } from "@/lib/actions/booking";
import { addDays, todayIso } from "@/lib/utils/dates";
import { Stepper } from "./stepper";
import { PriceSummary } from "./price-summary";
import { SearchStep } from "./steps/search-step";
import { AvailabilityStep } from "./steps/availability-step";
import { RatesStep } from "./steps/rates-step";
import { ExtrasStep } from "./steps/extras-step";
import { GuestStep } from "./steps/guest-step";
import { ReviewStep } from "./steps/review-step";
import type { SelectedRoom, WizardState } from "./types";

const STORAGE_KEY = "sw-booking-wizard-v1";

type Settings = { childAgeLimit: number; maxRoomsPerBooking: number; maxNightsPerBooking: number; checkInTime: string };

type InitialSearch = Partial<{ checkIn: string; checkOut: string; adults: number; children: number; rooms: number; roomType: string; promo: string }>;

function initialState(initial: InitialSearch): WizardState {
  const today = todayIso();
  return {
    step: 0,
    search: {
      checkIn: initial.checkIn ?? addDays(today, 7),
      checkOut: initial.checkOut ?? addDays(today, 9),
      adults: initial.adults ?? 2,
      children: initial.children ?? 0,
      rooms: initial.rooms ?? 1,
      promotionCode: initial.promo ?? "",
    },
    availability: null,
    selectedRooms: [],
    extras: {},
    guest: { firstName: "", lastName: "", email: "", phone: "", country: "", arrivalTime: "", specialRequests: "" },
    paymentMethod: "PAY_AT_PROPERTY",
    acceptTerms: false,
  };
}

export function BookingWizard({ settings, initial, autoSearch }: { settings: Settings; initial: InitialSearch; autoSearch: boolean }) {
  const t = useTranslations("booking");
  const te = useTranslations("booking.errors");
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = React.useState<WizardState>(() => initialState(initial));
  const [hydrated, setHydrated] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [quote, setQuote] = React.useState<QuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const preselectRoomType = initial.roomType;

  const translateError = React.useCallback(
    (code: string, details?: Record<string, unknown>): string => {
      switch (code) {
        case "CHECK_IN_PAST": return te("checkInPast");
        case "INVALID_DATES": return te("checkOutAfter");
        case "MAX_NIGHTS": return te("maxNights", { max: Number(details?.max ?? settings.maxNightsPerBooking) });
        case "MAX_ROOMS": return te("maxRooms", { max: Number(details?.max ?? settings.maxRoomsPerBooking) });
        case "OCCUPANCY": return te("capacity");
        case "NOT_AVAILABLE": return te("availabilityChanged");
        case "PROMOTION_INVALID": return te("invalidPromo");
        case "RATE_PLAN_UNAVAILABLE": case "RATE_PLAN_NOT_FOUND": return te("ratePlanUnavailable");
        case "CLOSED_DATE": return te("closedDate");
        case "MIN_STAY": return te("minStay", { count: Number(details?.minStay ?? 2) });
        default: return te("generic");
      }
    },
    [te, settings.maxNightsPerBooking, settings.maxRoomsPerBooking],
  );
  // Keep a stable reference for effects so translation re-renders never re-trigger server calls.
  const translateErrorRef = React.useRef(translateError);
  React.useEffect(() => {
    translateErrorRef.current = translateError;
  }, [translateError]);

  // Restore an in-progress booking after refresh (sessionStorage, same tab only).
  const [restored, setRestored] = React.useState(false);
  React.useEffect(() => {
    // Syncing from sessionStorage (an external system) after hydration is intentional here.
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as WizardState;
        const matchesUrl =
          !autoSearch ||
          (saved.search.checkIn === initial.checkIn &&
            saved.search.checkOut === initial.checkOut &&
            saved.search.adults === (initial.adults ?? saved.search.adults) &&
            saved.search.rooms === (initial.rooms ?? saved.search.rooms));
        if (matchesUrl && saved.search.checkIn >= todayIso() && saved.availability) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRestored(true);
          // With a deep link, availability is re-fetched below so inventory counts are never stale.
          setState({ ...saved, availability: autoSearch ? null : saved.availability, acceptTerms: false });
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable */
    }
  }, [state, hydrated]);

  const runSearch = React.useCallback(
    async (search: WizardState["search"], keepSelection = false) => {
      setLoading(true);
      setError(null);
      const result = await searchAvailabilityAction({ checkIn: search.checkIn, checkOut: search.checkOut, adults: search.adults, children: search.children, rooms: search.rooms });
      setLoading(false);
      if (!result.ok) {
        setError(translateErrorRef.current(result.error, result.details));
        setState((s) => ({ ...s, search, step: 0 }));
        return;
      }
      const availability: AvailabilitySearch = result.data;
      setState((s) => {
        let selectedRooms: SelectedRoom[] = keepSelection ? s.selectedRooms : [];
        if (!keepSelection && preselectRoomType && search.rooms === 1) {
          const rt = availability.roomTypes.find((r) => r.slug === preselectRoomType);
          if (rt && rt.available > 0) {
            selectedRooms = [{ key: `${rt.roomTypeId}-pre`, roomTypeId: rt.roomTypeId, ratePlanId: rt.offers[0]?.ratePlanId ?? null, adults: Math.min(search.adults, rt.maxAdults), children: Math.min(search.children, rt.maxChildren) }];
          }
        }
        return { ...s, search, availability, selectedRooms, step: 1, extras: keepSelection ? s.extras : {} };
      });
      setQuote(null);
    },
    [preselectRoomType],
  );

  // Deep link from the homepage search bar: run the search immediately.
  // After a restore from session storage, refresh availability silently so counts are never stale.
  const autoRan = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || autoRan.current) return;
    autoRan.current = true;
    if (autoSearch && !restored) {
      // Deferred so the effect itself does not set state synchronously (React Compiler rule).
      const search = state.search;
      void Promise.resolve().then(() => runSearch(search));
    } else if (restored) {
      void searchAvailabilityAction({ checkIn: state.search.checkIn, checkOut: state.search.checkOut, adults: state.search.adults, children: state.search.children, rooms: state.search.rooms }).then((result) => {
        if (result.ok) setState((s) => ({ ...s, availability: result.data }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, autoSearch, restored]);

  const quotePayload = React.useCallback(
    () => ({
      checkIn: state.search.checkIn,
      checkOut: state.search.checkOut,
      rooms: state.selectedRooms.map((r) => ({ roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId ?? "", adults: r.adults, children: r.children })),
      extras: Object.entries(state.extras).filter(([, q]) => q > 0).map(([extraId, quantity]) => ({ extraId, quantity })),
      promotionCode: state.search.promotionCode || null,
    }),
    [state.search, state.selectedRooms, state.extras],
  );

  // Fetch a fresh server quote whenever the review step is shown.
  React.useEffect(() => {
    if (state.step !== 5) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuoteLoading(true);
    setError(null);
    void quoteAction(quotePayload()).then((result) => {
      if (cancelled) return;
      setQuoteLoading(false);
      if (result.ok) setQuote(result.data);
      else {
        setQuote(null);
        setError(translateErrorRef.current(result.error, result.details));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.step, quotePayload]);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    const result = await createReservationAction({ ...quotePayload(), guest: state.guest, paymentMethod: state.paymentMethod, acceptTerms: state.acceptTerms });
    if (!result.ok) {
      setSubmitting(false);
      setError(translateError(result.error, result.details));
      if (result.error === "NOT_AVAILABLE") setState((s) => ({ ...s, step: 0 }));
      return;
    }
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    router.push(`/book/confirmation/${result.data.reference}`);
  }

  const go = (step: number) => setState((s) => ({ ...s, step }));
  const avail = state.availability;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <Stepper current={state.step} onJump={go} />
        {state.step === 0 || !avail ? (
          <SearchStep state={state} settings={settings} onSubmit={(search) => void runSearch(search)} loading={loading || (autoSearch && !avail && !error)} error={error} />
        ) : state.step === 1 ? (
          <AvailabilityStep state={state} availability={avail} onChange={(selectedRooms) => setState((s) => ({ ...s, selectedRooms }))} onBack={() => go(0)} onContinue={() => go(2)} />
        ) : state.step === 2 ? (
          <RatesStep state={state} availability={avail} onChange={(selectedRooms) => setState((s) => ({ ...s, selectedRooms }))} onBack={() => go(1)} onContinue={() => go(3)} />
        ) : state.step === 3 ? (
          <ExtrasStep state={state} availability={avail} onChange={(extras) => setState((s) => ({ ...s, extras }))} onBack={() => go(2)} onContinue={() => go(4)} />
        ) : state.step === 4 ? (
          <GuestStep guest={state.guest} checkInTime={settings.checkInTime} onBack={() => go(3)} onContinue={(guest) => setState((s) => ({ ...s, guest, step: 5 }))} />
        ) : (
          <ReviewStep state={state} availability={avail} quote={quote} loading={quoteLoading} error={error} onEdit={go} onChange={(patch) => setState((s) => ({ ...s, ...patch }))} onBack={() => go(4)} onConfirm={() => void confirm()} submitting={submitting} />
        )}
      </div>
      <div className="lg:sticky lg:top-28 lg:self-start">
        {avail && state.step > 0 ? <PriceSummary state={state} quote={state.step === 5 ? quote : null} loading={state.step === 5 && quoteLoading} /> : (
          <div className="rounded-lg border border-charcoal/10 bg-ivory-soft p-5 text-sm text-muted-foreground">
            <p className="eyebrow mb-2">{t("eyebrow")}</p>
            <p>{t("demoBanner")}</p>
            <p className="mt-3 text-xs" lang={locale}>{t("search.noPrepayment")} · {t("search.flexible")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
