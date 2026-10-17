import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App";
import { FeedbackProvider } from "./components/Feedback";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <FeedbackProvider>
            <App />
        </FeedbackProvider>
    </StrictMode>,
);