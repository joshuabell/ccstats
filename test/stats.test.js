const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateStats,
  calculateStreaks,
  calculatePeriodStats,
  processUsageData,
  getWeekNumber,
  aggregateMachineData,
} = require("../stats");

describe("calculateStats", () => {
  it("returns zeros for empty array", () => {
    const result = calculateStats([]);
    assert.deepStrictEqual(result, {
      totalCost: 0,
      totalTokens: 0,
      averageCost: 0,
      averageTokens: 0,
      dayCount: 0,
    });
  });

  it("returns zeros for null input", () => {
    const result = calculateStats(null);
    assert.deepStrictEqual(result, {
      totalCost: 0,
      totalTokens: 0,
      averageCost: 0,
      averageTokens: 0,
      dayCount: 0,
    });
  });

  it("correctly sums and averages days", () => {
    const days = [
      { totalCost: 10, totalTokens: 100 },
      { totalCost: 20, totalTokens: 200 },
      { totalCost: 30, totalTokens: 300 },
    ];
    const result = calculateStats(days);
    assert.strictEqual(result.totalCost, 60);
    assert.strictEqual(result.totalTokens, 600);
    assert.strictEqual(result.averageCost, 20);
    assert.strictEqual(result.averageTokens, 200);
    assert.strictEqual(result.dayCount, 3);
  });

  it("handles missing fields with default zero", () => {
    const days = [{ totalCost: 10 }, { totalTokens: 200 }];
    const result = calculateStats(days);
    assert.strictEqual(result.totalCost, 10);
    assert.strictEqual(result.totalTokens, 200);
    assert.strictEqual(result.dayCount, 2);
  });
});

describe("calculateStreaks", () => {
  it("returns zeros for empty array", () => {
    const result = calculateStreaks([]);
    assert.deepStrictEqual(result, { currentStreak: 0, longestStreak: 0 });
  });

  it("detects a consecutive streak", () => {
    const days = [{ date: "2026-04-10" }, { date: "2026-04-11" }, { date: "2026-04-12" }, { date: "2026-04-13" }];
    const result = calculateStreaks(days);
    assert.strictEqual(result.longestStreak, 4);
  });

  it("tracks longest streak across gaps", () => {
    const days = [
      { date: "2026-04-01" },
      { date: "2026-04-02" },
      { date: "2026-04-03" },
      // gap
      { date: "2026-04-10" },
      { date: "2026-04-11" },
    ];
    const result = calculateStreaks(days);
    assert.strictEqual(result.longestStreak, 3);
  });

  it("detects current streak when last day is today", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const days = [
      { date: dayBefore.toISOString().split("T")[0] },
      { date: yesterday.toISOString().split("T")[0] },
      { date: today.toISOString().split("T")[0] },
    ];
    const result = calculateStreaks(days);
    assert.strictEqual(result.currentStreak, 3);
  });

  it("current streak is 0 when last day is old", () => {
    const days = [{ date: "2025-01-01" }, { date: "2025-01-02" }, { date: "2025-01-03" }];
    const result = calculateStreaks(days);
    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.longestStreak, 3);
  });
});

describe("calculatePeriodStats", () => {
  it("filters days after start date", () => {
    const days = [
      { date: "2026-04-01", totalCost: 10, totalTokens: 100 },
      { date: "2026-04-05", totalCost: 20, totalTokens: 200 },
      { date: "2026-04-10", totalCost: 30, totalTokens: 300 },
    ];
    const result = calculatePeriodStats(days, new Date("2026-04-04"));
    assert.strictEqual(result.totalCost, 50);
    assert.strictEqual(result.dayCount, 2);
  });

  it("returns zeros when no days match", () => {
    const days = [{ date: "2026-01-01", totalCost: 10, totalTokens: 100 }];
    const result = calculatePeriodStats(days, new Date("2026-06-01"));
    assert.strictEqual(result.totalCost, 0);
    assert.strictEqual(result.dayCount, 0);
  });
});

describe("getWeekNumber", () => {
  it("returns correct ISO week number for start of year", () => {
    // 2026-01-01 is a Thursday, ISO week 1
    assert.strictEqual(getWeekNumber(new Date("2026-01-01")), 1);
  });

  it("returns week 53 for years that have it", () => {
    // 2015-12-31 is a Thursday in ISO week 53
    assert.strictEqual(getWeekNumber(new Date("2015-12-31")), 53);
  });

  it("handles mid-year dates", () => {
    // 2026-07-01 is a Wednesday in week 27
    assert.strictEqual(getWeekNumber(new Date("2026-07-01")), 27);
  });
});

describe("processUsageData", () => {
  it("processes ccusage daily data format", () => {
    const ccusageData = {
      daily: [
        {
          date: "2026-04-01",
          totalCost: 10,
          totalTokens: 100,
          inputTokens: 50,
          outputTokens: 50,
          cacheCreationTokens: 20,
        },
        { date: "2026-04-02", totalCost: 20, totalTokens: 200, inputTokens: 100, outputTokens: 100, cacheTokens: 40 },
      ],
    };
    const result = processUsageData(ccusageData);
    assert.strictEqual(result.days.length, 2);
    assert.strictEqual(result.days[0].cacheTokens, 20);
    assert.strictEqual(result.days[1].cacheTokens, 40);
    assert.strictEqual(result.stats.lifetime.totalCost, 30);
    assert.strictEqual(result.stats.lifetime.dayCount, 2);
  });

  it("merges with existing days (incoming overwrites)", () => {
    const existing = [{ date: "2026-04-01", totalCost: 5, totalTokens: 50 }];
    const incoming = {
      daily: [
        { date: "2026-04-01", totalCost: 10, totalTokens: 100 },
        { date: "2026-04-02", totalCost: 20, totalTokens: 200 },
      ],
    };
    const result = processUsageData(incoming, existing);
    assert.strictEqual(result.days.length, 2);
    assert.strictEqual(result.days[0].totalCost, 10);
  });

  it("returns sorted days", () => {
    const data = {
      daily: [
        { date: "2026-04-03", totalCost: 30, totalTokens: 300 },
        { date: "2026-04-01", totalCost: 10, totalTokens: 100 },
        { date: "2026-04-02", totalCost: 20, totalTokens: 200 },
      ],
    };
    const result = processUsageData(data);
    assert.strictEqual(result.days[0].date, "2026-04-01");
    assert.strictEqual(result.days[1].date, "2026-04-02");
    assert.strictEqual(result.days[2].date, "2026-04-03");
  });

  it("handles empty input", () => {
    const result = processUsageData({});
    assert.strictEqual(result.days.length, 0);
    assert.strictEqual(result.stats.lifetime.totalCost, 0);
  });

  it("populates highest day stats", () => {
    const data = {
      daily: [
        { date: "2026-04-01", totalCost: 10, totalTokens: 100 },
        { date: "2026-04-02", totalCost: 50, totalTokens: 500 },
        { date: "2026-04-03", totalCost: 20, totalTokens: 200 },
      ],
    };
    const result = processUsageData(data);
    assert.strictEqual(result.stats.highest.day.totalCost, 50);
    assert.strictEqual(result.stats.highest.day.date, "2026-04-02");
  });
});

describe("aggregateMachineData", () => {
  it("sums daily data across machines", () => {
    const machines = [
      {
        machineId: "a",
        days: [
          { date: "2026-04-01", totalCost: 10, totalTokens: 100, inputTokens: 50, outputTokens: 50, cacheTokens: 20 },
        ],
      },
      {
        machineId: "b",
        days: [
          { date: "2026-04-01", totalCost: 5, totalTokens: 50, inputTokens: 25, outputTokens: 25, cacheTokens: 10 },
        ],
      },
    ];
    const result = aggregateMachineData(machines);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].totalCost, 15);
    assert.strictEqual(result[0].totalTokens, 150);
    assert.strictEqual(result[0].inputTokens, 75);
    assert.strictEqual(result[0].cacheTokens, 30);
  });

  it("handles different dates across machines", () => {
    const machines = [
      {
        machineId: "a",
        days: [
          { date: "2026-04-01", totalCost: 10, totalTokens: 100, inputTokens: 0, outputTokens: 0, cacheTokens: 0 },
        ],
      },
      {
        machineId: "b",
        days: [
          { date: "2026-04-02", totalCost: 20, totalTokens: 200, inputTokens: 0, outputTokens: 0, cacheTokens: 0 },
        ],
      },
    ];
    const result = aggregateMachineData(machines);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].date, "2026-04-01");
    assert.strictEqual(result[1].date, "2026-04-02");
  });

  it("handles machines with no days", () => {
    const machines = [{ machineId: "a", days: [] }, { machineId: "b" }];
    const result = aggregateMachineData(machines);
    assert.strictEqual(result.length, 0);
  });

  it("returns sorted results", () => {
    const machines = [
      {
        machineId: "a",
        days: [
          { date: "2026-04-03", totalCost: 30, totalTokens: 300, inputTokens: 0, outputTokens: 0, cacheTokens: 0 },
        ],
      },
      {
        machineId: "b",
        days: [
          { date: "2026-04-01", totalCost: 10, totalTokens: 100, inputTokens: 0, outputTokens: 0, cacheTokens: 0 },
        ],
      },
    ];
    const result = aggregateMachineData(machines);
    assert.strictEqual(result[0].date, "2026-04-01");
    assert.strictEqual(result[1].date, "2026-04-03");
  });
});
