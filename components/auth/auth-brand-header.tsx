import Image from "next/image";

interface AuthBrandHeaderProps {
  title: string;
  subtitle: string;
}

/** Logo + heading for auth forms (shown on mobile; desktop uses marketing panel). */
export function AuthBrandHeader({ title, subtitle }: AuthBrandHeaderProps) {
  return (
    <div className="mb-8 text-center lg:text-left">
      <div className="flex justify-center lg:justify-start mb-5">
        <Image
          src="/brand/logo-light.png"
          alt="ClickIn"
          width={200}
          height={48}
          className="h-10 w-auto dark:hidden"
          priority
        />
        <Image
          src="/brand/logo-dark.png"
          alt="ClickIn"
          width={200}
          height={48}
          className="h-10 w-auto hidden dark:block"
          priority
        />
      </div>
      <h1 className="text-2xl font-bold text-heading tracking-tight">{title}</h1>
      <p className="text-body-muted text-sm mt-1.5">{subtitle}</p>
    </div>
  );
}
