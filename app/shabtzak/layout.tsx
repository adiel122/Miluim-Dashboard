export default function ShabtzakLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div dir="rtl">{children}</div>;
}
