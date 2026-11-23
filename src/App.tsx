import { useState, type ReactNode } from 'react';
import { DemoTag, EmptyState, Field, Landing, NotFound, Notice, PageHead, Shell, copyText, downloadText, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { addDays, formatDay, todayISO } from './shared/dates';
import { PRIORITIES, SECTIONS, SECTION_LABEL, budgetLabel, checkBrief, completeness, riskLevel, riskScore, toMarkdown, weeksUntil, type Brief, type Priority, type Risk, type Section } from './lib/brief';

const KEY = 'briefcraft:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/briefs', label: 'Briefs' },
];

interface Store {
  briefs: Brief[];
}

const blank = (today: string): Omit<Brief, 'id'> => ({ client: '', project: '', background: '', goals: [], audience: [], inScope: [], outOfScope: [], requirements: [], budgetMin: null, budgetMax: null, deadline: '', constraints: '', risks: [], milestones: [], approver: '', updated: today });

const TEMPLATES: { key: string; name: string; fill: (t: string) => Partial<Brief> }[] = [
  { key: 'web', name: 'Website redesign', fill: () => ({ inScope: ['Information architecture', 'Visual design', 'Responsive build', 'Content migration'], outOfScope: ['Copywriting for new pages', 'Hosting'], requirements: [{ id: uid('r'), text: 'Meets WCAG 2.2 AA', priority: 'Must' }, { id: uid('r'), text: 'Editable by staff without a developer', priority: 'Must' }, { id: uid('r'), text: 'Blog', priority: 'Should' }] }) },
  { key: 'brand', name: 'Brand identity', fill: () => ({ inScope: ['Logo', 'Colour palette', 'Typography', 'Brand guidelines PDF'], outOfScope: ['Website', 'Signage production'], requirements: [{ id: uid('r'), text: 'Works in one colour', priority: 'Must' }, { id: uid('r'), text: 'Social media templates', priority: 'Could' }] }) },
  { key: 'app', name: 'Mobile app MVP', fill: () => ({ inScope: ['iOS and Android app', 'Account sign-in', 'Core flow'], outOfScope: ['Tablet layouts', 'Offline mode'], requirements: [{ id: uid('r'), text: 'Sign in with email', priority: 'Must' }, { id: uid('r'), text: 'Push notifications', priority: 'Should' }] }) },
];

export function demoBriefs(today: string): Brief[] {
  return [
    {
      id: 'demo-bakery', client: 'Harbour Bakery (demo)', project: 'Online ordering for collection',
      background: 'Orders currently arrive by phone and email, which takes staff around two hours a day and leads to mistakes at busy times. The bakery wants customers to order and pay for collection online before the holiday season, without changing how the kitchen works.',
      goals: [{ id: 'g1', text: 'Move most orders online', measure: '60% of orders placed online within 3 months of launch' }, { id: 'g2', text: 'Reduce order mistakes', measure: 'Fewer than 2 wrong orders per week' }, { id: 'g3', text: 'Make the site feel modern', measure: 'More engaging' }],
      audience: [{ id: 'a1', name: 'Regular customers', need: 'Reorder favourites quickly on a phone' }, { id: 'a2', name: 'Office managers', need: 'Place large orders a day ahead and get an invoice' }, { id: 'a3', name: 'Kitchen staff', need: '' }],
      inScope: ['Online menu', 'Ordering and card payment', 'Collection time slots', 'Order printout for the kitchen'],
      outOfScope: ['Delivery', 'Loyalty scheme'],
      requirements: [{ id: 'r1', text: 'Pay by card and mobile wallet', priority: 'Must' }, { id: 'r2', text: 'Limit orders per collection slot', priority: 'Must' }, { id: 'r3', text: 'Accessible to WCAG 2.2 AA', priority: 'Must' }, { id: 'r4', text: 'Allergen information per item', priority: 'Must' }, { id: 'r5', text: 'Gift cards', priority: 'Could' }, { id: 'r6', text: 'Native mobile app', priority: 'Won’t' }],
      budgetMin: 8000, budgetMax: 12000, deadline: addDays(today, 70), constraints: 'Use the existing logo and colours. Staff tablets are five years old.',
      risks: [{ id: 'k1', text: 'Payment provider approval takes longer than expected', likelihood: 2, impact: 3, mitigation: 'Apply in week one; have a second provider ready' }, { id: 'k2', text: 'Menu photos not ready in time', likelihood: 3, impact: 2, mitigation: '' }, { id: 'k3', text: 'Holiday rush overloads collection slots', likelihood: 2, impact: 2, mitigation: 'Slot limits configurable by staff' }],
      milestones: [{ id: 'm1', name: 'Brief signed off', date: addDays(today, 5) }, { id: 'm2', name: 'Design approved', date: addDays(today, 28) }, { id: 'm3', name: 'Test with 10 customers', date: addDays(today, 56) }, { id: 'm4', name: 'Launch', date: addDays(today, 70) }],
      approver: 'Bakery owner', updated: today, demo: true,
    },
    { id: 'demo-gallery', client: 'Northside Community Gallery (demo)', project: 'Visual identity refresh', background: 'The gallery is reopening after a renovation.', goals: [{ id: 'g', text: 'Recognisable new identity', measure: '' }], audience: [], inScope: ['Logo', 'Colour palette'], outOfScope: [], requirements: [], budgetMin: null, budgetMax: 6000, deadline: addDays(today, 120), constraints: '', risks: [], milestones: [], approver: '', updated: addDays(today, -3), demo: true },
  ];
}

export default function App() {
  const [route, navigate] = useRoute();
  const today = todayISO();
  const [store, setStore] = usePersistentState<Store>(KEY, () => ({ briefs: demoBriefs(today) }));
  const ctx = { store, setStore, today, navigate };
  const m = route.match(/^\/brief\/([^/]+)\/([a-z]+)$/);
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/briefs') page = <Briefs {...ctx} />;
  else if (m && m[2] === 'review') page = <Review {...ctx} id={m[1]} />;
  else if (m && (SECTIONS as readonly string[]).includes(m[2])) page = <Wizard {...ctx} id={m[1]} section={m[2] as Section} />;
  else page = <NotFound />;
  return (
    <Shell name="Briefcraft" wordmark={['Brief', 'craft']} nav={NAV} route={route} cta={{ to: '/briefs', label: 'Start a brief' }} footerNote="Briefs stay in this browser until you export them.">
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void; today: string; navigate: (to: string) => void };

function Ring({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={`${pct}% complete`}>
      <circle cx="28" cy="28" r={r} className="ring-bg" />
      <circle cx="28" cy="28" r={r} className={`ring-fg ${pct === 100 ? 'done' : ''}`} strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle">{pct}%</text>
    </svg>
  );
}

function HeroPreview() {
  const today = todayISO();
  const b = demoBriefs(today)[0];
  const issues = checkBrief(b, today);
  return (
    <div className="hero-bc">
      <div className="row-between"><div><p className="eyebrow">{b.client}</p><strong className="hero-bc-title">{b.project}</strong></div><Ring pct={completeness(b, today)} /></div>
      <ul className="sec-list">{SECTIONS.map((s, i) => { const n = issues.filter((x) => x.section === s).length; return <li key={s} className={n ? 'has' : 'ok'} style={{ ['--i' as string]: i }}><span>{SECTION_LABEL[s]}</span><span className="small">{n ? `${n} to fix` : '✓'}</span></li>; })}</ul>
      <p className="small"><strong>Next:</strong> {issues[0]?.text}</p>
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Client brief builder"
      title={<>Agree the work <em>before you start it.</em></>}
      lead="Walk through eight short sections — goals, audience, scope, requirements, budget, risks and milestones — while Briefcraft points out what’s missing or contradictory. Then export a clean brief for sign-off."
      primary={{ href: '#/briefs', label: 'Open your briefs' }}
      secondary={{ href: '#/brief/demo-bakery/review', label: 'Read a sample brief' }}
      previewLabel="Brief health — demo project"
      preview={<HeroPreview />}
      steps={[
        { title: 'Start from a template', body: 'Website, brand identity or app MVP — or a blank brief.' },
        { title: 'Fill it in, step by step', body: 'Each section has a focused form and a live list of what still needs attention.' },
        { title: 'Export for sign-off', body: 'Review the finished brief, print it, or copy Markdown into a doc or email.' },
      ]}
      stepsIntro="Briefcraft opens with two labelled, fictional briefs: one nearly finished with a few deliberate problems, one barely started."
      features={[
        { title: 'Gap checker', body: 'Spots goals without measures, vague targets, missing out-of-scope items and milestones after the deadline.' },
        { title: 'Real prioritisation', body: 'Must / should / could / won’t, with a warning when everything is a must.' },
        { title: 'Risk matrix', body: 'Likelihood × impact on a 3 × 3 grid; high risks need a mitigation.' },
        { title: 'Clean export', body: 'Markdown with a risk table and grouped requirements, plus a print-ready view.' },
      ]}
      note="Briefcraft is a writing aid, not a contract. Agree terms separately with your client."
      closing={{ title: <>A good brief is <em>half the project.</em></>, action: { href: '#/briefs', label: 'Start a brief' } }}
    />
  );
}

/* ---------- Briefs ---------- */
function Briefs({ store, setStore, today, navigate }: Ctx) {
  const [d, setD] = useState({ client: '', project: '', template: 'web' });
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();
  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!d.project.trim()) return setErr('Name the project.');
    const t = TEMPLATES.find((x) => x.key === d.template);
    const id = uid('brief');
    setStore({ briefs: [{ ...blank(today), ...(t ? t.fill(today) : {}), id, client: d.client.trim(), project: d.project.trim() }, ...store.briefs] });
    navigate(`/brief/${id}/overview`);
  }
  return (
    <div className="stack">
      <PageHead eyebrow="Briefs" title={<>Your <em>briefs.</em></>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <form className="card stack" onSubmit={create} noValidate aria-labelledby="new-b">
        <h2 id="new-b" className="h3">New brief</h2>
        <div className="form-grid">
          <Field label="Client">{(p) => <input {...p} value={d.client} onChange={(e) => setD({ ...d, client: e.target.value })} />}</Field>
          <Field label="Project" error={err}>{(p) => <input {...p} value={d.project} onChange={(e) => setD({ ...d, project: e.target.value })} />}</Field>
          <Field label="Start from">{(p) => <select {...p} value={d.template} onChange={(e) => setD({ ...d, template: e.target.value })}>{TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}<option value="">Blank brief</option></select>}</Field>
        </div>
        <div><button className="btn btn-primary" type="submit">Create brief</button></div>
      </form>
      {store.briefs.length === 0 ? <EmptyState title="No briefs yet" actions={<button type="button" className="btn" onClick={() => setStore({ briefs: demoBriefs(today) })}>Load demo briefs</button>} /> : (
        <div className="grid-2">
          {store.briefs.map((b, i) => {
            const issues = checkBrief(b, today);
            return (
              <article key={b.id} className="card brief-card" data-reveal style={{ ['--i' as string]: i }}>
                <Ring pct={completeness(b, today)} />
                <div className="stack-tight">
                  <h2 className="h3"><a href={`#/brief/${b.id}/overview`}>{b.project || 'Untitled'}</a></h2>
                  <span className="small muted">{b.client || 'No client'} · updated {formatDay(b.updated, { day: 'numeric', month: 'short' })}{b.demo && <> · <DemoTag /></>}</span>
                  <span className="small">{issues.length ? `${issues.filter((x) => x.severity === 'problem').length} problems · ${issues.filter((x) => x.severity === 'gap').length} gaps` : 'Ready for sign-off'}</span>
                  <div className="row"><a className="btn btn-sm" href={`#/brief/${b.id}/overview`}>Edit</a><a className="btn btn-sm" href={`#/brief/${b.id}/review`}>Review & export</a></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {store.briefs.some((b) => b.demo) && <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStore({ briefs: store.briefs.filter((b) => !b.demo) }); setFlash({ kind: 'success', text: 'Demo briefs removed.' }); }}>Clear demo briefs</button></div>}
    </div>
  );
}

/* ---------- Wizard ---------- */
function ListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (x: string[]) => void; placeholder?: string }) {
  const [v, setV] = useState('');
  return (
    <div className="stack">
      <span className="label">{label}</span>
      {items.length > 0 && <ul className="chips">{items.map((s, i) => <li key={i}>{s}<button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button></li>)}</ul>}
      <form className="row nowrap" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onChange([...items, v.trim()]); setV(''); } }}>
        <label className="sr-only" htmlFor={`add-${label}`}>Add to {label}</label>
        <input id={`add-${label}`} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} />
        <button className="btn btn-sm" type="submit">Add</button>
      </form>
    </div>
  );
}

function Wizard({ store, setStore, today, navigate, id, section }: Ctx & { id: string; section: Section }) {
  const b = store.briefs.find((x) => x.id === id);
  if (!b) return <EmptyState title="Brief not found" actions={<a className="btn btn-primary" href="#/briefs">Back to briefs</a>} />;
  const update = (patch: Partial<Brief>) => setStore({ briefs: store.briefs.map((x) => (x.id === b.id ? { ...x, ...patch, updated: today, demo: x.demo } : x)) });
  const issues = checkBrief(b, today);
  const idx = SECTIONS.indexOf(section);
  const mine = issues.filter((i) => i.section === section);
  return (
    <div className="stack">
      <PageHead eyebrow={<><a href="#/briefs">Briefs</a> / {b.client || 'No client'}</>} title={<>{b.project || 'Untitled'}</>} actions={<a className="btn" href={`#/brief/${b.id}/review`}>Review & export</a>} />
      {b.demo && <p><DemoTag /> <span className="small muted">A fictional demo brief.</span></p>}
      <div className="wizard">
        <nav className="steps-nav" aria-label="Brief sections">
          <ol>{SECTIONS.map((s, i) => { const n = issues.filter((x) => x.section === s).length; return <li key={s}><a href={`#/brief/${b.id}/${s}`} aria-current={s === section ? 'step' : undefined} className={n ? 'has' : 'ok'}><span className="mono">{String(i + 1).padStart(2, '0')}</span>{SECTION_LABEL[s]}<span className="sn-count" aria-label={n ? `${n} to fix` : 'complete'}>{n || '✓'}</span></a></li>; })}</ol>
          <div className="steps-ring"><Ring pct={completeness(b, today)} size={72} /><span className="small muted">sections complete</span></div>
        </nav>
        <section className="card stack" aria-labelledby="sec-t">
          <h2 id="sec-t" className="h3">{idx + 1}. {SECTION_LABEL[section]}</h2>
          {mine.length > 0 && <ul className="issues" aria-label="To fix in this section">{mine.map((i, n) => <li key={n} className={i.severity}>{i.severity === 'problem' ? 'Problem: ' : 'Missing: '}{i.text}</li>)}</ul>}
          {section === 'overview' && <>
            <div className="form-grid">
              <Field label="Client">{(p) => <input {...p} value={b.client} onChange={(e) => update({ client: e.target.value })} />}</Field>
              <Field label="Project name">{(p) => <input {...p} value={b.project} onChange={(e) => update({ project: e.target.value })} />}</Field>
            </div>
            <Field label="Background" hint="Why this project, why now, and what exists today">{(p) => <textarea {...p} rows={6} value={b.background} onChange={(e) => update({ background: e.target.value })} />}</Field>
            <p className="small muted">{b.background.trim().split(/\s+/).filter(Boolean).length} words</p>
          </>}
          {section === 'goals' && <>
            {b.goals.map((g, i) => (
              <div key={g.id} className="sub-row">
                <Field label={`Goal ${i + 1}`}>{(p) => <input {...p} value={g.text} onChange={(e) => update({ goals: b.goals.map((x) => (x.id === g.id ? { ...x, text: e.target.value } : x)) })} />}</Field>
                <Field label="How you’ll know it worked" hint="A number and a date work best">{(p) => <input {...p} value={g.measure} onChange={(e) => update({ goals: b.goals.map((x) => (x.id === g.id ? { ...x, measure: e.target.value } : x)) })} />}</Field>
                <button type="button" className="icon-btn" aria-label={`Remove goal ${i + 1}`} onClick={() => update({ goals: b.goals.filter((x) => x.id !== g.id) })}>✕</button>
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => update({ goals: [...b.goals, { id: uid('g'), text: '', measure: '' }] })}>+ Add goal</button></div>
          </>}
          {section === 'audience' && <>
            {b.audience.map((a, i) => (
              <div key={a.id} className="sub-row">
                <Field label={`Audience ${i + 1}`}>{(p) => <input {...p} value={a.name} onChange={(e) => update({ audience: b.audience.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })} />}</Field>
                <Field label="What they need">{(p) => <input {...p} value={a.need} onChange={(e) => update({ audience: b.audience.map((x) => (x.id === a.id ? { ...x, need: e.target.value } : x)) })} />}</Field>
                <button type="button" className="icon-btn" aria-label={`Remove audience ${i + 1}`} onClick={() => update({ audience: b.audience.filter((x) => x.id !== a.id) })}>✕</button>
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => update({ audience: [...b.audience, { id: uid('a'), name: '', need: '' }] })}>+ Add audience</button></div>
          </>}
          {section === 'scope' && <div className="grid-2"><ListEditor label="In scope" items={b.inScope} onChange={(inScope) => update({ inScope })} placeholder="e.g. Responsive build" /><ListEditor label="Out of scope" items={b.outOfScope} onChange={(outOfScope) => update({ outOfScope })} placeholder="e.g. Hosting" /></div>}
          {section === 'requirements' && <>
            <div className="moscow">
              {PRIORITIES.map((p) => (
                <div key={p} className={`mo mo-${p.replace('’', '')}`}>
                  <h3 className="label">{p} have</h3>
                  <ul>{b.requirements.filter((r) => r.priority === p).map((r) => (
                    <li key={r.id}><span>{r.text}</span>
                      <select aria-label={`Priority for ${r.text}`} value={r.priority} onChange={(e) => update({ requirements: b.requirements.map((x) => (x.id === r.id ? { ...x, priority: e.target.value as Priority } : x)) })}>{PRIORITIES.map((q) => <option key={q}>{q}</option>)}</select>
                      <button type="button" className="icon-btn" aria-label={`Remove ${r.text}`} onClick={() => update({ requirements: b.requirements.filter((x) => x.id !== r.id) })}>✕</button>
                    </li>
                  ))}</ul>
                </div>
              ))}
            </div>
            <AddRequirement onAdd={(text, priority) => update({ requirements: [...b.requirements, { id: uid('r'), text, priority }] })} />
          </>}
          {section === 'constraints' && <>
            <div className="form-grid">
              <Field label="Budget from (USD)">{(p) => <input {...p} inputMode="numeric" value={b.budgetMin ?? ''} onChange={(e) => update({ budgetMin: e.target.value.trim() === '' || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value) })} />}</Field>
              <Field label="Budget up to (USD)">{(p) => <input {...p} inputMode="numeric" value={b.budgetMax ?? ''} onChange={(e) => update({ budgetMax: e.target.value.trim() === '' || Number.isNaN(Number(e.target.value)) ? null : Number(e.target.value) })} />}</Field>
              <Field label="Deadline" hint={b.deadline ? `${weeksUntil(b.deadline, today)} weeks from today` : undefined}>{(p) => <input {...p} type="date" value={b.deadline} onChange={(e) => update({ deadline: e.target.value })} />}</Field>
            </div>
            <Field label="Other constraints" hint="Technology, brand, legal, people">{(p) => <textarea {...p} rows={4} value={b.constraints} onChange={(e) => update({ constraints: e.target.value })} />}</Field>
          </>}
          {section === 'risks' && <RiskEditor risks={b.risks} onChange={(risks) => update({ risks })} />}
          {section === 'milestones' && <>
            {[...b.milestones].sort((a, c) => a.date.localeCompare(c.date)).map((m) => (
              <div key={m.id} className="sub-row">
                <Field label="Milestone">{(p) => <input {...p} value={m.name} onChange={(e) => update({ milestones: b.milestones.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })} />}</Field>
                <Field label="Date">{(p) => <input {...p} type="date" value={m.date} onChange={(e) => update({ milestones: b.milestones.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)) })} />}</Field>
                <button type="button" className="icon-btn" aria-label={`Remove ${m.name || 'milestone'}`} onClick={() => update({ milestones: b.milestones.filter((x) => x.id !== m.id) })}>✕</button>
              </div>
            ))}
            <div><button type="button" className="btn btn-sm" onClick={() => update({ milestones: [...b.milestones, { id: uid('m'), name: '', date: today }] })}>+ Add milestone</button></div>
            <Field label="Who signs off the brief">{(p) => <input {...p} value={b.approver} onChange={(e) => update({ approver: e.target.value })} />}</Field>
          </>}
          <div className="row-between wiz-nav">
            {idx > 0 ? <button type="button" className="btn" onClick={() => navigate(`/brief/${b.id}/${SECTIONS[idx - 1]}`)}>← {SECTION_LABEL[SECTIONS[idx - 1]]}</button> : <span />}
            {idx < SECTIONS.length - 1 ? <button type="button" className="btn btn-primary" onClick={() => navigate(`/brief/${b.id}/${SECTIONS[idx + 1]}`)}>{SECTION_LABEL[SECTIONS[idx + 1]]} →</button> : <a className="btn btn-primary" href={`#/brief/${b.id}/review`}>Review the brief →</a>}
          </div>
        </section>
      </div>
    </div>
  );
}

function AddRequirement({ onAdd }: { onAdd: (text: string, p: Priority) => void }) {
  const [t, setT] = useState('');
  const [p, setP] = useState<Priority>('Should');
  return (
    <form className="filters" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onAdd(t.trim(), p); setT(''); } }}>
      <Field label="New requirement" className="grow">{(x) => <input {...x} value={t} onChange={(e) => setT(e.target.value)} />}</Field>
      <Field label="Priority">{(x) => <select {...x} value={p} onChange={(e) => setP(e.target.value as Priority)}>{PRIORITIES.map((q) => <option key={q}>{q}</option>)}</select>}</Field>
      <button className="btn" type="submit">Add requirement</button>
    </form>
  );
}

function RiskEditor({ risks, onChange }: { risks: Risk[]; onChange: (r: Risk[]) => void }) {
  const [t, setT] = useState('');
  const lv = ['', 'Low', 'Medium', 'High'];
  return (
    <div className="stack">
      <div className="risk-grid" role="img" aria-label={`Risk matrix: ${risks.map((r) => `${r.text} likelihood ${r.likelihood} impact ${r.impact}`).join('; ') || 'no risks'}`}>
        <span className="rg-y">Likelihood →</span>
        {[3, 2, 1].map((l) => [1, 2, 3].map((im) => { const here = risks.filter((r) => r.likelihood === l && r.impact === im); return <span key={`${l}${im}`} className={`rg-cell s${l * im >= 6 ? 'h' : l * im >= 3 ? 'm' : 'l'}`} style={{ gridRow: 4 - l, gridColumn: im + 1 }}>{here.length > 0 && <b>{here.length}</b>}</span>; }))}
        <span className="rg-x">Impact →</span>
      </div>
      <ul className="risks">
        {risks.map((r) => (
          <li key={r.id} className={`risk r-${riskLevel(r).toLowerCase()}`}>
            <div className="row-between"><strong>{r.text}</strong><span className="badge">{riskLevel(r)} · {riskScore(r)}</span></div>
            <div className="form-grid">
              <Field label="Likelihood">{(p) => <select {...p} value={r.likelihood} onChange={(e) => onChange(risks.map((x) => (x.id === r.id ? { ...x, likelihood: Number(e.target.value) as 1 | 2 | 3 } : x)))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} · {lv[n]}</option>)}</select>}</Field>
              <Field label="Impact">{(p) => <select {...p} value={r.impact} onChange={(e) => onChange(risks.map((x) => (x.id === r.id ? { ...x, impact: Number(e.target.value) as 1 | 2 | 3 } : x)))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} · {lv[n]}</option>)}</select>}</Field>
              <Field label="Mitigation">{(p) => <input {...p} value={r.mitigation} onChange={(e) => onChange(risks.map((x) => (x.id === r.id ? { ...x, mitigation: e.target.value } : x)))} />}</Field>
            </div>
            <div><button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(risks.filter((x) => x.id !== r.id))}>Remove risk</button></div>
          </li>
        ))}
      </ul>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onChange([...risks, { id: uid('k'), text: t.trim(), likelihood: 2, impact: 2, mitigation: '' }]); setT(''); } }}>
        <Field label="New risk" className="grow">{(p) => <input {...p} value={t} onChange={(e) => setT(e.target.value)} />}</Field>
        <button className="btn" type="submit">Add risk</button>
      </form>
    </div>
  );
}

/* ---------- Review ---------- */
function Review({ store, today, id }: Ctx & { id: string }) {
  const b = store.briefs.find((x) => x.id === id);
  const [flash, setFlash] = useFlash();
  if (!b) return <EmptyState title="Brief not found" actions={<a className="btn btn-primary" href="#/briefs">Back</a>} />;
  const issues = checkBrief(b, today);
  const md = toMarkdown(b);
  return (
    <div className="stack">
      <PageHead eyebrow={<><a href="#/briefs">Briefs</a> / Review</>} title={b.project || 'Untitled'} actions={<>
        <button type="button" className="btn btn-primary" onClick={async () => { const ok = await copyText(md); setFlash(ok ? { kind: 'success', text: 'Markdown copied.' } : { kind: 'error', text: 'Couldn’t copy — use Download.' }); }}>Copy Markdown</button>
        <button type="button" className="btn" onClick={() => downloadText(`${(b.project || 'brief').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, md, 'text/markdown')}>Download .md</button>
        <button type="button" className="btn" onClick={() => window.print()}>Print</button>
      </>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      {issues.length > 0 ? (
        <Notice kind="warn">
          <strong>{issues.length} thing{issues.length === 1 ? '' : 's'} to resolve before sign-off:</strong>
          <ul className="review-issues">{issues.map((i, n) => <li key={n}><a href={`#/brief/${b.id}/${i.section}`}>{SECTION_LABEL[i.section]}</a>: {i.text}</li>)}</ul>
        </Notice>
      ) : <Notice kind="success">No gaps or contradictions found — ready for sign-off.</Notice>}
      <article className="card doc" aria-label="Brief document">
        <header><p className="eyebrow">{b.client || 'Client'}</p><h2>{b.project}</h2><p className="small muted">Deadline {b.deadline ? formatDay(b.deadline) : '—'} · Budget {budgetLabel(b)} · Sign-off {b.approver || '—'}</p></header>
        <h3>Background</h3><p className="pre">{b.background || '—'}</p>
        <h3>Goals</h3><ol>{b.goals.map((g) => <li key={g.id}><strong>{g.text}</strong> — {g.measure || <em>measure to be agreed</em>}</li>)}</ol>
        <h3>Audience</h3><ul>{b.audience.map((a) => <li key={a.id}><strong>{a.name}</strong>: {a.need || '—'}</li>)}</ul>
        <div className="grid-2"><div><h3>In scope</h3><ul>{b.inScope.map((s) => <li key={s}>{s}</li>)}</ul></div><div><h3>Out of scope</h3><ul>{b.outOfScope.map((s) => <li key={s}>{s}</li>)}</ul></div></div>
        <h3>Requirements</h3>{PRIORITIES.map((p) => { const rs = b.requirements.filter((r) => r.priority === p); return rs.length ? <div key={p}><p className="label">{p} have</p><ul>{rs.map((r) => <li key={r.id}>{r.text}</li>)}</ul></div> : null; })}
        {b.constraints && <><h3>Constraints</h3><p className="pre">{b.constraints}</p></>}
        <h3>Risks</h3>
        {b.risks.length ? <div className="table-wrap"><table className="table"><caption className="sr-only">Risks by severity</caption><thead><tr><th scope="col">Risk</th><th scope="col">Level</th><th scope="col">Mitigation</th></tr></thead><tbody>{[...b.risks].sort((a, c) => riskScore(c) - riskScore(a)).map((r) => <tr key={r.id}><td>{r.text}</td><td>{riskLevel(r)} ({r.likelihood}×{r.impact})</td><td>{r.mitigation || '—'}</td></tr>)}</tbody></table></div> : <p>—</p>}
        <h3>Milestones</h3><ol className="ms">{[...b.milestones].sort((a, c) => a.date.localeCompare(c.date)).map((m) => <li key={m.id}><span className="mono small">{formatDay(m.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span> {m.name}</li>)}</ol>
      </article>
    </div>
  );
}
