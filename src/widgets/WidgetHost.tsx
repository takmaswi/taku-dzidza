import { lazy, Suspense } from "react";
import type { EquationData } from "../../convex/widgets/equationSteps";
import type { BlanksData } from "../../convex/widgets/fillBlanks";
import type { DivisionData } from "../../convex/widgets/longDivision";
import { copy } from "../copy/en";

// One chunk each: the maths engine is large, and only equation steps needs it.
const EquationSteps = lazy(() => import("./EquationSteps"));
const FillBlanks = lazy(() => import("./FillBlanks"));
const LongDivision = lazy(() => import("./LongDivision"));

/** Draws a stored widget. Taku supplied the data; every mark comes from the widget's own checker. */
export function WidgetHost({ widget, titles = {} }: { widget: { slug: string; data: unknown }; titles?: Record<string, string> }) {
  return (
    <Suspense fallback={<p className="soft">{copy.loading}</p>}>
      {widget.slug === "equation-steps" && <EquationSteps data={widget.data as EquationData} />}
      {widget.slug === "fill-blanks" && <FillBlanks data={widget.data as BlanksData} titles={titles} />}
      {widget.slug === "long-division" && <LongDivision data={widget.data as DivisionData} />}
    </Suspense>
  );
}
