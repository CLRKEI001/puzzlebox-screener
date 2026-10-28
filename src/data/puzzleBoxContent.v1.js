// puzzleBoxContent.v1.js
//
// PuzzleBox Screener — content, Version 1.0
//
// This mirrors the paper "PuzzleBox Screener Record Book" item-for-item.
// It is deliberately NOT hard-coded into the screening components — every
// component that renders the screener (PuzzleBoxScreener.js) reads its
// sections/questions from a content object like this one, so that:
//
//   1. In Phase 5 (Admin Content Management) this same shape can be loaded
//      from Supabase tables (screener_versions / screener_sections /
//      screener_questions) instead of this file, with zero changes to the
//      screening UI.
//   2. Historical screenings can keep pointing at "version: 1.0" even after
//      an admin publishes 1.1, because each completed screening stores a
//      snapshot of the content version it was taken against
//      (see PuzzleBoxScreener.js — `content_version` + `content_snapshot`).
//
// IMPORTANT — scoring rules that are still being finalised by the
// psychologists are intentionally left as `null` / `needsConfirmation: true`
// rather than guessed. Per the dev requirements doc: "the system should not
// automatically make assumptions about any scoring rules that are still
// being finalised by the psychologists." The clearest example is the
// puzzle (item 1) score when a child goes over the 10-minute limit — the
// age-based time table below only covers *completed* attempts, so
// `overTimeScoreRule: null` until the psychologists confirm what an
// incomplete/over-time attempt should score.
//
// Attribution note: this content is transcribed from "The Puzzle Project —
// PuzzleBox Screener Record Book", which the record book itself credits in
// part to Dr R. Marais & Dr J. Jansen (2025). It's reproduced here only
// because digitising it *is* this project's brief, in direct collaboration
// with the psychologists who authored it — treat any changes to wording or
// scoring as something that needs their sign-off, same as the paper form.

export const PUZZLEBOX_CONTENT_VERSION = "1.0";

// Scoring types used across items:
//   "binary"     — 0 = Fail, 1 = Pass
//   "scale3"     — 0 = Fail, 1 = Pass, 2 = Passed Confidently (manual)
//   "age_table"  — teacher enters a raw value (time in seconds, or a count
//                  of correctly-identified items); the score (0/1/2) is
//                  looked up from the age-based table below. The raw value
//                  is always stored alongside the derived score.
//   "checklist"  — a set of sub-items the teacher ticks off; the *count*
//                  ticked feeds an age_table lookup (used for items 9 & 10).

export const DOMAINS = [
  { id: "cognitive", label: "Cognitive" },
  { id: "fine_motor", label: "Fine Motor" },
  { id: "language", label: "Language" },
  { id: "social", label: "Social" },
  { id: "emotional", label: "Emotional" },
  { id: "moral", label: "Moral" },
  { id: "attention", label: "Attention" },
];

// Helper: look up a score from one of the age tables below.
// `value` is a raw count or a time-in-seconds figure.
export function scoreFromAgeTable(table, age, value) {
  // Only ages with a table are scored. (It used to fall back to the age-6 rows
  // for any other age, giving a score against the wrong norms.)
  const rows = table[age];
  if (!rows) return null;
  for (const row of rows) {
    if (row.test(value)) return row.score;
  }
  return null;
}

const puzzleTimeTable = {
  5: [
    { score: 2, test: (s) => s < 6 * 60 },
    { score: 1, test: (s) => s <= 13 * 60 }, // 6-13 min
    { score: 0, test: () => true }, // >14 min
  ],
  6: [
    { score: 2, test: (s) => s < 5 * 60 },
    { score: 1, test: (s) => s <= 13 * 60 }, // 5-13 min (no gap after the 2-point band)
    { score: 0, test: () => true }, // >13 min
  ],
};

const grannyChecklistTable = {
  5: [
    { score: 2, test: (n) => n === 5 },
    { score: 1, test: (n) => [2, 3, 4].includes(n) },
    { score: 0, test: (n) => [0, 1].includes(n) },
  ],
  6: [
    { score: 2, test: (n) => n === 5 },
    { score: 1, test: (n) => [2, 3, 4].includes(n) },
    { score: 0, test: (n) => [0, 1].includes(n) },
  ],
};

const orangeThingsChecklistTable = {
  5: [
    { score: 2, test: (n) => n === 5 },
    { score: 1, test: (n) => [2, 3, 4].includes(n) },
    { score: 0, test: (n) => [0, 1].includes(n) },
  ],
  6: [
    { score: 1, test: (n) => [3, 4, 5].includes(n) },
    { score: 0, test: (n) => [0, 1, 2].includes(n) },
  ],
};

const stickTimeTable = {
  5: [
    { score: 2, test: (s) => s < 13 },
    { score: 1, test: (s) => s <= 36 },
    { score: 0, test: () => true },
  ],
  6: [
    { score: 2, test: (s) => s < 9 },
    { score: 1, test: (s) => s <= 32 },
    { score: 0, test: () => true },
  ],
};

export const puzzleBoxContentV1 = {
  version: PUZZLEBOX_CONTENT_VERSION,
  status: "published", // "draft" | "preview" | "published" — see Phase 5
  instructions:
    "Tick the circle that best indicates the child's performance.",
  scoringLegend: [
    { value: 0, label: "Fail" },
    { value: 1, label: "Pass" },
    { value: 2, label: "Passed Confidently" },
  ],
  sections: [
    {
      id: "sec_puzzle",
      domain: "cognitive",
      title: "1. The Puzzle",
      description:
        "Starting position: hands on table. Put the puzzle pieces in front of the child and say: \"Complete the puzzle in the frame.\"",
      isPuzzleTimerSection: true, // PuzzleBoxScreener.js hooks the timer to this section
      questions: [
        {
          id: "q1",
          label: "Puzzle completion",
          scoringType: "age_table",
          valueUnit: "seconds",
          ageTable: puzzleTimeTable,
          overTimeScoreRule: null, // NOT YET CONFIRMED by psychologists — see file header
          needsConfirmation: true,
        },
        {
          id: "q1a",
          label: "1A. Planning",
          instruction:
            "1) Shows evidence of planning (turns pieces purposefully, organises by shape/colour, starts with corners/edges, sets small goals). 0) Shows poor planning (places pieces randomly, repeats errors, no clear strategy).",
          scoringType: "binary",
        },
        {
          id: "q1b",
          label: "1B. Attention: Staying Focused",
          instruction:
            "1) Maintains attention (stays engaged, returns to task after interruption). 0) Has difficulty maintaining attention (easily distracted, struggles to re-engage).",
          scoringType: "binary",
          domain: "attention",
        },
        {
          id: "q1c",
          label: "1C. Matching and Fitting Pieces",
          instruction:
            "1) Matches pieces effectively (uses shape/picture/colour cues, places accurately). 0) Struggles to match pieces (places incorrectly, ignores cues, forces pieces).",
          scoringType: "binary",
        },
        {
          id: "q1d",
          label: "1D. Logical Approach",
          instruction: "1) Logical order (completes a section before moving on). 0) Trial-and-error.",
          scoringType: "binary",
        },
        {
          id: "q1e",
          label: "1E. Self-Monitoring: Fixing Mistakes",
          instruction:
            "1) Notices when a piece doesn't fit, tries another, corrects mistakes, shows persistence. 0) Struggles to notice mistakes, gives up easily.",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_counting_position",
      domain: "cognitive",
      title: "2. Counting & Positioning",
      questions: [
        {
          id: "q2",
          label: "Identify the puzzle piece with oranges",
          instruction: "Put the puzzle piece in front of the child and ask: \"How many oranges are there all together?\"",
          toPass: "Count 10 oranges",
          scoringType: "binary",
        },
        {
          id: "q3",
          label: "Position — left",
          instruction: "Using the same puzzle piece, say: \"Put the puzzle piece to the left of the puzzle.\"",
          toPass: "Correct positioning",
          scoringType: "binary",
        },
        {
          id: "q4",
          label: "Position — right",
          instruction: "Put the puzzle piece in front of the child again and say: \"Put the puzzle piece to the right of the puzzle.\"",
          toPass: "Correct positioning",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_visual_discrimination",
      domain: "cognitive",
      title: "3. Visual Discrimination",
      questions: [
        {
          id: "q5",
          label: "Matching cold drinks",
          instruction: "Identify the two puzzle pieces with cold drinks and ask: \"Which two cold drinks look the same?\"",
          toPass: "Identifies cold drinks correctly",
          scoringType: "binary",
        },
        {
          id: "q6",
          label: "Counting mielies",
          instruction: "Point to the two puzzle pieces containing mielies and ask: \"Which container has four mielies?\"",
          toPass: "Identifies correct container",
          scoringType: "binary",
        },
        {
          id: "q7",
          label: "Counting sweets",
          instruction: "Point to the puzzle pieces containing sweets and ask: \"Which bag has the most sweets?\"",
          toPass: "Identifies correct bag",
          scoringType: "binary",
        },
        {
          id: "q8",
          label: "Find the red apples",
          instruction: "\"Find all the red apples in the puzzle.\"",
          toPass: "Find all five red apples",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_memory_observation",
      domain: "cognitive",
      title: "4. Memory & Observation",
      questions: [
        {
          id: "q9",
          label: "Difference between the two grannies",
          instruction: "Ask the child: \"What is the difference between the two grannies — in which way do they not look the same?\"",
          scoringType: "checklist",
          checklistOptions: ["missing sleeve", "different shoes", "spoon shorter", "scarf on head", "missing nose"],
          ageTable: grannyChecklistTable,
        },
        {
          id: "q10",
          label: "Name the orange things",
          instruction:
            "Look for all the orange things/objects in the picture and assist the child to find them (dress of girl, pumpkin, carrots, oranges, cold drink, pineapple, granny's head scarf). Say: \"I want you to remember them all because I'm going to cover them up.\" Cover the puzzle and say: \"Name all the orange things you saw.\"",
          scoringType: "checklist",
          checklistOptions: ["dress girl", "pumpkin", "carrots", "oranges", "cold drink"],
          ageTable: orangeThingsChecklistTable,
        },
        {
          id: "q11",
          label: "Fruit next to the fire",
          instruction: "Cover the puzzle and ask: \"Can you remember which fruit is next to the fire?\"",
          toPass: "Correctly identifies the apple",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_sequencing",
      domain: "cognitive",
      title: "5. Sequencing",
      questions: [
        {
          id: "q12",
          label: "Pumpkin growth sequence",
          instruction:
            "Take the bottom row of puzzle pieces and place them in front of the child in the order: 1) plant, 2) pumpkin, 3) seeds, 4) watering can. Ask the child: \"Put the four puzzle pieces into an order to show how the pumpkin grows.\"",
          toPass: "Place in order: 1) Seeds, 2) Watering Can, 3) Plant, 4) Pumpkin",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_language",
      domain: "language",
      title: "6. Language",
      questions: [
        {
          id: "q13",
          label: "Tell a story about the puzzle",
          instruction: "Show the child the puzzle and ask: \"Can you tell me a story about this puzzle picture?\"",
          toPass: "Provide at least three four-word sentences describing the picture",
          scoringType: "binary",
        },
        {
          id: "q13a",
          label: "13A. Use of verb",
          instruction: "0) None. 1) Use of one or more verbs.",
          scoringType: "binary",
        },
        {
          id: "q13b",
          label: "13B. Use of adjective",
          instruction: "0) None. 1) Use of one or more adjectives.",
          scoringType: "binary",
        },
        {
          id: "q13c",
          label: "13C. Use of conjunction",
          instruction: "0) None. 1) Use of one or more conjunctions (two ideas linked in one sentence).",
          scoringType: "binary",
        },
        {
          id: "q14",
          label: "Shop at night / during the day",
          instruction: "Point at the relevant object and ask: \"How will the shop look at night?\" and \"What does the shop look like during the day?\"",
          toPass: "Both must be correct",
          scoringType: "binary",
        },
        {
          id: "q15",
          label: "Describe a potato / bicycle",
          instruction: "\"Tell me what do you know about a potato?\" and \"Tell me what do you know about a bicycle?\"",
          toPass: "Both must be correct — 1 characteristic required for each",
          scoringType: "binary",
        },
        { 
          id: "q16",
          label: "Sentence repetition — shop",
          instruction: "Point to the boy and say: \"Repeat the following sentence: 'The boy would like to buy sweets from the shop.'\"",
          toPass: "Repeated the sentence correctly",
          scoringType: "binary",
        },
        {
          id: "q17",
          label: "Sentence repetition — grannies",
          instruction: "Point to the grannies and say: \"Repeat the following sentence: 'The grannies took the salt and added it to the boiling pap.'\"",
          toPass: "Repeated the sentence correctly",
          scoringType: "binary",
        },
        {
          id: "q18",
          label: "Recall the shopping list",
          instruction:
            "Point to the puzzle and describe the shop, then the boy sent to buy a list of things. Cover the puzzle and say: \"I'm going to read a list of things he needs to buy. Try and remember everything on the list: onions, apples, potatoes, cold drinks, oranges.\"",
          toPass: "Recall all 5 objects",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_fine_motor",
      domain: "fine_motor",
      title: "7. Fine Motor",
      questions: [
        {
          id: "q19",
          label: "Fence sticks (speed)",
          instruction:
            "Point to the holes in the frame and tell the story: \"Let us put a fence up to protect the shop from the cows and goats. Let me show you.\" Remove the sticks, give the child ten sticks and say: \"Now you do it as quickly as you can.\"",
          scoringType: "age_table",
          valueUnit: "seconds",
          ageTable: stickTimeTable,
        },
        {
          id: "q20",
          label: "Draw a bicycle",
          instruction: "Point at the bicycle in the puzzle picture. Cover the puzzle and ask the child: \"Draw a bicycle here.\"",
          toPass: "Child must draw a recognisable drawing (5 features)",
          scoringType: "binary",
        },
        {
          id: "q21",
          label: "Write your name",
          instruction: "Provide a whiteboard marker and say: \"Write your name here.\"",
          toPass:
            "Task completion (first name). Letter formation well defined & recognisable, no reversals. Capital & small letters acceptable.",
          scoringType: "binary",
        },
        {
          id: "q22",
          label: "Maze — dog to robber",
          instruction:
            "Place the perspex sheet on the puzzle and give the marker to the child. Say: \"Help the dog catch the robber. Draw a line from the dog between the bicycles around the man to the robber. Don't let your line touch any people or things in the puzzle.\"",
          toPass: "Line did not touch any person or object; no marker lift and no turn of direction or perspex sheet",
          scoringType: "binary",
        },
        {
          id: "q23",
          label: "Draw a circle around the bird",
          instruction: "\"Draw a circle around the bird.\"",
          toPass: "Round circle, ends that meet and do not overlap",
          scoringType: "binary",
        },
        {
          id: "q24",
          label: "Replicate the security-gate pattern",
          instruction:
            "Give the child six sticks. Demonstrate the pattern (/// X) and say: \"Use the sticks to make a security gate for the shop. The gate must look like this one here.\"",
          toPass: "Replicate pattern correctly",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_emotion",
      domain: "emotional",
      title: "8. Emotion Recognition",
      questions: [
        {
          id: "q25",
          label: "Identify happy / sad / cross",
          instruction: "\"Show me the person that is happy.\" \"Show me who looks sad.\" \"Show me the person that is cross.\"",
          toPass: "All three must be correct",
          scoringType: "binary",
        },
        {
          id: "q26",
          label: "Understanding others' feelings",
          instruction:
            "\"Why is the man cross?\" \"How is the lady in the pink dress feeling?\" \"How will the grannies feel after working all day at the shop?\"",
          toPass: "All three must be correct",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_social",
      domain: "social",
      title: "9. Social Problem-Solving",
      questions: [
        {
          id: "q27",
          label: "Granny drops the oranges",
          instruction: "\"If the granny drops a bowl of oranges, and some fall on the floor, what could the boy do to help the granny?\"",
          toPass: "Child suggests and understands socially acceptable ways to resolve the problem",
          scoringType: "binary",
        },
        {
          id: "q28",
          label: "Playing with the dog",
          instruction: "\"The boy wants to play with the dog, but he is not sure if he is allowed to. What could the boy do?\"",
          toPass: "e.g. ask permission from the owner to touch the dog",
          scoringType: "binary",
        },
        {
          id: "q29",
          label: "Sharing the last cold drink",
          instruction: "\"If the boy and his friend go to the shop to buy a cold drink but there is only one left, what is the best thing for them to do?\"",
          toPass: "Acceptable answers: share, offer an alternative",
          scoringType: "binary",
        },
        {
          id: "q31",
          label: "Bumping into the lady",
          instruction: "\"What would you do if you bumped into the lady carrying her groceries?\"",
          toPass: "Child must verbalise a socially acceptable resolution (e.g. say sorry, help her)",
          scoringType: "binary",
        },
      ],
    },
    {
      id: "sec_moral",
      domain: "moral",
      title: "10. Perspective-Taking & Self",
      questions: [
        {
          id: "q30",
          label: "The robber's thoughts",
          instruction: "\"The mother sees the robber and thinks that he is going to steal her shoe. What do you think the robber is thinking and why?\"",
          toPass: "Relevant thoughts different to the mother's, with a logical reason",
          scoringType: "binary",
        },
        {
          id: "q32",
          label: "Tell me about yourself",
          instruction: "\"See this boy, he is kind, he works hard and he is a very good soccer player. Can you tell me more about you?\"",
          toPass: "The child can share three characteristics about themselves",
          scoringType: "binary",
        },
      ],
    },
  ],
};

// Interpretation bands from the record book's Scoring & Interpretation page.
// Used for the summary once a screening is completed — not for per-item scoring.
export const interpretationBands = {
  5: [
    { band: "on_track", min: 30, label: "On Track (≥75th percentile)" },
    { band: "progressing", min: 25, max: 29, label: "Progressing (50th–74th percentile)" },
    { band: "concerns", max: 24, label: "Developmental Concerns (<50th percentile)" },
  ],
  6: [
    { band: "on_track", min: 33, label: "On Track (≥75th percentile)" },
    { band: "progressing", min: 27, max: 32, label: "Progressing (50th–74th percentile)" },
    { band: "concerns", max: 26, label: "Developmental Concerns (<50th percentile)" },
  ],
};