import connectToDatabase from "@/lib/mongodb";
import EvaluationConfig, { IEvaluationCriterion } from "@/models/EvaluationConfig";

export const DEFAULT_EVALUATION_CRITERIA: IEvaluationCriterion[] = [
  { id: "technical", name: "Technical", maxScore: 10 },
  { id: "communication", name: "Communication", maxScore: 10 },
  { id: "confidence", name: "Confidence", maxScore: 10 },
  { id: "leadership", name: "Leadership", maxScore: 10 },
  { id: "teamwork", name: "Teamwork", maxScore: 10 },
];

/**
 * Retrieves the single global evaluation configuration from MongoDB.
 * If not yet initialized, seeds it with the default five criteria.
 */
export async function getGlobalEvaluationConfig(): Promise<{ criteria: IEvaluationCriterion[] }> {
  await connectToDatabase();

  let config = await EvaluationConfig.findOne({ key: "global" }).lean();

  if (!config || !Array.isArray(config.criteria) || config.criteria.length === 0) {
    const created = await EvaluationConfig.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: { key: "global", criteria: DEFAULT_EVALUATION_CRITERIA } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return {
      criteria: (created?.criteria && created.criteria.length > 0)
        ? created.criteria.map(c => ({ id: c.id, name: c.name, maxScore: c.maxScore }))
        : DEFAULT_EVALUATION_CRITERIA,
    };
  }

  return {
    criteria: config.criteria.map(c => ({
      id: c.id,
      name: c.name,
      maxScore: Number(c.maxScore) > 0 ? Number(c.maxScore) : 10,
    })),
  };
}

/**
 * Atomically updates the single global evaluation configuration in MongoDB.
 * Validates criteria list and ensures criterion IDs exist.
 */
export async function saveGlobalEvaluationConfig(
  criteriaInput: Array<{ id?: string; name: string; maxScore?: number }>
): Promise<{ criteria: IEvaluationCriterion[] }> {
  if (!Array.isArray(criteriaInput) || criteriaInput.length === 0) {
    throw new Error("At least one evaluation criterion is required.");
  }

  await connectToDatabase();

  const validatedCriteria: IEvaluationCriterion[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < criteriaInput.length; i++) {
    const item = criteriaInput[i];
    const name = (item.name || "").trim();

    if (!name) {
      throw new Error(`Criterion #${i + 1} must have a non-empty name.`);
    }

    const lowerName = name.toLowerCase();
    if (seenNames.has(lowerName)) {
      throw new Error(`Duplicate criterion name "${name}". Each criterion must be unique.`);
    }
    seenNames.add(lowerName);

    const maxScore = Number(item.maxScore) > 0 ? Math.floor(Number(item.maxScore)) : 10;
    const id = item.id && item.id.trim()
      ? item.id.trim()
      : `crit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    validatedCriteria.push({
      id,
      name,
      maxScore,
    });
  }

  const updated = await EvaluationConfig.findOneAndUpdate(
    { key: "global" },
    { $set: { criteria: validatedCriteria } },
    { upsert: true, new: true }
  ).lean();

  return {
    criteria: updated.criteria.map(c => ({
      id: c.id,
      name: c.name,
      maxScore: c.maxScore,
    })),
  };
}

