import { AppHeader } from "./components/AppHeader";

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader />
      <main id="main" className="container" style={{ paddingBlock: "var(--space-8)" }}>
        <h1>Portfolios</h1>
      </main>
    </>
  );
}

export default App;
