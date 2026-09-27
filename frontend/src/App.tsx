import { BrowserRouter, Route, Routes } from "react-router-dom";
import Taza from "./routes/Taza";
import Share from "./routes/Share";
import Redirect from "./routes/Redirect";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:token" element={<Taza />} />
        <Route path="/s/:shareToken" element={<Share />} />
        <Route path="*" element={<Redirect />} />
      </Routes>
    </BrowserRouter>
  );
}
