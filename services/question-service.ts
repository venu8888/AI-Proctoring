import type { Question } from "@/types"

/**
 * Question Service
 * Manages question loading and dynamic updates via Server API
 */

export async function getQuestions(): Promise<Question[]> {
  try {
    const res = await fetch('/api/admin/questions', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.questions;
    }
  } catch (e) {
    console.error("Failed to fetch questions", e);
  }
  return [];
}

export async function getQuestionVersion(): Promise<number> {
  try {
    const res = await fetch('/api/admin/questions', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.version;
    }
  } catch (e) {
    console.error("Failed to fetch version", e);
  }
  return 0;
}

export async function updateQuestion(questionId: string, updates: Partial<Question>): Promise<boolean> {
  try {
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', questionId, updates })
    });
    return true;
  } catch (e) {
    console.error("Failed to update question", e);
    return false;
  }
}

export async function addQuestion(question: Question): Promise<void> {
  try {
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', question })
    });
  } catch (e) {
    console.error("Failed to add question", e);
  }
}

export async function resetQuestionBank(): Promise<void> {
  try {
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' })
    });
  } catch (e) {
    console.error("Failed to reset questions", e);
  }
}

// Deprecated but kept for compatibility if needed (empty implementation)
export function initializeQuestionBank(): void { }

export async function getQuestionPapers(): Promise<any[]> {
  try {
    const res = await fetch('/api/admin/questions', {
      method: 'POST', // Using POST to send action
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_papers' })
    });
    if (res.ok) {
      const data = await res.json();
      return data.papers || [];
    }
  } catch (e) {
    console.error("Failed to fetch papers", e);
  }
  return [];
}

export async function saveQuestionPaper(paper: any): Promise<boolean> {
  try {
    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_paper', paper })
    });
    return true;
  } catch (e) {
    console.error("Failed to save paper", e);
    return false;
  }
}

