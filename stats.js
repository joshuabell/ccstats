#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Helper to calculate stats from days array
function calculateStats(days) {
  if (!days || days.length === 0) {
    return {
      totalCost: 0,
      totalTokens: 0,
      averageCost: 0,
      averageTokens: 0,
      dayCount: 0
    };
  }

  const totalCost = days.reduce((sum, day) => sum + (day.totalCost || 0), 0);
  const totalTokens = days.reduce((sum, day) => sum + (day.totalTokens || 0), 0);

  return {
    totalCost,
    totalTokens,
    averageCost: totalCost / days.length,
    averageTokens: totalTokens / days.length,
    dayCount: days.length
  };
}

// Helper to calculate streaks
function calculateStreaks(days) {
  if (days.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const lastDay = new Date(days[days.length - 1].date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastDayTime = new Date(lastDay).setHours(0, 0, 0, 0);
  const isActiveStreak = lastDayTime === today.getTime() || lastDayTime === yesterday.getTime();

  for (let i = 1; i < days.length; i++) {
    const prevDay = new Date(days[i - 1].date);
    const currDay = new Date(days[i].date);
    prevDay.setHours(0, 0, 0, 0);
    currDay.setHours(0, 0, 0, 0);

    const diffDays = Math.round((currDay - prevDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  if (isActiveStreak) {
    currentStreak = tempStreak;
  }

  return { currentStreak, longestStreak };
}

// Helper to calculate period stats
function calculatePeriodStats(days, startDate) {
  const periodDays = days.filter(day => {
    const dayDate = new Date(day.date);
    return dayDate >= startDate;
  });

  return calculateStats(periodDays);
}

// Process ccusage data
function processUsageData(ccusageData, existingDays = []) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Convert existing days to map for easy lookup
  const daysMap = {};
  existingDays.forEach(day => {
    const dateKey = new Date(day.date).toISOString().split('T')[0];
    daysMap[dateKey] = day;
  });

  // Process incoming usage data
  // ccusage outputs data.daily, not data.usage.days
  const dailyData = ccusageData.daily || ccusageData.usage?.days || [];
  dailyData.forEach(dayData => {
    const dateKey = dayData.date;
    daysMap[dateKey] = {
      date: dayData.date,
      totalCost: dayData.totalCost || 0,
      totalTokens: dayData.totalTokens || 0,
      inputTokens: dayData.inputTokens || 0,
      outputTokens: dayData.outputTokens || 0,
      cacheTokens: dayData.cacheCreationTokens || dayData.cacheTokens || 0
    };
  });

  // Convert back to sorted array
  const days = Object.values(daysMap).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  // Calculate all metrics
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const weeklyStats = calculatePeriodStats(days, weekStart);
  const monthlyStats = calculatePeriodStats(days, monthStart);
  const yearlyStats = calculatePeriodStats(days, yearStart);
  const lifetimeStats = calculateStats(days);
  const streaks = calculateStreaks(days);

  // Calculate highest day/week/month
  let highestDay = { totalCost: 0, totalTokens: 0, date: null };
  days.forEach(day => {
    if (day.totalCost > highestDay.totalCost) {
      highestDay = {
        totalCost: day.totalCost,
        totalTokens: day.totalTokens,
        date: day.date
      };
    }
  });

  // Calculate weekly aggregates
  const weeklyAggregates = {};
  days.forEach(day => {
    const date = new Date(day.date);
    const weekNum = getWeekNumber(date);
    const year = date.getFullYear();
    const key = `${year}-W${weekNum}`;

    if (!weeklyAggregates[key]) {
      weeklyAggregates[key] = { totalCost: 0, totalTokens: 0 };
    }
    weeklyAggregates[key].totalCost += day.totalCost || 0;
    weeklyAggregates[key].totalTokens += day.totalTokens || 0;
  });

  let highestWeek = { totalCost: 0, totalTokens: 0 };
  Object.values(weeklyAggregates).forEach(week => {
    if (week.totalCost > highestWeek.totalCost) {
      highestWeek = week;
    }
  });

  // Calculate monthly aggregates
  const monthlyAggregates = {};
  days.forEach(day => {
    const date = new Date(day.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyAggregates[key]) {
      monthlyAggregates[key] = { totalCost: 0, totalTokens: 0 };
    }
    monthlyAggregates[key].totalCost += day.totalCost || 0;
    monthlyAggregates[key].totalTokens += day.totalTokens || 0;
  });

  let highestMonth = { totalCost: 0, totalTokens: 0 };
  Object.values(monthlyAggregates).forEach(month => {
    if (month.totalCost > highestMonth.totalCost) {
      highestMonth = month;
    }
  });

  // Calculate daily velocity (avg of last 7 days)
  const recentDays = days.slice(-7);
  const dailyVelocity = recentDays.length > 0 ? {
    totalCost: recentDays.reduce((sum, day) => sum + (day.totalCost || 0), 0) / recentDays.length,
    totalTokens: recentDays.reduce((sum, day) => sum + (day.totalTokens || 0), 0) / recentDays.length
  } : { totalCost: 0, totalTokens: 0 };

  return {
    days,
    stats: {
      lifetime: lifetimeStats,
      yearly: yearlyStats,
      monthly: monthlyStats,
      weekly: weeklyStats,
      daily: dailyVelocity,
      highest: {
        day: highestDay,
        week: highestWeek,
        month: highestMonth
      },
      streaks: streaks,
      lastUpdated: now.toISOString()
    }
  };
}

// Helper to get week number
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

// Run ccusage and get JSON output
async function runCCUsage() {
  return new Promise((resolve, reject) => {
    exec('npx ccusage --json', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running ccusage:', stderr);
        reject(error);
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (e) {
        console.error('Failed to parse ccusage output:', stdout);
        reject(new Error('Failed to parse ccusage output'));
      }
    });
  });
}

// Load .env file (simple key=value parser, no dependency needed)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fsSync.existsSync(envPath)) {
    throw new Error(
      'No .env file found. Run "npm run setup" first to register this machine.'
    );
  }
  const content = fsSync.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) env[key] = value;
  }
  if (!env.MACHINE_ID) {
    throw new Error(
      'MACHINE_ID not set in .env. Run "npm run setup" to register this machine.'
    );
  }
  return env;
}

// Write this machine's snapshot to data/machines/{machineId}.json
async function writeMachineFile(machineId, machineName, days) {
  const machinesDir = path.join(__dirname, 'data', 'machines');
  await fs.mkdir(machinesDir, { recursive: true });
  const filePath = path.join(machinesDir, `${machineId}.json`);
  const data = {
    machineId,
    machineName,
    lastUpdated: new Date().toISOString(),
    days
  };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

// Read all machine snapshot files from data/machines/
async function readAllMachineFiles() {
  const machinesDir = path.join(__dirname, 'data', 'machines');
  let files;
  try {
    files = await fs.readdir(machinesDir);
  } catch {
    return [];
  }
  const machines = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(machinesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    machines.push(JSON.parse(content));
  }
  return machines;
}

// Aggregate daily data across all machines (sum per date)
function aggregateMachineData(machineFiles) {
  const daysMap = {};
  for (const machine of machineFiles) {
    for (const day of machine.days || []) {
      const dateKey = day.date;
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = {
          date: dateKey,
          totalCost: 0,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheTokens: 0
        };
      }
      daysMap[dateKey].totalCost += day.totalCost || 0;
      daysMap[dateKey].totalTokens += day.totalTokens || 0;
      daysMap[dateKey].inputTokens += day.inputTokens || 0;
      daysMap[dateKey].outputTokens += day.outputTokens || 0;
      daysMap[dateKey].cacheTokens += day.cacheTokens || 0;
    }
  }
  return Object.values(daysMap).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Pull latest from git (non-fatal on failure)
async function gitPull() {
  return new Promise((resolve) => {
    exec('git pull --rebase', (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  git pull failed (offline or no remote). Continuing with local data.\n');
      }
      resolve();
    });
  });
}

// Main function
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   Claude Code Usage Analytics - Data Upload          ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Load machine identity from .env
    const env = loadEnv();
    const machineId = env.MACHINE_ID;
    const machineName = env.MACHINE_NAME || 'unknown';
    console.log(`🖥️  Machine: ${machineName} (${machineId.slice(0, 8)}...)\n`);

    // Step 2: Pull latest data from other machines
    console.log('🔄 Pulling latest data from remote...\n');
    await gitPull();

    // Paths
    const dataDir = path.join(__dirname, 'data');
    const statsFile = path.join(dataDir, 'stats.json');
    const daysFile = path.join(dataDir, 'days.json');
    await fs.mkdir(dataDir, { recursive: true });

    // Step 3: Collect this machine's usage data
    console.log('📊 Running ccusage to collect usage data...\n');
    const ccusageData = await runCCUsage();

    // Step 4: Normalize ccusage output into standard day format
    console.log('⚙️  Processing usage data...\n');
    const machineResult = processUsageData(ccusageData, []);

    // Step 5: Write this machine's snapshot (idempotent overwrite)
    const machineFile = await writeMachineFile(machineId, machineName, machineResult.days);
    console.log(`✓ Machine snapshot saved: ${path.basename(machineFile)}`);
    console.log(`  (${machineResult.days.length} days of data)\n`);

    // Step 6: Read all machine snapshots and aggregate
    const allMachines = await readAllMachineFiles();
    console.log(`📡 Aggregating data from ${allMachines.length} machine(s):`);
    for (const m of allMachines) {
      const isThis = m.machineId === machineId ? ' (this machine)' : '';
      console.log(`   - ${m.machineName || m.machineId.slice(0, 8)} [${(m.days || []).length} days]${isThis}`);
    }
    console.log('');

    // Step 7: Sum daily data across all machines
    const aggregatedDays = aggregateMachineData(allMachines);

    // Step 8: Compute final stats from aggregated data
    const finalResult = processUsageData({ daily: aggregatedDays }, []);

    // Step 9: Save aggregated outputs
    await fs.writeFile(statsFile, JSON.stringify(finalResult.stats, null, 2));
    await fs.writeFile(daysFile, JSON.stringify(finalResult.days, null, 2));

    console.log('✅ Success! Data files updated:\n');
    console.log(`   📄 ${statsFile}`);
    console.log(`   📄 ${daysFile}\n`);

    console.log('📈 Aggregated Stats:');
    console.log(`   Total Cost: $${finalResult.stats.lifetime.totalCost?.toFixed(2) || '0.00'}`);
    console.log(`   Total Tokens: ${finalResult.stats.lifetime.totalTokens?.toLocaleString() || '0'}`);
    console.log(`   Days Active: ${finalResult.stats.lifetime.dayCount || 0}`);
    console.log(`   Current Streak: ${finalResult.stats.streaks.currentStreak || 0} days`);
    console.log(`   Longest Streak: ${finalResult.stats.streaks.longestStreak || 0} days\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Next steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Push: npm run push');
    console.log('  3. View your dashboard (GitHub Pages will auto-deploy)\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
