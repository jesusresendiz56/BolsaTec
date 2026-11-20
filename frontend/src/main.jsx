import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import "./styles/theme.css";
import { themeInit } from "./services/theme";
import {
  protegerReactDeTraductor,
  traduccionInit,
} from "./services/traduccion";

themeInit();
protegerReactDeTraductor();
traduccionInit();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);