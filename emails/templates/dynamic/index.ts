/**
 * emails/templates/dynamic/index.ts
 *
 * Barrel export + TEMPLATE_REGISTRY map.
 *
 * TEMPLATE_REGISTRY maps each template type string to its React component.
 * This eliminates the giant switch statement in campaign-db.ts and allows
 * new template types to be registered here without touching dispatch logic.
 *
 * All components accept a unified DynamicTemplateBaseProps plus type-specific extras
 * bundled in the `templateProps` Record<string, any> spread.
 */

import type { ResolvedProduct } from "@/lib/product-resolver";
import type React from "react";

export { default as DynamicWelcomeMail } from "./welcome";
export { default as DynamicNewsletterMail } from "./newsletter";
export { default as DynamicPromotionMail } from "./promotion";
export { default as DynamicEventMail } from "./event";
export { default as DynamicAnnouncementMail } from "./announcement";
export { default as DynamicAppreciationMail } from "./appreciation";
export { default as DynamicSurveyMail } from "./survey";
export { default as DynamicHolidayMail } from "./holiday";
export { default as DynamicCurriculumMail } from "./curriculum";
export { default as DynamicCoursePromoMail } from "./course-promo";
export { default as DynamicCohortWelcomeMail } from "./cohort-welcome";

// Base props all dynamic templates receive
export interface DynamicTemplateBaseProps {
  product: ResolvedProduct;
  message: string;
  [key: string]: unknown;
}

// Registry type: string → component constructor
export type TemplateComponent = (props: any) => React.ReactElement;

import DynamicWelcomeMail from "./welcome";
import DynamicNewsletterMail from "./newsletter";
import DynamicPromotionMail from "./promotion";
import DynamicEventMail from "./event";
import DynamicAnnouncementMail from "./announcement";
import DynamicAppreciationMail from "./appreciation";
import DynamicSurveyMail from "./survey";
import DynamicHolidayMail from "./holiday";
import DynamicCurriculumMail from "./curriculum";
import DynamicCoursePromoMail from "./course-promo";
import DynamicCohortWelcomeMail from "./cohort-welcome";

export const TEMPLATE_REGISTRY: Record<string, TemplateComponent> = {
  welcome: DynamicWelcomeMail as unknown as TemplateComponent,
  newsletter: DynamicNewsletterMail as unknown as TemplateComponent,
  promotion: DynamicPromotionMail as unknown as TemplateComponent,
  event: DynamicEventMail as unknown as TemplateComponent,
  announcement: DynamicAnnouncementMail as unknown as TemplateComponent,
  appreciation: DynamicAppreciationMail as unknown as TemplateComponent,
  survey: DynamicSurveyMail as unknown as TemplateComponent,
  holiday: DynamicHolidayMail as unknown as TemplateComponent,
  curriculum: DynamicCurriculumMail as unknown as TemplateComponent,
  "course-promo": DynamicCoursePromoMail as unknown as TemplateComponent,
  "cohort-welcome": DynamicCohortWelcomeMail as unknown as TemplateComponent,
};

/** All supported template type keys */
export const TEMPLATE_TYPES = Object.keys(TEMPLATE_REGISTRY) as string[];

/** Check if a type key is supported */
export function isValidTemplateType(type: string): boolean {
  return type in TEMPLATE_REGISTRY;
}
