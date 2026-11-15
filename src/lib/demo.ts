import { normaliseAnalysis } from "./normalise";
import type { Analysis, ModelOutput } from "./schema";

export interface DemoExample {
  id: string;
  label: string;
  description: string;
  brief: string;
  /** Hand-written analysis, in the same shape requested from the model. */
  output: ModelOutput;
}

/**
 * Curated examples. Each analysis was written by hand for its exact brief and
 * passes through the same validation and quote verification as live output.
 * Nothing here is generated at runtime, and no other text is ever matched to
 * these analyses.
 */
export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "dashboard",
    label: "Dashboard brief",
    description: "Vague adjectives and a loose deadline",
    brief:
      "We need to improve the health app dashboard. Make it modern and engaging. Add personalisation. Need it by Friday.",
    output: {
      summary:
        "The brief asks for improvements to the health app dashboard, including personalisation, by a Friday. It does not say who the dashboard is for, what is wrong with it today, or how improvement will be judged.",
      sparse: true,
      statedRequirements: [
        {
          statement: "The work concerns the health app dashboard.",
          sourceQuote: "improve the health app dashboard",
          section: "deliverables",
        },
        {
          statement: "Personalisation should be added.",
          sourceQuote: "Add personalisation",
          section: "deliverables",
        },
        {
          statement: "Something is due by a Friday. The date and what is due are not given.",
          sourceQuote: "Need it by Friday",
          section: "timing",
        },
      ],
      ambiguities: [
        {
          wording: "modern",
          sourceQuote: "Make it modern and engaging",
          whyItMatters:
            "“Modern” could mean a visual refresh, new interaction patterns or alignment with a design system. Each implies different work.",
          question: "What makes the current dashboard feel dated, and to whom?",
        },
        {
          wording: "engaging",
          sourceQuote: "Make it modern and engaging",
          whyItMatters:
            "Engagement can’t be designed for until it is tied to a behaviour someone wants to see more of.",
          question:
            "Which user behaviour should increase if the dashboard is more engaging?",
        },
        {
          wording: "improve",
          sourceQuote: "improve the health app dashboard",
          whyItMatters:
            "Without knowing what is falling short today, any change could be called an improvement.",
          question: "What problem with the current dashboard prompted this request?",
        },
        {
          wording: "Friday",
          sourceQuote: "Need it by Friday",
          whyItMatters:
            "The brief doesn’t say which Friday, or whether design, development or launch is due. The feasible scope depends on both.",
          question:
            "Which Friday is meant, and is that the date for design, development or launch?",
        },
      ],
      missingInformation: [
        {
          detail: "Who the dashboard is for",
          whyItMatters:
            "Content priorities and personalisation depend on whose needs the dashboard serves.",
          question: "Who uses the dashboard, and what do they come to it to do?",
          priority: "before_designing",
        },
        {
          detail: "The baseline problem",
          whyItMatters:
            "Without evidence of what isn’t working, the redesign has nothing to solve.",
          question:
            "What evidence — research, analytics or feedback — shows the dashboard needs to change?",
          priority: "before_designing",
        },
        {
          detail: "What personalisation should do",
          whyItMatters:
            "Personalisation ranges from a greeting to adaptive content. The rules and available data set the scope.",
          question:
            "What should be personalised, based on which data, and who decides the rules?",
          priority: "before_designing",
        },
        {
          detail: "How success will be measured",
          whyItMatters: "A measure makes it possible to judge whether the work helped.",
          question: "How will we know the new dashboard is better?",
          priority: "before_designing",
        },
        {
          detail: "Delivery scope",
          whyItMatters:
            "A concept, a detailed design and a shipped feature are very different amounts of work.",
          question:
            "What should exist at the deadline: concepts, final designs or a released dashboard?",
          priority: "later",
        },
      ],
      assumptions: [
        {
          statement: "This is a redesign of an existing dashboard, not a new one.",
          basis: "The brief says “improve”, which suggests a dashboard already exists.",
          section: "context",
        },
        {
          statement: "The Friday deadline refers to a design deliverable, not a launch.",
          basis:
            "The brief gives a short timeframe and doesn’t mention development or release.",
          section: "timing",
        },
      ],
      conflicts: [],
      questions: [
        {
          question: "What problem with the current dashboard prompted this request?",
          priority: "before_designing",
          section: "context",
        },
        {
          question: "Who uses the dashboard, and what do they come to it to do?",
          priority: "before_designing",
          section: "audience",
        },
        {
          question:
            "Which Friday is meant, and is that the date for design, development or launch?",
          priority: "before_designing",
          section: "timing",
        },
        {
          question:
            "What should be personalised, based on which data, and who decides the rules?",
          priority: "before_designing",
          section: "deliverables",
        },
        {
          question:
            "Which user behaviour should increase if the dashboard is more engaging?",
          priority: "before_designing",
          section: "goal",
        },
        {
          question: "How will we know the new dashboard is better?",
          priority: "before_designing",
          section: "successMeasures",
        },
        {
          question: "What makes the current dashboard feel dated, and to whom?",
          priority: "later",
          section: "context",
        },
      ],
    },
  },
  {
    id: "checkout",
    label: "Checkout brief",
    description: "A clear goal with constraints that may pull against it",
    brief:
      "Redesign our mobile checkout to increase completed purchases. Keep every existing step and field. We cannot make backend changes this quarter. Marketing wants it ready for the sale in two weeks.",
    output: {
      summary:
        "The brief asks for a redesign of the mobile checkout to increase completed purchases, keeping every existing step and field and making no backend changes this quarter. Marketing wants it ready for a sale in two weeks. The goal and the constraints may pull against each other, and no baseline data is given.",
      sparse: false,
      statedRequirements: [
        {
          statement: "Increase completed purchases.",
          sourceQuote: "increase completed purchases",
          section: "goal",
        },
        {
          statement: "Redesign the mobile checkout.",
          sourceQuote: "Redesign our mobile checkout",
          section: "deliverables",
        },
        {
          statement: "Every existing step and field must be kept.",
          sourceQuote: "Keep every existing step and field",
          section: "constraints",
        },
        {
          statement: "No backend changes can be made this quarter.",
          sourceQuote: "We cannot make backend changes this quarter",
          section: "constraints",
        },
        {
          statement:
            "Marketing wants it ready for the sale in two weeks. No exact date is given.",
          sourceQuote: "Marketing wants it ready for the sale in two weeks",
          section: "timing",
        },
      ],
      ambiguities: [
        {
          wording: "ready",
          sourceQuote: "Marketing wants it ready for the sale in two weeks",
          whyItMatters:
            "“Ready” could mean designs signed off, built and tested, or live for customers. Each leaves a different amount of design time.",
          question: "What does “ready” mean for the sale: designed, built or live?",
        },
        {
          wording: "Redesign",
          sourceQuote: "Redesign our mobile checkout",
          whyItMatters:
            "With every step and field fixed, it isn’t clear how far a redesign can go — layout, order, copy or visual styling only.",
          question:
            "Within the existing steps and fields, what are we free to change?",
        },
        {
          wording: "backend changes",
          sourceQuote: "We cannot make backend changes this quarter",
          whyItMatters:
            "The line between frontend and backend work varies by team. Things like validation or address lookup could fall on either side.",
          question:
            "Which kinds of change count as backend, and which frontend changes are allowed?",
        },
      ],
      missingInformation: [
        {
          detail: "Baseline conversion data",
          whyItMatters:
            "Without the current completion rate there is no way to size the goal or judge the result.",
          question: "What is the current mobile checkout completion rate?",
          priority: "before_designing",
        },
        {
          detail: "Evidence of where people drop off",
          whyItMatters:
            "Knowing which step or field loses people shows where change would matter — and whether the constraints allow it.",
          question:
            "Where do people abandon the checkout today, and do we know why?",
          priority: "before_designing",
        },
        {
          detail: "The exact launch date",
          whyItMatters:
            "“Two weeks” is relative. The actual date, and the build and test time before it, set how much design time exists.",
          question: "What is the sale’s start date, and when must designs be handed over?",
          priority: "before_designing",
        },
        {
          detail: "Which frontend changes are allowed",
          whyItMatters:
            "This defines the real design space once steps, fields and backend are fixed.",
          question:
            "Can we change layout, field order, grouping, copy, defaults and error handling?",
          priority: "before_designing",
        },
        {
          detail: "A target for the increase",
          whyItMatters: "A target helps decide how bold the changes need to be.",
          question: "Is there a target for the increase in completed purchases?",
          priority: "later",
        },
      ],
      assumptions: [
        {
          statement:
            "Presentation changes — layout, grouping, copy and visual design — are in scope as long as no step or field is removed.",
          basis:
            "The brief asks for a redesign while fixing the steps, fields and backend, which leaves presentation as the remaining space.",
          section: "constraints",
        },
        {
          statement: "The two-week date is tied to the sale and is not flexible.",
          basis: "The brief links the timing to a marketing event.",
          section: "timing",
        },
      ],
      conflicts: [
        {
          title: "The goal may need changes the constraints rule out",
          quoteA: "increase completed purchases",
          quoteB: "Keep every existing step and field",
          tension:
            "Checkout completion is often affected by the number of steps and fields, yet none may be removed. Whether presentation changes alone can meet the goal depends on where people drop off, which the brief doesn’t say.",
          question:
            "If the evidence points to a step or field as the main cause of drop-off, is the constraint open to discussion?",
        },
      ],
      questions: [
        {
          question: "Where do people abandon the checkout today, and do we know why?",
          priority: "before_designing",
          section: "context",
        },
        {
          question: "What is the current mobile checkout completion rate?",
          priority: "before_designing",
          section: "successMeasures",
        },
        {
          question:
            "Within the existing steps and fields, what are we free to change — layout, order, grouping, copy, defaults?",
          priority: "before_designing",
          section: "constraints",
        },
        {
          question:
            "If the evidence points to a step or field as the main cause of drop-off, is the constraint open to discussion?",
          priority: "before_designing",
          section: "constraints",
        },
        {
          question:
            "What is the sale’s start date, and does “ready” mean designed, built or live?",
          priority: "before_designing",
          section: "timing",
        },
        {
          question: "Which kinds of change count as backend?",
          priority: "later",
          section: "constraints",
        },
        {
          question: "Is there a target for the increase in completed purchases?",
          priority: "later",
          section: "successMeasures",
        },
      ],
    },
  },
  {
    id: "onboarding",
    label: "Onboarding brief",
    description: "A single sentence with almost everything missing",
    brief: "Create an onboarding flow for our new app.",
    output: {
      summary:
        "The brief makes one request: an onboarding flow for a new app. It says nothing about the app, its users, or what onboarding should achieve, so almost everything needs a conversation before design can start.",
      sparse: true,
      statedRequirements: [
        {
          statement: "Create an onboarding flow for a new app.",
          sourceQuote: "Create an onboarding flow for our new app",
          section: "deliverables",
        },
      ],
      ambiguities: [
        {
          wording: "onboarding flow",
          sourceQuote: "onboarding flow",
          whyItMatters:
            "This could mean sign-up, account setup, a product introduction, or all three. The brief doesn’t say where it starts or ends.",
          question: "Where should onboarding begin and end?",
        },
      ],
      missingInformation: [
        {
          detail: "What the app does",
          whyItMatters:
            "Onboarding exists to get people to the app’s value, so the app’s purpose shapes everything.",
          question: "What does the app do, and what problem does it solve?",
          priority: "before_designing",
        },
        {
          detail: "Who the app is for",
          whyItMatters:
            "What people already know and need determines what onboarding has to explain or collect.",
          question: "Who are the intended users?",
          priority: "before_designing",
        },
        {
          detail: "The activation behaviour",
          whyItMatters:
            "Onboarding needs an end point: the first action that shows someone is set up and getting value.",
          question:
            "What should someone have done by the time onboarding has succeeded?",
          priority: "before_designing",
        },
        {
          detail: "Platform",
          whyItMatters:
            "Patterns and constraints differ between iOS, Android and the web.",
          question: "Which platforms is the app being built for?",
          priority: "before_designing",
        },
        {
          detail: "Scope and timing",
          whyItMatters:
            "Neither the expected output nor a deadline is mentioned, so effort can’t be planned.",
          question: "What output is expected, and by when?",
          priority: "later",
        },
        {
          detail: "Success measures",
          whyItMatters: "A measure makes it possible to judge whether onboarding works.",
          question: "How will the success of onboarding be measured?",
          priority: "later",
        },
      ],
      assumptions: [],
      conflicts: [],
      questions: [
        {
          question: "What does the app do, and who is it for?",
          priority: "before_designing",
          section: "context",
        },
        {
          question:
            "What should someone have done by the time onboarding has succeeded?",
          priority: "before_designing",
          section: "goal",
        },
        {
          question: "Where should onboarding begin and end?",
          priority: "before_designing",
          section: "deliverables",
        },
        {
          question: "Which platforms is the app being built for?",
          priority: "before_designing",
          section: "constraints",
        },
        {
          question: "What output is expected, and by when?",
          priority: "later",
          section: "timing",
        },
        {
          question: "How will the success of onboarding be measured?",
          priority: "later",
          section: "successMeasures",
        },
      ],
    },
  },
];

/**
 * Returns the example whose brief is exactly this text (ignoring only
 * leading and trailing whitespace). No keyword or fuzzy matching: edited
 * examples and other briefs return null.
 */
export function findExample(text: string): DemoExample | null {
  const trimmed = text.trim();
  return DEMO_EXAMPLES.find((e) => e.brief === trimmed) ?? null;
}

/** The curated analysis for an exact example brief, or null. */
export function resolveDemoAnalysis(text: string): Analysis | null {
  const example = findExample(text);
  if (!example) return null;
  const result = normaliseAnalysis(example.output, text);
  return result.ok ? result.analysis : null;
}
