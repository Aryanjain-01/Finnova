"use client";

import { useEffect, useState } from "react";

export function SettingsPanel() {
  const fixedCurrency = "INR";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(fixedCurrency);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/user", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setEmail(data.email ?? "");
        setName(data.name ?? "");
        setCurrency(fixedCurrency);
      }
    })();
  }, [fixedCurrency]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, currency: fixedCurrency }),
    });
    if (!res.ok) {
      setProfileMsg("Could not update profile.");
      return;
    }
    setProfileMsg("Profile saved.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPwdMsg(typeof data.error === "string" ? data.error : "Could not change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setPwdMsg("Password updated.");
  }

  return (
    <div className="max-w-xl space-y-10">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Email cannot be changed here.</p>
        <form onSubmit={saveProfile} className="mt-4 flex flex-col gap-4">
          <label className="text-sm">
            <span className="font-medium">Email</span>
            <input
              readOnly
              value={email}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Default currency (ISO code)</span>
            <input
              value={currency}
              readOnly
              maxLength={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 uppercase dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          {profileMsg ? <p className="text-sm text-zinc-600">{profileMsg}</p> : null}
          <button
            type="submit"
            className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="mt-4 flex flex-col gap-4">
          <label className="text-sm">
            <span className="font-medium">Current password</span>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          {pwdMsg ? <p className="text-sm text-zinc-600">{pwdMsg}</p> : null}
          <button
            type="submit"
            className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}
