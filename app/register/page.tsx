import { RegistrationForm } from "@/components/forms/registration-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex justify-center sm:justify-end">
          <RegistrationForm />
        </div>
      </main>
    </div>
  );
}
