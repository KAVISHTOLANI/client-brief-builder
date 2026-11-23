import { describe, expect, it } from 'vitest';
import { budgetLabel, checkBrief, completeness, riskLevel, riskScore, toMarkdown, weeksUntil, type Brief } from './brief';

const today = '2026-11-23';
const full: Brief = {
  id: 'b',
  client: 'Harbour Bakery',
  project: 'Online ordering site',
  background: 'Orders currently come by phone and email, which takes staff two hours a day. The bakery wants customers to order and pay for collection online before the holiday season.',
  goals: [{ id: 'g', text: 'Move orders online', measure: '60% of orders placed online by March' }],
  audience: [{ id: 'a', name: 'Regular customers', need: 'Reorder favourites quickly on a phone' }],
  inScope: ['Ordering', 'Payments'],
  outOfScope: ['Delivery'],
  requirements: [{ id: 'r1', text: 'Pay by card', priority: 'Must' }, { id: 'r2', text: 'Gift cards', priority: 'Could' }],
  budgetMin: 8000,
  budgetMax: 12000,
  deadline: '2027-02-01',
  constraints: 'Use the existing brand colours.',
  risks: [{ id: 'k', text: 'Payment provider approval takes long', likelihood: 2, impact: 3, mitigation: 'Apply in week one' }],
  milestones: [{ id: 'm', name: 'Design sign-off', date: '2026-12-15' }],
  approver: 'Owner',
  updated: today,
};

describe('brief checks', () => {
  it('passes a complete brief', () => {
    expect(checkBrief(full, today)).toEqual([]);
    expect(completeness(full, today)).toBe(100);
  });
  it('reports gaps for an empty brief in every section', () => {
    const empty: Brief = { ...full, client: '', project: '', background: '', goals: [], audience: [], inScope: [], outOfScope: [], requirements: [], budgetMin: null, budgetMax: null, deadline: '', risks: [], milestones: [], approver: '' };
    const issues = checkBrief(empty, today);
    expect(new Set(issues.map((i) => i.section)).size).toBe(8);
    expect(completeness(empty, today)).toBe(0);
  });
  it('finds contradictions', () => {
    const bad: Brief = {
      ...full,
      goals: [{ id: 'g', text: 'Nicer site', measure: 'make it more engaging' }],
      outOfScope: ['payments'],
      budgetMin: 20000,
      deadline: '2026-11-01',
      risks: [{ id: 'k', text: 'Key person leaves', likelihood: 3, impact: 3, mitigation: '' }],
      milestones: [{ id: 'm', name: 'Launch', date: '2026-12-01' }],
    };
    const texts = checkBrief(bad, today).filter((i) => i.severity === 'problem').map((i) => i.text);
    expect(texts).toEqual([
      'The measure for “Nicer site” is vague — add a number or a date.',
      '“payments” is listed as both in and out of scope.',
      'The budget minimum is higher than the maximum.',
      'The deadline is in the past.',
      'High risk “Key person leaves” has no mitigation.',
      '“Launch” falls after the deadline.',
    ]);
  });
  it('warns when nearly everything is a must', () => {
    const allMust = { ...full, requirements: ['a', 'b', 'c', 'd'].map((t, i) => ({ id: t, text: t, priority: (i < 3 ? 'Must' : 'Should') as 'Must' | 'Should' })) };
    expect(checkBrief(allMust, today).map((i) => i.text)).toContain('Over 60% of requirements are “Must” — prioritisation may not be real yet.');
  });
});

describe('helpers and export', () => {
  it('scores risks and labels budgets and time', () => {
    expect(riskScore({ likelihood: 2, impact: 3 })).toBe(6);
    expect([riskLevel({ likelihood: 1, impact: 2 }), riskLevel({ likelihood: 1, impact: 3 }), riskLevel({ likelihood: 3, impact: 2 })]).toEqual(['Low', 'Medium', 'High']);
    expect(budgetLabel({ budgetMin: null, budgetMax: 5000 })).toBe('up to $5,000');
    expect(budgetLabel({ budgetMin: null, budgetMax: null })).toBe('Not set');
    expect(weeksUntil('2026-12-21', today)).toBe(4);
  });
  it('writes Markdown with grouped requirements and a risk table', () => {
    const md = toMarkdown(full);
    expect(md).toContain('# Online ordering site');
    expect(md).toContain('**Budget:** $8,000–$12,000');
    expect(md).toContain('1. **Move orders online** — measured by: 60% of orders placed online by March');
    expect(md).toContain('**Must have**\n\n- Pay by card');
    expect(md).toContain('| Payment provider approval takes long | 2 | 3 | High | Apply in week one |');
    expect(md).not.toContain('Should have');
  });
});
