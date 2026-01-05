// src/app/utils/type-guards.ts
export function hasId<T extends { id?: string }>(item: T): item is T & { id: string } {
  return !!item.id;
}

export function hasQuizId<T extends { id?: string }>(quiz: T): quiz is T & { id: string } {
  return !!quiz.id;
}