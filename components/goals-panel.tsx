"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  EditIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
} from "@/components/ui/icons";

type Goal = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  color: string | null;
  icon: string | null;
};

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";
const labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function GoalsPanel({ currency }: { currency: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [contribModalFor, setContribModalFor] = useState<Goal | null>(null);
  const { toast } = useToast();

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/goals", { credentials: "include" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setGoals(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this goal?")) return;
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Goal deleted", variant: "success" });
      void load();
    }
  }

  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <Card
          variant="gradient"
          className="md:col-span-2"
          icon={<TargetIcon className="h-5 w-5" />}
          title="Overall progress"
          subtitle={`${goals.length} active goal${goals.length === 1 ? "" : "s"}`}
        >
          <div className="text-4xl font-black tabular-nums">
            {fmt(totalCurrent)} <span className="text-lg font-semibold text-white/70">/ {fmt(totalTarget)}</span>
          </div>
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.min(100, overallPct)}%`, transition: "width 600ms var(--ease-spring)" }}
              />
            </div>
            <div className="mt-2 text-xs text-white/80">{overallPct.toFixed(1)}% funded</div>
          </div>
        </Card>
        <Card icon={<PlusIcon className="h-5 w-5" />} title="New goal" subtitle="Something to work toward">
          <Button
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Create goal
          </Button>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <TargetIcon className="h-7 w-7" />
            </div>
            <div className="text-base font-semibold text-foreground">No goals yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Save toward something specific — a trip, a laptop, an emergency fund.
            </div>
            <div className="mt-5">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Create your first goal
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g, i) => {
            const target = Number(g.targetAmount);
            const cur = Number(g.currentAmount);
            const pct = target > 0 ? (cur / target) * 100 : 0;
            const completed = pct >= 100;
            const daysLeft = g.deadline
              ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            return (
              <div
                key={g.id}
                style={{ animationDelay: `${i * 70}ms` }}
                className="glass anim-fade-up hover-lift relative overflow-hidden rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-xl text-xl font-bold text-white"
                    style={{ background: g.color ?? "var(--primary)" }}
                  >
                    <TargetIcon className="h-5 w-5" />
                  </div>
                  {completed && <Badge variant="success">Done</Badge>}
                </div>
                <div className="mt-4 text-base font-semibold text-foreground">{g.name}</div>
                {g.deadline && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {daysLeft && daysLeft > 0
                      ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                      : "Deadline passed"}
                  </div>
                )}
                <div className="mt-4 text-2xl font-extrabold tabular-nums text-foreground">
                  {fmt(cur)}
                </div>
                <div className="text-xs text-muted-foreground">of {fmt(target)}</div>
                <div className="mt-4">
                  <Progress value={Math.min(100, pct)} variant={completed ? "success" : "default"} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setContribModalFor(g)}
                  >
                    Contribute
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => {
                      setEditing(g);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => void remove(g.id)}
                  >
                    <TrashIcon className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <GoalModal
          currency={currency}
          initial={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void load();
            toast({ title: editing ? "Goal updated" : "Goal created", variant: "success" });
          }}
        />
      )}

      {contribModalFor && (
        <ContributeModal
          goal={contribModalFor}
          currency={currency}
          onClose={() => setContribModalFor(null)}
          onSaved={() => {
            setContribModalFor(null);
            void load();
            toast({ title: "Contribution added", variant: "success" });
          }}
        />
      )}
    </div>
  );
}

function GoalModal({
  currency,
  initial,
  onClose,
  onSaved,
}: {
  currency: string;
  initial: Goal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? initial.targetAmount : "");
  const [current, setCurrent] = useState(initial ? initial.currentAmount : "0");
  const [deadline, setDeadline] = useState(
    initial?.deadline ? initial.deadline.slice(0, 10) : "",
  );
  const [color, setColor] = useState(initial?.color ?? "#10b981");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSubmit() {
    setSaving(true);
    setError(null);
    const body = {
      name,
      targetAmount: Number(target),
      currentAmount: Number(current),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      color,
    };
    const url = initial ? `/api/goals/${initial.id}` : "/api/goals";
    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not save.");
      return;
    }
    onSaved();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void runSubmit();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Edit goal" : "New goal"}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void runSubmit()}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-2 ${inputCls}`}
            placeholder="e.g. Emergency fund"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Target ({currency})</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
          </div>
          <div>
            <label className={labelCls}>Current</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={`mt-2 ${inputCls}`}
            />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-surface"
            />
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}

function ContributeModal({
  goal,
  currency,
  onClose,
  onSaved,
}: {
  goal: Goal;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSubmit() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contribute: Number(amount) }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not save.");
      return;
    }
    onSaved();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void runSubmit();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Contribute to ${goal.name}`}
      description={`Add money toward this goal (${currency}).`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void runSubmit()}>
            Add
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className={labelCls}>Amount</label>
        <input
          required
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`mt-2 ${inputCls}`}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  );
}
