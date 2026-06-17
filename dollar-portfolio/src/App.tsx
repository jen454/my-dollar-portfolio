import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomeDashboardPage } from "./pages/HomeDashboardPage";
import { TransactionListPage } from "./pages/TransactionListPage";
import { AddRecordPage } from "./pages/AddRecordPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeDashboardPage />} />
        <Route path="/transactions" element={<TransactionListPage />} />
        <Route path="/add-record" element={<AddRecordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
