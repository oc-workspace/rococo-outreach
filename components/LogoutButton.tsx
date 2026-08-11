export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="button buttonSmall" type="submit">Sign out</button>
    </form>
  );
}
