import { LoginForm } from '@/components/LoginForm';

export default function LoginPage({ searchParams }: { searchParams: { returnTo?: string } }) {
  const requestedReturnTo = searchParams.returnTo ?? '/';
  const returnTo = requestedReturnTo.startsWith('/') && !requestedReturnTo.startsWith('//') ? requestedReturnTo : '/';

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <div>
          <h1 className="brandTitle">Rococo Outreach</h1>
          <p className="brandSub">Internal access</p>
        </div>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}
