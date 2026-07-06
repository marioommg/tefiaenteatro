const badEnd16 = new Date('2023-04-13T23:26:30Z').getTime();
const realEnd16 = new Date('2025-05-16T20:00:00Z').getTime();
const offset = realEnd16 - badEnd16;

const shows = [
  { event: "16 Mayo", startStr: "17:30", badMin: "2023-04-13T21:19:41Z", badMax: "2023-04-13T23:26:30Z" },
  { event: "24 Mayo", startStr: "18:00", badMin: "2023-04-21T21:15:06Z", badMax: "2023-04-21T23:36:14Z" }, // I need to know badMax for 24 Mayo. Let's just calculate the mapped times!
];

console.log("Offset (ms):", offset);
console.log("Offset days:", offset / (1000 * 60 * 60 * 24));

function applyOffset(badTimeStr) {
  const t = new Date(badTimeStr).getTime();
  return new Date(t + offset).toISOString();
}

console.log("16 Mayo Min:", applyOffset("2023-04-13T21:19:41Z"));
console.log("16 Mayo Max:", applyOffset("2023-04-13T23:26:30Z"));
console.log("24 Mayo Min:", applyOffset("2023-04-21T21:15:06Z")); // Let's see what time this maps to!
console.log("14 Jun Min:", applyOffset("2023-05-12T18:19:54Z"));
console.log("15 Jun Min:", applyOffset("2023-05-13T22:08:01Z"));
console.log("15 Jun Max:", applyOffset("2023-05-14T00:38:36Z"));
console.log("6 Jul Min:", applyOffset("2023-06-03T22:12:03Z"));

