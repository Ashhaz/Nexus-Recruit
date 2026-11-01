import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import SheetSource from "@/models/SheetSource";
import { getActiveEventId } from "@/lib/activeEvent";
import { getAuthSession } from "@/lib/auth";

/**
 * Resolves the genuine historical registration date for an applicant.
 * Prioritizes the Google Form / spreadsheet timestamp captured in responses,
 * with fallbacks to evaluation timestamps and creation timestamps.
 */
function getApplicantRegistrationDate(app: any): Date | null {
  if (!app) return null;

  const responses = app.responses instanceof Map
    ? Object.fromEntries(app.responses)
    : (app.responses || {});

  let rawDateValue: any = null;
  for (const [key, val] of Object.entries(responses)) {
    if (!val) continue;
    const lowerKey = key.trim().toLowerCase();
    if (
      lowerKey === "timestamp" ||
      lowerKey === "submission date" ||
      lowerKey === "submitted at" ||
      lowerKey === "registration date" ||
      lowerKey === "registered at" ||
      lowerKey === "date"
    ) {
      rawDateValue = val;
      break;
    }
  }

  if (rawDateValue && typeof rawDateValue === "string") {
    const trimmed = rawDateValue.trim();

    // Check for DD/MM/YYYY or DD/MM/YYYY HH:mm:ss format
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);
      const hh = parseInt(dmyMatch[4] || "0", 10);
      const mm = parseInt(dmyMatch[5] || "0", 10);
      const ss = parseInt(dmyMatch[6] || "0", 10);

      let day = p1;
      let month = p2 - 1;
      if (p1 <= 12 && p2 > 12) {
        day = p2;
        month = p1 - 1;
      }
      const d = new Date(y, month, day, hh, mm, ss);
      if (!isNaN(d.getTime())) return d;
    }

    // Check for YYYY-MM-DD or ISO format
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // Direct Date parse
    const generic = new Date(trimmed);
    if (!isNaN(generic.getTime())) return generic;
  }

  // Fallback: evaluation submittedAt
  if (app.evaluation?.submittedAt) {
    const d = new Date(app.evaluation.submittedAt);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: createdAt
  if (app.createdAt) {
    const d = new Date(app.createdAt);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (session.role === "unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized: Please sign in." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Administrator access required." }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    let eventId = searchParams.get("eventId");
    if (!eventId || eventId === "active") {
      eventId = await getActiveEventId();
    } else if (eventId === "default") {
      const defaultSource = await SheetSource.findOne({
        $or: [{ isDefault: true }, { spreadsheetId: process.env.GOOGLE_SHEET_ID }, { name: "Primary Registration Sheet" }],
      }).lean();
      if (defaultSource) {
        eventId = String(defaultSource._id);
      }
    }

    const departmentFilter = searchParams.get("department");
    const interviewerFilter = searchParams.get("interviewer");
    const statusFilter = searchParams.get("status");
    const dateRange = searchParams.get("dateRange") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const granularity = searchParams.get("granularity") || "daily"; // daily, weekly, monthly

    // Base query for event scoping
    const baseEventQuery: Record<string, any> = {};
    if (eventId && eventId !== "all") {
      const defaultSource = await SheetSource.findOne({
        $or: [{ isDefault: true }, { spreadsheetId: process.env.GOOGLE_SHEET_ID }, { name: "Primary Registration Sheet" }],
      }).lean();

      if (defaultSource && String(defaultSource._id) === eventId) {
        // For the primary / default event, match its eventId and include any unlinked/legacy applicants
        baseEventQuery.$or = [
          { eventId: eventId },
          { eventId: "default" },
          { eventId: "" },
          { eventId: null },
          { eventId: { $exists: false } },
          { source: defaultSource.name },
          { sourceId: String(defaultSource._id) },
        ];
      } else {
        baseEventQuery.eventId = eventId;
      }
    }

    // Build filtered query for standard fields
    const filterQuery: Record<string, any> = { ...baseEventQuery };

    if (departmentFilter && departmentFilter !== "all") {
      filterQuery.department = departmentFilter;
    }
    if (interviewerFilter && interviewerFilter !== "all") {
      filterQuery.assignedInterviewer = { $regex: new RegExp(`^${interviewerFilter.trim()}$`, "i") };
    }
    if (statusFilter && statusFilter !== "all") {
      filterQuery.interviewStatus = statusFilter;
    }

    // Fetch distinct filter options scoped to current event (unfiltered by other dropdowns)
    const [allDepartments, allInterviewers] = await Promise.all([
      Applicant.distinct("department", baseEventQuery),
      Applicant.distinct("assignedInterviewer", baseEventQuery),
    ]);

    const sanitizedDepts = allDepartments.filter((d: string) => d && d.trim().length > 0).sort();
    const sanitizedInterviewers = allInterviewers.filter((i: string) => i && i.trim().length > 0).sort();

    // Fetch all matching applicants for in-depth metrics and accurate calculations (including responses for timestamps)
    const rawApplicants = await Applicant.find(filterQuery)
      .select("name rollNumber department branch year interviewStatus assignedRoom assignedInterviewer interviewDuration finalDecision interviewNotes evaluation createdAt updatedAt eventId sourceId source responses")
      .lean();

    // Filter applicants by effective registration date if a date range filter is active
    let applicants = rawApplicants;
    if (dateRange !== "all") {
      const now = new Date();
      let rangeStart: Date | null = null;
      let rangeEnd: Date | null = null;

      if (dateRange === "7d") {
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "30d") {
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "90d") {
        rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (dateRange === "custom") {
        if (startDate) rangeStart = new Date(startDate);
        if (endDate) {
          rangeEnd = new Date(endDate);
          rangeEnd.setHours(23, 59, 59, 999);
        }
      }

      applicants = rawApplicants.filter((app: any) => {
        const appDate = getApplicantRegistrationDate(app);
        if (!appDate) return false;
        if (rangeStart && appDate < rangeStart) return false;
        if (rangeEnd && appDate > rangeEnd) return false;
        return true;
      });
    }

    const total = applicants.length;
    let waiting = 0;
    let interviewing = 0;
    let approved = 0;
    let pending = 0;
    let discussionNeeded = 0;

    let totalDurationSeconds = 0;
    let durationCount = 0;

    const deptMap: Record<string, { count: number; approved: number }> = {};
    const statusMap: Record<string, number> = {
      Waiting: 0,
      Interviewing: 0,
      Approved: 0,
      Pending: 0,
      "Discussion Needed": 0,
    };

    const interviewerStatsMap: Record<string, {
      name: string;
      assigned: number;
      completed: number;
      pending: number;
      approved: number;
      totalDuration: number;
      durationCount: number;
      scores: number[];
    }> = {};

    const criteriaStatsMap: Record<string, {
      label: string;
      totalScore: number;
      maxScore: number;
      count: number;
    }> = {};

    // Grouping by date for time-series trend
    const timeTrendMap: Record<string, { date: string; rawDate: Date; count: number }> = {};

    for (const app of applicants) {
      const st = app.interviewStatus || "Waiting";
      if (st === "Waiting") waiting++;
      else if (st === "Interviewing") interviewing++;
      else if (st === "Approved") approved++;
      else if (st === "Pending") pending++;
      else if (st === "Discussion Needed") discussionNeeded++;

      if (statusMap[st] !== undefined) {
        statusMap[st]++;
      } else {
        statusMap[st] = (statusMap[st] || 0) + 1;
      }

      // Department breakdown
      const deptName = (app.department || "Unassigned").trim();
      if (!deptMap[deptName]) {
        deptMap[deptName] = { count: 0, approved: 0 };
      }
      deptMap[deptName].count++;
      if (st === "Approved") {
        deptMap[deptName].approved++;
      }

      // Interview duration
      const dur = Number(app.interviewDuration);
      if (dur > 0) {
        totalDurationSeconds += dur;
        durationCount++;
      }

      // Interviewer performance
      const interviewer = (app.assignedInterviewer || "").trim();
      if (interviewer) {
        if (!interviewerStatsMap[interviewer]) {
          interviewerStatsMap[interviewer] = {
            name: interviewer,
            assigned: 0,
            completed: 0,
            pending: 0,
            approved: 0,
            totalDuration: 0,
            durationCount: 0,
            scores: [],
          };
        }
        const iStat = interviewerStatsMap[interviewer];
        iStat.assigned++;
        if (["Approved", "Pending", "Discussion Needed"].includes(st)) {
          iStat.completed++;
        }
        if (st === "Pending") iStat.pending++;
        if (st === "Approved") iStat.approved++;
        if (dur > 0) {
          iStat.totalDuration += dur;
          iStat.durationCount++;
        }

        // Compute candidate score out of 10 for this interviewer
        if (app.evaluation) {
          const evalObj = app.evaluation as any;
          if (Array.isArray(evalObj.criteriaSnapshot) && evalObj.criteriaSnapshot.length > 0) {
            const sum = evalObj.criteriaSnapshot.reduce((s: number, c: any) => s + (Number(c.score) || 0), 0);
            const max = evalObj.criteriaSnapshot.reduce((s: number, c: any) => s + (Number(c.maxScore) || 10), 0);
            if (max > 0) {
              iStat.scores.push((sum / max) * 10);
            }
          } else {
            const legacyKeys = ["technical", "communication", "confidence", "leadership", "teamwork"];
            const legacyScores = legacyKeys
              .map((k) => evalObj[k])
              .filter((v) => typeof v === "number");
            if (legacyScores.length > 0) {
              const sum = legacyScores.reduce((a: number, b: number) => a + b, 0);
              iStat.scores.push((sum / (legacyScores.length * 10)) * 10);
            }
          }
        }
      }

      // Dynamic Evaluation criteria breakdown
      if (app.evaluation) {
        const evalObj = app.evaluation as any;
        if (Array.isArray(evalObj.criteriaSnapshot) && evalObj.criteriaSnapshot.length > 0) {
          evalObj.criteriaSnapshot.forEach((cs: any) => {
            const key = (cs.label || cs.id || "Criterion").trim();
            const maxScore = Number(cs.maxScore) > 0 ? Number(cs.maxScore) : 10;
            const score = Number(cs.score) || 0;
            if (!criteriaStatsMap[key]) {
              criteriaStatsMap[key] = { label: key, totalScore: 0, maxScore, count: 0 };
            }
            criteriaStatsMap[key].totalScore += score;
            criteriaStatsMap[key].count++;
          });
        } else {
          // Legacy 5 criteria
          const legacyKeys = ["technical", "communication", "confidence", "leadership", "teamwork"];
          legacyKeys.forEach((k) => {
            if (typeof evalObj[k] === "number") {
              const label = k.charAt(0).toUpperCase() + k.slice(1);
              if (!criteriaStatsMap[label]) {
                criteriaStatsMap[label] = { label, totalScore: 0, maxScore: 10, count: 0 };
              }
              criteriaStatsMap[label].totalScore += evalObj[k];
              criteriaStatsMap[label].count++;
            }
          });
        }
      }

      // Time series grouping using genuine registration date
      const d = getApplicantRegistrationDate(app);
      if (d) {
        let timeKey = "";
        let normalizedDate: Date;

        if (granularity === "monthly") {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          timeKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
          normalizedDate = new Date(d.getFullYear(), d.getMonth(), 1);
        } else if (granularity === "weekly") {
          const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
          const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          timeKey = `Wk ${weekNum}, ${d.getFullYear()}`;
          normalizedDate = new Date(d.getFullYear(), 0, 1 + (weekNum - 1) * 7);
        } else {
          // Daily: YYYY-MM-DD
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          timeKey = `${year}-${month}-${day}`;
          normalizedDate = new Date(year, d.getMonth(), d.getDate());
        }

        if (!timeTrendMap[timeKey]) {
          timeTrendMap[timeKey] = { date: timeKey, rawDate: normalizedDate, count: 0 };
        }
        timeTrendMap[timeKey].count++;
      }
    }

    // Sort time trend chronologically
    const timeTrend = Object.values(timeTrendMap).sort(
      (a, b) => a.rawDate.getTime() - b.rawDate.getTime()
    );

    // Add cumulative count to time trend
    let runningTotal = 0;
    const timeTrendWithCumulative = timeTrend.map((item) => {
      runningTotal += item.count;
      return {
        date: item.date,
        count: item.count,
        cumulative: runningTotal,
      };
    });

    // Departments sorted by count descending
    const departmentDistribution = Object.entries(deptMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        approved: data.approved,
        percentage: total > 0 ? Number(((data.count / total) * 100).toFixed(1)) : 0,
        approvalRate: data.count > 0 ? Number(((data.approved / data.count) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Status distribution
    const statusDistribution = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }));

    // Interviewer performance list sorted by total assigned descending
    const interviewerPerformance = Object.values(interviewerStatsMap)
      .map((i) => {
        const avgScoreVal = i.scores.length > 0
          ? Number((i.scores.reduce((a, b) => a + b, 0) / i.scores.length).toFixed(1))
          : null;
        const avgDuration = i.durationCount > 0 ? Math.round(i.totalDuration / i.durationCount) : 0;
        const approvalRate = i.completed > 0 ? Number(((i.approved / i.completed) * 100).toFixed(1)) : 0;

        const mins = Math.floor(avgDuration / 60);
        const secs = avgDuration % 60;
        const formattedDuration = avgDuration > 0 ? `${mins}m ${secs}s` : "—";

        return {
          name: i.name,
          assigned: i.assigned,
          completed: i.completed,
          pending: i.pending,
          approved: i.approved,
          avgDurationSeconds: avgDuration,
          formattedDuration,
          avgScore: avgScoreVal,
          approvalRate,
        };
      })
      .sort((a, b) => b.assigned - a.assigned);

    // Evaluation criteria averages
    const evaluationCriteria = Object.values(criteriaStatsMap)
      .map((c) => {
        const avgScore = Number((c.totalScore / c.count).toFixed(1));
        const normalizedOutOf10 = Number(((c.totalScore / (c.count * c.maxScore)) * 10).toFixed(1));
        return {
          label: c.label,
          avgScore,
          maxScore: c.maxScore,
          normalizedOutOf10,
          evaluatedCount: c.count,
        };
      })
      .sort((a, b) => b.evaluatedCount - a.evaluatedCount);

    // Derived high-level metrics
    const completed = approved + pending + discussionNeeded;
    const approvalRate = completed > 0 ? Number(((approved / completed) * 100).toFixed(1)) : 0;
    const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

    const avgDuration = durationCount > 0 ? Math.round(totalDurationSeconds / durationCount) : 0;
    const avgDurationMins = Math.floor(avgDuration / 60);
    const avgDurationSecs = avgDuration % 60;
    const formattedAvgDuration = avgDuration > 0 ? `${avgDurationMins}m ${avgDurationSecs}s` : "0m 0s";

    // Funnel stages: Applied -> In Queue -> Active Interview -> Evaluated -> Approved
    const funnel = [
      { stage: "Total Applied", count: total, percentage: 100 },
      { stage: "In Queue", count: waiting, percentage: total > 0 ? Math.round((waiting / total) * 100) : 0 },
      { stage: "Interviewing", count: interviewing, percentage: total > 0 ? Math.round((interviewing / total) * 100) : 0 },
      { stage: "Evaluated", count: completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 },
      { stage: "Approved", count: approved, percentage: total > 0 ? Math.round((approved / total) * 100) : 0 },
    ];

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        overview: {
          total,
          waiting,
          interviewing,
          approved,
          pending,
          discussionNeeded,
        },
        insights: {
          completed,
          approvalRate,
          completionRate,
          avgDurationSeconds: avgDuration,
          formattedAvgDuration,
          funnel,
        },
        timeTrend: timeTrendWithCumulative,
        departmentDistribution,
        statusDistribution,
        interviewerPerformance,
        evaluationCriteria,
        filterOptions: {
          departments: sanitizedDepts,
          interviewers: sanitizedInterviewers,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/analytics Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
