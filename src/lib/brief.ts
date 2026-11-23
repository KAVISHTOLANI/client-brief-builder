import { daysBetween, isValidISODate } from '../shared/dates';

export type Priority = 'Must' | 'Should' | 'Could' | 'Won’t';
export const PRIORITIES: Priority[] = ['Must', 'Should', 'Could', 'Won’t'];

export interface Goal { id: string; text: string; measure: string }
export interface Persona { id: string; name: string; need: string }
export interface Requirement { id: string; text: string; priority: Priority }
export interface Risk { id: string; text: string; likelihood: 1 | 2 | 3; impact: 1 | 2 | 3; mitigation: string }
export interface Milestone { id: string; name: string; date: string }

export interface Brief {
  id: string;
  client: string;
  project: string;
  background: string;
  goals: Goal[];
  audience: Persona[];
  inScope: string[];
  outOfScope: string[];
  requirements: Requirement[];
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: string;
  constraints: string;
  risks: Risk[];
  milestones: Milestone[];
  approver: string;
  updated: string;
  demo?: boolean;
}

export const SECTIONS = ['overview', 'goals', 'audience', 'scope', 'requirements', 'constraints', 'risks', 'milestones'] as const;
export type Section = (typeof SECTIONS)[number];
export const SECTION_LABEL: Record<Section, string> = { overview: 'Overview', goals: 'Goals', audience: 'Audience', scope: 'Scope', requirements: 'Requirements', constraints: 'Budget & constraints', risks: 'Risks', milestones: 'Milestones' };

export interface Issue {
  section: Section;
  severity: 'gap' | 'problem';
  text: string;
}

const VAGUE = /\b(better|improve|nicer|modern|engaging|user[- ]friendly|more|great|awesome)\b/i;
const HAS_NUMBER = /\d/;

/** Checks a brief for missing information and contradictions. */
export function checkBrief(b: Brief, today: string): Issue[] {
  const out: Issue[] = [];
  const gap = (section: Section, text: string) => out.push({ section, severity: 'gap', text });
  const problem = (section: Section, text: string) => out.push({ section, severity: 'problem', text });
  if (!b.client.trim()) gap('overview', 'Name the client.');
  if (!b.project.trim()) gap('overview', 'Name the project.');
  if (b.background.trim().split(/\s+/).filter(Boolean).length < 15) gap('overview', 'Add a few sentences of background (why now, what exists today).');
  if (!b.goals.length) gap('goals', 'Add at least one goal.');
  for (const g of b.goals) {
    if (!g.measure.trim()) gap('goals', `“${g.text || 'Untitled goal'}” has no success measure.`);
    else if (!HAS_NUMBER.test(g.measure) && VAGUE.test(g.measure)) problem('goals', `The measure for “${g.text}” is vague — add a number or a date.`);
  }
  if (!b.audience.length) gap('audience', 'Describe who it’s for.');
  for (const p of b.audience) if (!p.need.trim()) gap('audience', `What does “${p.name || 'this audience'}” need?`);
  if (!b.inScope.length) gap('scope', 'List what’s in scope.');
  if (!b.outOfScope.length) gap('scope', 'List at least one thing that’s out of scope — it prevents scope creep.');
  const inLower = new Set(b.inScope.map((s) => s.trim().toLowerCase()));
  for (const s of b.outOfScope) if (inLower.has(s.trim().toLowerCase())) problem('scope', `“${s}” is listed as both in and out of scope.`);
  if (!b.requirements.some((r) => r.priority === 'Must')) gap('requirements', 'Mark the must-have requirements.');
  const musts = b.requirements.filter((r) => r.priority === 'Must').length;
  if (b.requirements.length >= 4 && musts / b.requirements.length > 0.6) problem('requirements', 'Over 60% of requirements are “Must” — prioritisation may not be real yet.');
  if (b.budgetMin == null && b.budgetMax == null) gap('constraints', 'Give a budget range, even a rough one.');
  if (b.budgetMin != null && b.budgetMax != null && b.budgetMin > b.budgetMax) problem('constraints', 'The budget minimum is higher than the maximum.');
  if (!b.deadline) gap('constraints', 'Set a deadline or launch date.');
  else if (b.deadline < today) problem('constraints', 'The deadline is in the past.');
  if (!b.risks.length) gap('risks', 'Note at least one risk.');
  for (const r of b.risks) if (riskScore(r) >= 6 && !r.mitigation.trim()) problem('risks', `High risk “${r.text}” has no mitigation.`);
  if (!b.milestones.length) gap('milestones', 'Add milestones between now and the deadline.');
  const sorted = [...b.milestones].sort((a, c) => a.date.localeCompare(c.date));
  for (const m of sorted) if (b.deadline && m.date > b.deadline) problem('milestones', `“${m.name}” falls after the deadline.`);
  if (!b.approver.trim()) gap('milestones', 'Who signs off the brief?');
  return out;
}

/** Share of sections with no issues, 0–100. */
export function completeness(b: Brief, today: string): number {
  const issues = checkBrief(b, today);
  const clean = SECTIONS.filter((s) => !issues.some((i) => i.section === s)).length;
  return Math.round((clean / SECTIONS.length) * 100);
}

export const riskScore = (r: Pick<Risk, 'likelihood' | 'impact'>) => r.likelihood * r.impact;
export const riskLevel = (r: Pick<Risk, 'likelihood' | 'impact'>) => (riskScore(r) >= 6 ? 'High' : riskScore(r) >= 3 ? 'Medium' : 'Low');

export function weeksUntil(date: string, today: string): number | null {
  if (!isValidISODate(date)) return null;
  return Math.round((daysBetween(today, date) / 7) * 10) / 10;
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export function budgetLabel(b: Pick<Brief, 'budgetMin' | 'budgetMax'>): string {
  if (b.budgetMin != null && b.budgetMax != null) return `${money(b.budgetMin)}–${money(b.budgetMax)}`;
  if (b.budgetMax != null) return `up to ${money(b.budgetMax)}`;
  if (b.budgetMin != null) return `from ${money(b.budgetMin)}`;
  return 'Not set';
}

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function toMarkdown(b: Brief): string {
  const L: string[] = [];
  L.push(`# ${b.project || 'Untitled project'}`, '', `**Client:** ${b.client || '—'}  `, `**Deadline:** ${b.deadline || '—'}  `, `**Budget:** ${budgetLabel(b)}  `, `**Sign-off:** ${b.approver || '—'}`, '');
  L.push('## Background', '', b.background.trim() || '_Not written yet._', '');
  L.push('## Goals', '');
  b.goals.forEach((g, i) => L.push(`${i + 1}. **${g.text}** — measured by: ${g.measure || '_tbc_'}`));
  L.push('', '## Audience', '');
  for (const p of b.audience) L.push(`- **${p.name}:** ${p.need}`);
  L.push('', '## Scope', '', '**In scope**', '');
  for (const s of b.inScope) L.push(`- ${s}`);
  L.push('', '**Out of scope**', '');
  for (const s of b.outOfScope) L.push(`- ${s}`);
  L.push('', '## Requirements', '');
  for (const p of PRIORITIES) {
    const rs = b.requirements.filter((r) => r.priority === p);
    if (!rs.length) continue;
    L.push(`**${p} have**`, '');
    for (const r of rs) L.push(`- ${r.text}`);
    L.push('');
  }
  if (b.constraints.trim()) L.push('## Constraints', '', b.constraints.trim(), '');
  L.push('## Risks', '');
  if (b.risks.length) {
    L.push('| Risk | Likelihood | Impact | Level | Mitigation |', '| --- | --- | --- | --- | --- |');
    for (const r of [...b.risks].sort((a, c) => riskScore(c) - riskScore(a))) L.push(`| ${esc(r.text)} | ${r.likelihood} | ${r.impact} | ${riskLevel(r)} | ${esc(r.mitigation || '—')} |`);
  } else L.push('_None recorded._');
  L.push('', '## Milestones', '');
  for (const m of [...b.milestones].sort((a, c) => a.date.localeCompare(c.date))) L.push(`- ${m.date} — ${m.name}`);
  L.push('');
  return L.join('\n');
}
