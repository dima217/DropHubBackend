export function normalizeIds(id1: number, id2: number): { userOneId: number; userTwoId: number } {
  return id1 < id2 ? { userOneId: id1, userTwoId: id2 } : { userOneId: id2, userTwoId: id1 };
}
