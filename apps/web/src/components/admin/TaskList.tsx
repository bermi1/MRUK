'use client';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { claimTaskAction, completeTaskAction } from '@/app/actions/tasks';
import type { TaskView } from '@/server/admin/taskview';

const PRIORITY: Record<string, { label: string; cls: string }> = {
  urgent: { label: 'Urgent', cls: 'pill-red' },
  high: { label: 'High', cls: 'pill-amber' },
  normal: { label: 'Normal', cls: 'pill-navy' },
  low: { label: 'Low', cls: 'pill-grey' },
};
const BRAND: Record<string, string> = { mruk: 'Mr UK', skywood: 'Skywood' };

/** Swipe left (phone) or press "Mark done". */
function TaskRow({ t, showTeam }: { t: TaskView; showTeam: boolean }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const [err, setErr] = useState('');
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const done = () =>
    start(async () => {
      setErr('');
      const r = await completeTaskAction(t.id);
      if (r.ok) setGone(true);
      else {
        setDx(0);
        setErr(r.error);
      }
    });
  const claim = () =>
    start(async () => {
      const r = await claimTaskAction(t.id);
      if (!r.ok) setErr(r.error);
    });
  if (gone) return null;
  const p = PRIORITY[t.priority] ?? PRIORITY.normal!;
  const open = t.status === 'open';
  return (
    <li className={`ad-task ${t.overdue ? 'late' : ''} p-${t.priority}`} data-testid="task" data-kind={t.kind}>
      {open && (
        <div className="swipe" aria-hidden="true">
          Done
        </div>
      )}
      <div
        className="body"
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        onTouchStart={(e) => {
          if (!open) return;
          startX.current = e.touches[0]!.clientX;
          startY.current = e.touches[0]!.clientY;
        }}
        onTouchMove={(e) => {
          if (startX.current === null) return;
          const x = e.touches[0]!.clientX - startX.current;
          const y = e.touches[0]!.clientY - startY.current;
          if (Math.abs(y) > Math.abs(x)) return; // scrolling the list
          setDx(Math.min(0, Math.max(-140, x)));
        }}
        onTouchEnd={() => {
          if (startX.current === null) return;
          startX.current = null;
          if (dx <= -96) done();
          else setDx(0);
        }}
      >
        <div className="top">
          <span className={`ad-pill ${p.cls}`}>{p.label}</span>
          <span className="k">{t.kindLabel}</span>
          {t.brand && <span className={`ad-bchip ${t.brand}`}>{BRAND[t.brand] ?? t.brand}</span>}
          {showTeam && <span className="k">· {t.roleLabel}</span>}
          <span className="age">{t.age} ago</span>
        </div>
        <Link href={t.href} className="ttl">
          {t.title}
        </Link>
        {t.detail && <p className="det">{t.detail}</p>}
        <div className="meta">
          {t.due && <span className={t.overdue ? 'ad-bad' : 'ad-muted2'}>{t.due}</span>}
          <span className="ad-muted2">{t.assignee ? (t.mine ? 'Assigned to you' : `Assigned to ${t.assignee}`) : `${t.roleLabel} queue`}</span>
          {t.done && <span className="ad-ok">Done by {t.done}</span>}
        </div>
        {open && (
          <div className="acts">
            <Link className="ad-btn line sm" href={t.href}>
              Open
            </Link>
            {t.canClaim && (
              <button type="button" className="ad-btn line sm" disabled={pending} onClick={claim}>
                Take it
              </button>
            )}
            <button type="button" className="ad-btn ok sm" disabled={pending} aria-busy={pending} onClick={done} aria-label={`Mark done: ${t.title}`}>
              {pending ? 'Saving…' : 'Mark done'}
            </button>
          </div>
        )}
        {err && (
          <p role="alert" className="ad-msg err" style={{ margin: '6px 0 0' }}>
            {err}
          </p>
        )}
      </div>
    </li>
  );
}

export function TaskList({ tasks, showTeam = false, empty = 'Nothing waiting. Nice work.' }: { tasks: TaskView[]; showTeam?: boolean; empty?: string }) {
  if (!tasks.length) return <div className="ad-empty">{empty}</div>;
  return (
    <ul className="ad-tasks" aria-label="Tasks">
      {tasks.map((t) => (
        <TaskRow key={t.id} t={t} showTeam={showTeam} />
      ))}
    </ul>
  );
}
