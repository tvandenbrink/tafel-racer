import React from "react";
import { createRoot } from "react-dom/client";
import TafelRaceGame from "./TafelRaceGame.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <TafelRaceGame />
    </ErrorBoundary>
  );
} else {
  // Fallback to create the root container if it doesn't exist
  let rootContainer = document.getElementById("root");
  if (!rootContainer) {
    rootContainer = document.createElement('div');
    rootContainer.id = 'root';
    document.body.appendChild(rootContainer);
  }
  const root = createRoot(rootContainer);
  root.render(
    <ErrorBoundary>
      <TafelRaceGame />
    </ErrorBoundary>
  );
}
