import Image from "next/image";

export function AuthMarketingPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white overflow-hidden brand-gradient">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 10% 20%, #38b6ff 0%, transparent 45%), radial-gradient(circle at 90% 80%, #c96dd8 0%, transparent 40%)",
        }}
      />
      <div className="relative">
        <Image
          src="/brand/logo-dark.png"
          alt="ClickIn 360"
          width={320}
          height={80}
          className="h-16 xl:h-[4.5rem] w-auto"
          priority
        />
      </div>
      <div className="relative space-y-4 max-w-md">
        <h1 className="text-3xl xl:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">
          ClickIn 360 CRM
        </h1>
        <p className="text-white/85 text-lg leading-relaxed">
          Manage accounts, contacts, pipelines, and service tickets in one workspace
          built for your team.
        </p>
      </div>
      <p className="relative text-sm text-white/60">
        © {new Date().getFullYear()} ClickIn 360 LLC. All rights reserved.
      </p>
    </div>
  );
}
