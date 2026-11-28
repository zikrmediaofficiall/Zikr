import { kidsContent, type KidsItem, type KidsQuizQuestion } from "@/features/kids/data/content";
import { isKidsContentPubliclyVisible } from "@/features/kids/services/kids-content-visibility";

export type VerifiedQuizQuestion = KidsQuizQuestion & {
  category: string;
  sourceSlug: string;
};

function isQuestion(value: unknown): value is KidsQuizQuestion {
  if (!value || typeof value !== "object") return false;
  const question = value as Partial<KidsQuizQuestion>;
  const options = question.options;
  const correctAnswer = question.correctAnswer;
  return (
    typeof question.text === "string" &&
    question.text.length > 0 &&
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every(option => typeof option === "string") &&
    typeof correctAnswer === "number" &&
    Number.isInteger(correctAnswer) &&
    correctAnswer >= 0 &&
    correctAnswer < options.length
  );
}

export function getVerifiedKidsQuizQuestions(items: readonly KidsItem[] = kidsContent): VerifiedQuizQuestion[] {
  const all = items.filter(isKidsContentPubliclyVisible).flatMap(item => {
    const questions = item.quiz_data?.questions?.filter(isQuestion) ?? [];
    return questions
      .filter(question => new Set(question.options).size === question.options.length)
      .map(question => ({
        ...question,
        category: item.metadata?.category ?? item.title_ar,
        sourceSlug: item.slug,
      }));
  });
  // Automated gate: a repeated question is kept once, and a question whose repeats disagree
  // on the correct answer is dropped entirely rather than published.
  const byText = new Map<string, VerifiedQuizQuestion[]>();
  for (const question of all) byText.set(question.text, [...(byText.get(question.text) ?? []), question]);
  return [...byText.values()].flatMap(group => {
    const answers = new Set(group.map(question => question.options[question.correctAnswer]));
    return answers.size === 1 ? [group[0]] : [];
  });
}

export type VerifiedWuduStep = {
  order: number;
  text: string;
};

export type WuduStep = VerifiedWuduStep;

export type VerifiedWuduContent = {
  steps: VerifiedWuduStep[];
  afterDhikr: string;
};

export function getVerifiedWuduContent(): VerifiedWuduContent {
  const source = kidsContent.find(item => item.slug === "wudu-steps" && isKidsContentPubliclyVisible(item));
  const steps = source?.wudu_steps?.filter(
    step =>
      Number.isInteger(step.order) &&
      step.order >= 1 &&
      typeof step.text === "string" &&
      step.text.trim().length > 0
  ) ?? [];

  return {
    steps,
    afterDhikr:
      typeof source?.wudu_after_dhikr === "string" ? source.wudu_after_dhikr : "",
  };
}

export function getVerifiedWuduSteps(): VerifiedWuduStep[] {
  return getVerifiedWuduContent().steps;
}

const APPROVED_SCENARIO_SOURCE_SLUGS = [
  "game-scenario-smart-choice",
  "quiz-akhlaq-adventure",
  "quiz-akhlaq-daily-life",
] as const;

function getApprovedScenarioQuestionsFromSources(): VerifiedQuizQuestion[] {
  const seenQuestionTexts = new Set<string>();

  return APPROVED_SCENARIO_SOURCE_SLUGS.flatMap(sourceSlug => {
    const source = kidsContent.find(item => item.slug === sourceSlug && isKidsContentPubliclyVisible(item));
    const questions = source?.quiz_data?.questions?.filter(isQuestion) ?? [];

    return questions.flatMap(question => {
      // Repeated prompt text makes later levels feel recycled. Preserve the
      // first approved source while treating whitespace/case-only changes as duplicates.
      const key = question.text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      if (seenQuestionTexts.has(key)) return [];
      seenQuestionTexts.add(key);

      return [{
        ...question,
        category: source?.metadata?.category ?? "الأخلاق والمهارات",
        sourceSlug,
      }];
    });
  });
}

export function getApprovedScenarioQuestions(): VerifiedQuizQuestion[] {
  return getApprovedScenarioQuestionsFromSources();
}

export function getApprovedRoadQuestions(): VerifiedQuizQuestion[] {
  return getApprovedScenarioQuestionsFromSources();
}


export type VerifiedMemoryPair = {
  id: string;
  situation: string;
  dhikr: string;
};

export function getVerifiedMemoryPairs(): VerifiedMemoryPair[] {
  const source = kidsContent.find(item => item.slug === "game-memory-dhikr-cards" && isKidsContentPubliclyVisible(item));
  return source?.memory_pairs?.filter(
    pair =>
      typeof pair.id === "string" &&
      typeof pair.situation === "string" &&
      pair.situation.trim().length > 0 &&
      typeof pair.dhikr === "string" &&
      pair.dhikr.trim().length > 0
  ) ?? [];
}
