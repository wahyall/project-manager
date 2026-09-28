const PHASES = [
  "planning",
  "preparation",
  "marketing",
  "execution",
  "evaluation",
];

const PHASE_LABELS = {
  planning: "Planning",
  preparation: "Preparation",
  marketing: "Marketing",
  execution: "Execution",
  evaluation: "Evaluation",
};

// Which event date field a phase's relative offset counts from.
// Evaluation happens after the event ends, everything else counts
// from the start (including Execution, usually offset 0 = hari-H).
const PHASE_ANCHOR = {
  planning: "startDate",
  preparation: "startDate",
  marketing: "startDate",
  execution: "startDate",
  evaluation: "endDate",
};

module.exports = { PHASES, PHASE_LABELS, PHASE_ANCHOR };
