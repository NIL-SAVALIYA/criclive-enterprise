/**
 * Win Probability Engine
 * Business logic to calculate win probability percentage for Batting Team vs Bowling Team
 */

export function calculateWinProbability({
  inningsNumber,
  totalRuns,
  wickets,
  legalBalls,
  totalOvers = 20,
  targetRuns = null,
  battingTeamName = "Batting Team",
  bowlingTeamName = "Bowling Team"
}) {
  const totalMatchBalls = totalOvers * 6;
  const ballsRemaining = Math.max(0, totalMatchBalls - legalBalls);
  const wicketsInHand = Math.max(0, 10 - wickets);

  if (legalBalls === 0) {
    return {
      battingTeam: { name: battingTeamName, probability: 50 },
      bowlingTeam: { name: bowlingTeamName, probability: 50 },
      statusText: "Match starting (50/50)"
    };
  }

  let battingProb = 50;

  if (inningsNumber === 1) {
    // Innings 1 calculation: Par score estimation (e.g. 8 runs/over baseline = 160 runs for 20 overs)
    const crr = (totalRuns / legalBalls) * 6;
    const projectedFinalScore = totalRuns + (ballsRemaining / 6) * (crr > 0 ? (crr * 0.7 + 6.0 * 0.3) : 7.5);
    const parScore = totalOvers * 8; // e.g. 160 for T20

    // Wicket penalty: each wicket reduces expected final score
    const wicketFactor = (wicketsInHand / 10);
    const scoreRatio = (projectedFinalScore * wicketFactor) / parScore;

    battingProb = Math.round(50 * scoreRatio);
  } else {
    // Innings 2 calculation: Chasing target
    const target = targetRuns || 1;
    const runsNeeded = Math.max(0, target - totalRuns);

    if (runsNeeded === 0 || totalRuns >= target) {
      battingProb = 100;
    } else if (wicketsInHand === 0 || (ballsRemaining === 0 && runsNeeded > 0)) {
      battingProb = 0;
    } else {
      const reqRunRate = (runsNeeded / ballsRemaining) * 6;
      const currRunRate = (totalRuns / legalBalls) * 6;

      // Resource factor (Wickets in hand vs overs remaining ratio)
      const resourceWeight = (wicketsInHand / 10) * (ballsRemaining / totalMatchBalls);
      
      // Standard target difficulty metric
      if (reqRunRate <= 6) {
        battingProb = 75 + (10 - reqRunRate) * 3;
      } else if (reqRunRate <= 10) {
        battingProb = 60 - (reqRunRate - 6) * 7.5;
      } else if (reqRunRate <= 15) {
        battingProb = 30 - (reqRunRate - 10) * 4;
      } else {
        battingProb = Math.max(2, 10 - (reqRunRate - 15) * 2);
      }

      // Adjust for wickets remaining boost/penalty
      if (wicketsInHand >= 7) battingProb += 10;
      else if (wicketsInHand <= 3) battingProb -= 15;

      // Adjust for current run rate momentum
      if (currRunRate >= reqRunRate) battingProb += 5;
    }
  }

  // Clamp probability between 1% and 99% unless completed
  if (battingProb > 99 && totalRuns < (targetRuns || Infinity) && wicketsInHand > 0) battingProb = 99;
  if (battingProb < 1 && wicketsInHand > 0 && ballsRemaining > 0) battingProb = 1;

  battingProb = Math.min(100, Math.max(0, Math.round(battingProb)));
  const bowlingProb = 100 - battingProb;

  return {
    battingTeam: { name: battingTeamName, probability: battingProb },
    bowlingTeam: { name: bowlingTeamName, probability: bowlingProb },
    statusText: `${battingTeamName} ${battingProb}% vs ${bowlingTeamName} ${bowlingProb}%`
  };
}
