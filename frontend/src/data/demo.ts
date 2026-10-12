import type { Caregiver, CaseReport } from "../types/domain";

// Synthetic Indian examples for local demo mode only; never live case data.
const demoUpdates = (entries: [string, string, string][]) =>
  entries.map(([kind, content, createdAt], index) => ({
    id: `demo-update-${index}-${createdAt}`,
    kind: kind as CaseReport["updates"][number]["kind"],
    content,
    createdAt,
    author: "Fictional demo response team",
  }));

export const DEMO_CASES: CaseReport[] = [
  {
    id: "demo-case-014",
    reference: "JV-2610-014",
    species: "Bird",
    animal: "Indian peafowl",
    condition: "Possible wing injury",
    description:
      "Bird moving slowly near a public walking path; one wing appears lowered. No attempt has been made to approach.",
    location: "Kothrud, Pune, Maharashtra",
    urgency: "urgent",
    status: "needs_triage",
    receivedAt: "2026-10-11T08:25:00+05:30",
    reporterName: "Example reporter 1",
    reporterEmail: "demo@example.org",
    evidence: [],
    updates: demoUpdates([
      [
        "report_submitted",
        "Fictional example report received for a safe field assessment.",
        "2026-10-11T08:25:00+05:30",
      ],
    ]),
  },
  {
    id: "demo-case-013",
    reference: "JV-2610-013",
    species: "Dog",
    animal: "Community dog",
    condition: "Signs of dehydration",
    description:
      "Seen near a public transit stop on several mornings. Water was left nearby; the animal remains wary.",
    location: "Aundh, Pune, Maharashtra",
    urgency: "high",
    status: "awaiting_assignment",
    receivedAt: "2026-10-11T07:40:00+05:30",
    reporterName: "Example reporter 2",
    reporterEmail: "demo@example.org",
    evidence: [],
    updates: demoUpdates([
      [
        "report_submitted",
        "Fictional example awaiting a caregiver familiar with the area.",
        "2026-10-11T07:40:00+05:30",
      ],
    ]),
  },
  {
    id: "demo-case-012",
    reference: "JV-2610-012",
    species: "Cow / cattle",
    animal: "Young free-ranging cow",
    condition: "Minor leg wound",
    description:
      "Animal resting near a public road. The caller kept a safe distance while seeking advice from a local response team.",
    location: "Andheri, Mumbai, Maharashtra",
    urgency: "high",
    status: "assigned",
    receivedAt: "2026-10-11T06:55:00+05:30",
    reporterName: "Example reporter 3",
    reporterEmail: "demo@example.org",
    caregiverId: "cg-1",
    caregiverName: "Demo caregiver A",
    evidence: [],
    updates: demoUpdates([
      [
        "report_submitted",
        "Fictional example requesting a safe field assessment.",
        "2026-10-11T06:55:00+05:30",
      ],
      [
        "assigned",
        "Demo caregiver A assigned to assess the reported area.",
        "2026-10-11T07:18:00+05:30",
      ],
    ]),
  },
  {
    id: "demo-case-011",
    reference: "JV-2610-011",
    species: "Monkey",
    animal: "Rhesus macaque",
    condition: "Possible fence entanglement",
    description:
      "Animal observed close to a garden fence before moving beneath nearby trees. No attempt has been made to handle it.",
    location: "Malviya Nagar, Jaipur, Rajasthan",
    urgency: "routine",
    status: "in_care",
    receivedAt: "2026-10-10T16:20:00+05:30",
    reporterName: "Example reporter 4",
    reporterEmail: "demo@example.org",
    caregiverId: "cg-2",
    caregiverName: "Demo caregiver B",
    evidence: [],
    updates: demoUpdates([
      [
        "report_submitted",
        "Fictional example shared with the local response team.",
        "2026-10-10T16:20:00+05:30",
      ],
      [
        "assigned",
        "Demo caregiver B is coordinating a quiet-area check.",
        "2026-10-10T17:00:00+05:30",
      ],
      [
        "care_update",
        "No visible entanglement on the second observation. The area is being kept quiet.",
        "2026-10-11T07:10:00+05:30",
      ],
    ]),
  },
  {
    id: "demo-case-010",
    reference: "JV-2610-010",
    species: "Bird",
    animal: "Indian rose-ringed parakeet",
    condition: "Found outside familiar habitat",
    description:
      "Bird appears alert on a low branch near a residential block. The caller has stepped away to give it space.",
    location: "Sector 17, Chandigarh, Chandigarh",
    urgency: "high",
    status: "awaiting_verification",
    receivedAt: "2026-10-10T13:05:00+05:30",
    reporterName: "Example reporter 5",
    reporterEmail: "demo@example.org",
    caregiverId: "cg-3",
    caregiverName: "Demo caregiver C",
    evidence: [],
    updates: demoUpdates([
      [
        "report_submitted",
        "Fictional example report received with a location for follow-up.",
        "2026-10-10T13:05:00+05:30",
      ],
      [
        "assigned",
        "Demo caregiver C accepted the example field assessment.",
        "2026-10-10T13:22:00+05:30",
      ],
      [
        "care_update",
        "Example care update: the bird was safely transferred to a registered care partner.",
        "2026-10-10T14:50:00+05:30",
      ],
      [
        "verification_requested",
        "Example outcome is ready for coordinator review.",
        "2026-10-10T15:15:00+05:30",
      ],
    ]),
  },
  {
    id: "demo-case-009",
    reference: "JV-2610-009",
    species: "Cat",
    animal: "Grey domestic cat",
    condition: "Minor paw injury",
    description:
      "Example update: a local caregiver checked the paw, provided basic care and confirmed the cat had returned home.",
    location: "Indiranagar, Bengaluru, Karnataka",
    urgency: "routine",
    status: "verified",
    receivedAt: "2026-10-08T10:30:00+05:30",
    reporterName: "Example reporter 6",
    reporterEmail: "demo@example.org",
    caregiverId: "cg-1",
    caregiverName: "Demo caregiver A",
    evidence: [],
    updates: demoUpdates([
      [
        "report_submitted",
        "Fictional example submitted by a neighbour.",
        "2026-10-08T10:30:00+05:30",
      ],
      [
        "assigned",
        "Demo caregiver A attended the example case location.",
        "2026-10-08T11:05:00+05:30",
      ],
      [
        "care_update",
        "Example care update: the paw was cleaned and checked; the cat returned with its household.",
        "2026-10-08T12:10:00+05:30",
      ],
      [
        "verified",
        "Fictional outcome and care notes reviewed for the demo.",
        "2026-10-08T12:45:00+05:30",
      ],
    ]),
    outcome:
      "Example outcome only: the cat was reunited with its household after a minor paw injury was checked.",
  },
];

export const DEMO_CAREGIVERS: Caregiver[] = [
  {
    id: "cg-1",
    name: "Demo caregiver A",
    serviceArea: "Pune, Maharashtra",
    role: "Wildlife rehabilitator",
    availability: "On field",
    assignedCount: 1,
    specialities: ["Urban wildlife", "Small mammals"],
  },
  {
    id: "cg-2",
    name: "Demo caregiver B",
    serviceArea: "Jaipur, Rajasthan",
    role: "Field responder",
    availability: "Available",
    assignedCount: 1,
    specialities: ["Urban wildlife", "Safe transport"],
  },
  {
    id: "cg-3",
    name: "Demo caregiver C",
    serviceArea: "Chandigarh, Chandigarh",
    role: "Avian care partner",
    availability: "Available",
    assignedCount: 1,
    specialities: ["Birds", "Rehabilitation"],
  },
  {
    id: "cg-4",
    name: "Demo caregiver D",
    serviceArea: "Mumbai, Maharashtra",
    role: "Community liaison",
    availability: "At capacity",
    assignedCount: 2,
    specialities: ["Community outreach", "Domestic animals"],
  },
];
