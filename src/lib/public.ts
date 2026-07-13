import type { Roadmap } from "../types";

const USE_STUB = import.meta.env.PROD
  ? import.meta.env.VITE_USE_STUB === "true"
  : import.meta.env.VITE_USE_STUB !== "false";

/**
 * Fetch a publicly-shared roadmap by id (read-only, no auth).
 * In local stub mode there's no backend, so we synthesize a sample so the
 * shared-roadmap UI and the viral CTA loop are verifiable without a deploy.
 */
export async function fetchPublicRoadmap(id: string): Promise<Roadmap | null> {
  if (USE_STUB) {
    return {
      id,
      title: "Quantum Computing",
      topic: "Quantum Computing",
      description:
        "A structured path from the basics of qubits to running your first quantum algorithm.",
      level: "Beginner",
      timeEstimate: "5–6 weeks at 30 min/day",
      outcomes: [
        "Explain superposition and entanglement in plain language",
        "Read and reason about a simple quantum circuit",
        "Run a small algorithm on a simulator",
      ],
      phases: [
        {
          id: "p1",
          title: "Foundations",
          nodes: [
            { id: "n1", title: "What is a qubit?" },
            { id: "n2", title: "Superposition" },
            { id: "n3", title: "Measurement" },
          ],
        },
        {
          id: "p2",
          title: "Core Concepts",
          nodes: [
            { id: "n4", title: "Entanglement" },
            { id: "n5", title: "Quantum gates" },
            { id: "n6", title: "Circuits" },
          ],
        },
      ],
    };
  }

  const res = await fetch(`/api/get-public-roadmap?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return (await res.json()) as Roadmap;
}
