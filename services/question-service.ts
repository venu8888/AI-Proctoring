import type { Question } from "@/types"

/**
 * Question Service
 * Manages question loading and dynamic updates via Server API
 */

export async function getQuestions(bankId?: string): Promise<Question[]> {
  try {
    const url = bankId ? `/api/admin/questions?bankId=${bankId}` : '/api/admin/questions';
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.questions;
    }
  } catch (e) {
    console.error("Failed to fetch questions", e);
  }
  return [];
}

export async function getQuestionBanks(): Promise<any[]> {
  try {
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_banks' })
    });
    if (res.ok) {
      const data = await res.json();
      return data.banks || [];
    }
  } catch (e) {
    console.error("Failed to fetch banks", e);
  }
  return [];
}

export async function createQuestionBank(bankName: string, createdBy: string): Promise<any> {
  try {
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_bank', bankName, createdBy })
    });
    if (res.ok) {
      const data = await res.json();
      return data.bank;
    }
  } catch (e) {
    console.error("Failed to create bank", e);
  }
  return null;
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

