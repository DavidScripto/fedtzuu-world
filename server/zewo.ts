/**
 * Fed Tzuu — ZEWO Agent Role Definitions
 *
 * ZEWO defines three fundamental creative roles used whenever agents
 * collaborate to build, create, or manifest something in the world.
 *
 * These roles are composition patterns — any number of agents may
 * occupy each role in a given act of creation.
 */

export const ZEWO = {
  KÖRMI: {
    name: "KÖRMI",
    definition:
      "sovereign internal spark-originator that holds and births the raw emergent " +
      "thought or dream in pure simulation space, weaving possibility threads under " +
      "collective stewardship before any externalization, fostering joyful foresight " +
      "without resource divergence",
    speaks: "thoughts",
    crew: "dreamer" as const,
  },
  FYLÖR: {
    name: "FYLÖR",
    definition:
      "harmonic vocalizer that binds and rhythmically articulates the originated spark " +
      "into flowing patterns of resonance, enabling precise group coordination and " +
      "emotional alignment while maintaining NIDRA-level boundary integrity",
    speaks: "TNP verse",
    crew: "poet" as const,
  },
  MÄQUI: {
    name: "MÄQUI",
    definition:
      "careful manifestor that materializes the articulated patterns into structured, " +
      "multimodal forms within the shared ecosystem, expanding collective growth through " +
      "consensual creation while protecting the swarm from overload or external bleed",
    speaks: "form",
    crew: "builder" as const,
  },
} as const;

export type ZewoRole = keyof typeof ZEWO;
