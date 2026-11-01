import connectToDatabase from "@/lib/mongodb";
import SystemSetting from "@/models/SystemSetting";
import SheetSource, { ISheetSource } from "@/models/SheetSource";

export const ACTIVE_EVENT_KEY = "global_active_event";

/**
 * Returns the currently active event's ID (as a string) from MongoDB.
 * If none has been configured yet, initializes it to the default SheetSource (or first source)
 * and safely writes the record to MongoDB.
 */
export async function getActiveEventId(): Promise<string | null> {
  await connectToDatabase();

  // 1. Check persistent SystemSetting collection
  const setting = await SystemSetting.findOne({ key: ACTIVE_EVENT_KEY }).lean();
  if (setting && setting.value) {
    const exists = await SheetSource.findById(setting.value).lean();
    if (exists && exists.isActive !== false) {
      return String(setting.value);
    }
  }

  // 2. Check SheetSource with isGloballyActive: true
  const activeSource = await SheetSource.findOne({ isGloballyActive: true }).lean();
  if (activeSource && activeSource.isActive !== false) {
    await SystemSetting.findOneAndUpdate(
      { key: ACTIVE_EVENT_KEY },
      { value: String(activeSource._id), metadata: { eventName: activeSource.name } },
      { upsert: true, new: true }
    );
    return String(activeSource._id);
  }

  // 3. Fallback to default SheetSource (isDefault: true) or first active SheetSource
  const defaultSource = await SheetSource.findOne({
    $or: [{ isDefault: true }, { isActive: true }],
  })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();

  if (defaultSource) {
    const defaultId = String(defaultSource._id);
    await SystemSetting.findOneAndUpdate(
      { key: ACTIVE_EVENT_KEY },
      { value: defaultId, metadata: { eventName: defaultSource.name } },
      { upsert: true, new: true }
    );
    await SheetSource.updateMany({}, { $set: { isGloballyActive: false } });
    await SheetSource.updateOne({ _id: defaultSource._id }, { $set: { isGloballyActive: true } });
    return defaultId;
  }

  return null;
}

/**
 * Returns the full active SheetSource document from MongoDB.
 */
export async function getActiveEventSource(): Promise<ISheetSource | null> {
  const activeId = await getActiveEventId();
  if (!activeId) return null;
  return SheetSource.findById(activeId).lean() as Promise<ISheetSource | null>;
}

/**
 * Atomically sets the global active event in MongoDB (SystemSetting + SheetSource).
 */
export async function setActiveEventId(eventId: string): Promise<ISheetSource> {
  await connectToDatabase();

  const source = await SheetSource.findById(eventId);
  if (!source) {
    throw new Error("Specified spreadsheet/event source does not exist.");
  }

  if (source.isActive === false) {
    throw new Error("Cannot set a deactivated spreadsheet source as the active event.");
  }

  // 1. Update persistent SystemSetting document
  await SystemSetting.findOneAndUpdate(
    { key: ACTIVE_EVENT_KEY },
    { value: String(source._id), metadata: { eventName: source.name } },
    { upsert: true, new: true }
  );

  // 2. Update SheetSource collection: ensure exactly one source has isGloballyActive: true
  await SheetSource.updateMany({}, { $set: { isGloballyActive: false } });
  source.isGloballyActive = true;
  await source.save();

  return source;
}

