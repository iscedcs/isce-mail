import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";

// PT templates
import PtWelcomeMail from "../../../../emails/templates/palmtechniq/welcome";
import PtNewsletterMail from "../../../../emails/templates/palmtechniq/newsletter";
import PtPromotionMail from "../../../../emails/templates/palmtechniq/promotion";
import PtSurveyMail from "../../../../emails/templates/palmtechniq/survey";
import PtHolidayMail from "../../../../emails/templates/palmtechniq/holiday";
import PtEventsMail from "../../../../emails/templates/palmtechniq/events";
import PtAnnouncementMail from "../../../../emails/templates/palmtechniq/announcement";
import PtAppreciationMail from "../../../../emails/templates/palmtechniq/appreciation";
import PtCurriculumMail from "../../../../emails/templates/palmtechniq/curriculum";
import PtCoursePromoMail from "../../../../emails/templates/palmtechniq/course-promo";
import PtCohortWelcomeMail from "../../../../emails/templates/palmtechniq/cohort-welcome";

// ISCE templates
import IsceWelcomeMail from "../../../../emails/templates/isce/welcome";
import IsceNewsletterMail from "../../../../emails/templates/isce/newsletter";
import IscePromotionMail from "../../../../emails/templates/isce/promotion";
import IsceSurveyMail from "../../../../emails/templates/isce/survey";
import IsceHolidayMail from "../../../../emails/templates/isce/holiday";
import IsceEventsMail from "../../../../emails/templates/isce/events";
import IsceAnnouncementMail from "../../../../emails/templates/isce/announcement";
import IsceAppreciationMail from "../../../../emails/templates/isce/appreciation";
import IsceCurriculumMail from "../../../../emails/templates/isce/curriculum";
import IsceCoursePromoMail from "../../../../emails/templates/isce/course-promo";
import IsceCohortWelcomeMail from "../../../../emails/templates/isce/cohort-welcome";

const PREVIEW_DEFAULTS = {
  message: "<p>This is a <strong>preview</strong> of your email message.</p>",
  link: "https://example.com",
  image: "",
  courseName: "Introduction to Web Development",
  courseTitle: "Full-Stack Bootcamp",
  originalPrice: "₦150,000",
  discountPrice: "₦89,999",
  deadline: "December 31, 2025",
  cohortName: "Cohort 7 — Backend Engineering",
  startDate: "January 15, 2026",
  mentorName: "John Doe",
  communityLink: "https://example.com/community",
};

function resolveTemplate(type: string, basis: string, data: any) {
  const isPT = basis === "PalmTechniq";
  const d = { ...PREVIEW_DEFAULTS, ...data };

  switch (type) {
    case "welcome":
      return isPT
        ? PtWelcomeMail({ message: d.message, link: d.link })
        : IsceWelcomeMail({ message: d.message, link: d.link });
    case "newsletter":
      return isPT
        ? PtNewsletterMail({ message: d.message, link: d.link })
        : IsceNewsletterMail({ message: d.message, link: d.link });
    case "promotion":
      return isPT
        ? PtPromotionMail({ message: d.message, link: d.link, image: d.image })
        : IscePromotionMail({
            message: d.message,
            link: d.link,
            image: d.image,
          });
    case "survey":
      return isPT
        ? PtSurveyMail({ message: d.message, link: d.link })
        : IsceSurveyMail({ message: d.message, link: d.link });
    case "holiday":
      return isPT
        ? PtHolidayMail({ message: d.message, link: d.link })
        : IsceHolidayMail({ message: d.message, link: d.link });
    case "event":
      return isPT
        ? PtEventsMail({ message: d.message, link: d.link, image: d.image })
        : IsceEventsMail({ message: d.message, link: d.link, image: d.image });
    case "announcement":
      return isPT
        ? PtAnnouncementMail({ message: d.message, link: d.link })
        : IsceAnnouncementMail({ message: d.message, link: d.link });
    case "appreciation":
      return isPT
        ? PtAppreciationMail({
            message: d.message,
            link: d.link,
            image: d.image,
          })
        : IsceAppreciationMail({
            message: d.message,
            link: d.link,
            image: d.image,
          });
    case "curriculum":
      return isPT
        ? PtCurriculumMail({
            message: d.message,
            link: d.link,
            courseName: d.courseName,
          })
        : IsceCurriculumMail({
            message: d.message,
            link: d.link,
            courseName: d.courseName,
          });
    case "course-promo":
      return isPT
        ? PtCoursePromoMail({
            message: d.message,
            link: d.link,
            courseTitle: d.courseTitle,
            originalPrice: d.originalPrice,
            discountPrice: d.discountPrice,
            deadline: d.deadline,
          })
        : IsceCoursePromoMail({
            message: d.message,
            link: d.link,
            courseTitle: d.courseTitle,
            originalPrice: d.originalPrice,
            discountPrice: d.discountPrice,
            deadline: d.deadline,
          });
    case "cohort-welcome":
      return isPT
        ? PtCohortWelcomeMail({
            message: d.message,
            link: d.link,
            cohortName: d.cohortName,
            startDate: d.startDate,
            mentorName: d.mentorName,
            communityLink: d.communityLink,
          })
        : IsceCohortWelcomeMail({
            message: d.message,
            link: d.link,
            cohortName: d.cohortName,
            startDate: d.startDate,
            mentorName: d.mentorName,
            communityLink: d.communityLink,
          });
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { type, basis = "ISCE", data = {} } = body;

  if (!type) {
    return NextResponse.json({ error: "Missing type" }, { status: 400 });
  }

  const element = resolveTemplate(type, basis, data);
  if (!element) {
    return NextResponse.json(
      { error: "Unknown template type" },
      { status: 404 },
    );
  }

  const html = await render(element);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
