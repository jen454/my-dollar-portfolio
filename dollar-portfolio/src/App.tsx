import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomeDashboardPage } from "./pages/HomeDashboardPage";
import { TransactionListPage } from "./pages/TransactionListPage";
import { AddRecordPage } from "./pages/AddRecordPage";
import { useExchangeRate } from "./hooks/useExchangeRate";
import { useRecordStore } from "./store/recordStore";
import "./App.css";

function AppContent() {
  const { rate, rateBaseDate } = useExchangeRate();
  const setExchangeRate = useRecordStore((s) => s.setExchangeRate);
  const setRateBaseDate = useRecordStore((s) => s.setRateBaseDate);

  useEffect(() => {
    if (rate > 0) setExchangeRate(rate);
  }, [rate, setExchangeRate]);

  useEffect(() => {
    if (rateBaseDate) setRateBaseDate(rateBaseDate);
  }, [rateBaseDate, setRateBaseDate]);

  return (
    <Routes>
      <Route path="/" element={<HomeDashboardPage />} />
      <Route path="/transactions" element={<TransactionListPage />} />
      <Route path="/add-record" element={<AddRecordPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
