"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import {
  DownloadIcon,
  MoonIcon,
  RepeatIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
} from "@/components/ui/icons";

export function SettingsPanel() {
  const fixedCurrency = "INR";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currency] = useState(fixedCurrency);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [runningRecurring, setRunningRecurring] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setEmail(data.email ?? "");
        setName(data.name ?? "");
      }
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, currency: fixedCurrency }),
    });
    setSavingProfile(false);
    if (!res.ok) {
      toast({ title: "Couldn't update profile", variant: "error" });
      return;
    }
    toast({ title: "Profile saved", variant: "success" });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPwd(true);
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingPwd(false);
    if (!res.ok) {
      toast({
        title: "Couldn't change password",
        description: typeof data.error === "string" ? data.error : undefined,
        variant: "error",
      });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast({ title: "Password updated", variant: "success" });
  }

  async function runRecurring() {
    setRunningRecurring(true);
    const res = await fetch("/api/recurring/run", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setRunningRecurring(false);
    if (!res.ok) {
      toast({ title: "Couldn't run recurring", variant: "error" });
      return;
    }
    toast({
      title: `Posted ${data.ranCount ?? 0} transaction${data.ranCount === 1 ? "" : "s"}`,
      variant: "success",
    });
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card icon={<SettingsIcon className="h-5 w-5" />} title="Profile" subtitle="Your basic account info">
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input readOnly value={email} className={`mt-2 ${inputCls} bg-muted`} />
              <div className="mt-1 text-xs text-muted-foreground">Email can't be changed here.</div>
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-2 ${inputCls}`}
                placeholder="How should we call you?"
              />
            </div>
            <div>
              <label className={labelCls}>Default currency</label>
              <input readOnly value={currency} className={`mt-2 ${inputCls} bg-muted uppercase`} />
            </div>
            <div>
              <Button type="submit" variant="primary" loading={savingProfile}>
                Save profile
              </Button>
            </div>
          </form>
        </Card>

        <Card icon={<ShieldIcon className="h-5 w-5" />} title="Change password" subtitle="Keep your account secure">
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Current password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`mt-2 ${inputCls}`}
              />
            </div>
            <div>
              <label className={labelCls}>New password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`mt-2 ${inputCls}`}
              />
              <div className="mt-1 text-xs text-muted-foreground">At least 8 characters.</div>
            </div>
            <div>
              <Button type="submit" variant="primary" loading={savingPwd}>
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        <Card
          icon={resolvedTheme === "dark" ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          title="Appearance"
          subtitle="Choose how Finnova feels"
        >
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                  theme === t
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:bg-surface-strong"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Card>

        <Card icon={<RepeatIcon className="h-5 w-5" />} title="Automation" subtitle="Post due recurring transactions">
          <p className="text-sm text-muted-foreground">
            Running this now will post any recurring transactions whose next date has arrived.
          </p>
          <div className="mt-4">
            <Button onClick={runRecurring} loading={runningRecurring} variant="primary">
              Run now
            </Button>
          </div>
        </Card>

        <Card icon={<DownloadIcon className="h-5 w-5" />} title="Export" subtitle="Download your data">
          <p className="text-sm text-muted-foreground">
            Get a CSV of every transaction you've ever logged.
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => window.open("/api/transactions/export", "_blank")}
              leftIcon={<DownloadIcon className="h-4 w-4" />}
            >
              Download CSV
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
