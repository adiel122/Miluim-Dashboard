import { RegistrationForm } from "@/components/forms/registration-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="mx-auto flex w-full max-w-5xl justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl">
          <RegistrationForm />
        </div>
      </main>
    </div>
  );
}
